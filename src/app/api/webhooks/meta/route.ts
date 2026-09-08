import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminSupabase } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[META_WEBHOOK] Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[META_WEBHOOK] Webhook verification failed', { mode, token });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error('[META_WEBHOOK] META_APP_SECRET is not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Verify signature
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')}`;

    // Use timingSafeEqual to prevent timing attacks. But first ensure both are same length
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      console.warn('[META_WEBHOOK] Invalid signature detected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid object type' }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          const value = change.value;
          
          // Handle Status Updates
          if (value.statuses && value.statuses.length > 0) {
            for (const status of value.statuses) {
              console.log(`[META_WEBHOOK] Status update: ${status.id} -> ${status.status}`);
              
              // Safe lookup by external provider message ID (wamid.* stored in JSONB gateway_response)
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(status.id);
              let lookupQuery = supabase
                .from('notification_delivery_log')
                .select('id, notification_id, attempt_number, status');

              if (isUuid) {
                lookupQuery = lookupQuery.or(`correlation_id.eq.${status.id},gateway_response->>gateway_id.eq.${status.id}`);
              } else {
                lookupQuery = lookupQuery.filter('gateway_response->>gateway_id', 'eq', status.id);
              }

              const { data: existingLog, error: lookupErr } = await lookupQuery
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (lookupErr) {
                console.error('[META_WEBHOOK] Lookup error:', lookupErr.message);
                throw new Error(`Database lookup failure: ${lookupErr.message}`);
              }

              if (existingLog?.notification_id) {
                // Idempotency: Skip duplicate delivery log if this exact status is already recorded
                if (existingLog.status === status.status) {
                  console.log(`[META_WEBHOOK] Duplicate status '${status.status}' for ${status.id} ignored.`);
                  continue;
                }

                const nextStatus = status.status === 'delivered' ? 'delivered' : status.status === 'failed' ? 'failed' : undefined;
                if (nextStatus) {
                  const { error: notifUpdateErr } = await supabase
                    .from('notifications')
                    .update({ status: nextStatus, updated_at: new Date().toISOString() })
                    .eq('id', existingLog.notification_id);

                  if (notifUpdateErr) {
                    console.error('[META_WEBHOOK] Notification status update error:', notifUpdateErr.message);
                  }
                }

                // External wamid.* is stored in JSONB gateway_response, never in UUID correlation_id
                const { error: insertErr } = await supabase.from('notification_delivery_log').insert({
                  notification_id: existingLog.notification_id,
                  attempt_number: (existingLog.attempt_number || 1) + 1,
                  status: status.status,
                  gateway_response: { gateway_id: status.id, ...status },
                  provider_name: 'meta-whatsapp'
                });

                if (insertErr) {
                  console.error('[META_WEBHOOK] Failed to record delivery log:', insertErr.message);
                  throw new Error(`Failed to record delivery log: ${insertErr.message}`);
                }
              } else {
                // Record unmatched status update safely in audit_log without foreign key violation
                const { data: duplicateAudit } = await supabase
                  .from('audit_log')
                  .select('id')
                  .eq('action', 'WHATSAPP_WEBHOOK_STATUS')
                  .contains('filters_applied', { statusId: status.id, status: status.status })
                  .limit(1)
                  .maybeSingle();

                if (!duplicateAudit) {
                  const { error: auditErr } = await supabase.from('audit_log').insert({
                    action: 'WHATSAPP_WEBHOOK_STATUS',
                    resource: 'webhooks/meta',
                    filters_applied: { statusId: status.id, status: status.status, gatewayResponse: status }
                  });

                  if (auditErr) {
                    console.error('[META_WEBHOOK] Failed to log unmatched webhook status:', auditErr.message);
                  }
                }
              }
            }
          }

          // Handle Incoming Messages (Inbound events logged safely to audit trail)
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              console.log(`[META_WEBHOOK] Incoming message from: ${message.from}`);
              
              const { data: duplicateMsg } = await supabase
                .from('audit_log')
                .select('id')
                .eq('action', 'WHATSAPP_INCOMING_MESSAGE')
                .contains('filters_applied', { messageId: message.id })
                .limit(1)
                .maybeSingle();

              if (!duplicateMsg) {
                const { error: inMsgErr } = await supabase.from('audit_log').insert({
                  action: 'WHATSAPP_INCOMING_MESSAGE',
                  resource: `whatsapp/${message.from}`,
                  filters_applied: { messageId: message.id, from: message.from, text: message.text?.body || null }
                });

                if (inMsgErr) {
                  console.error('[META_WEBHOOK] Failed to record incoming message audit:', inMsgErr.message);
                }
              }
            }
          }
        }
      }
    }

    // Meta expects a 200 OK response to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[META_WEBHOOK] Error processing webhook:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
