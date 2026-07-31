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
              
              // Log to delivery logs or audit log
              await supabase.from('notification_delivery_log').insert({
                notification_id: status.id, // Using the WA Message ID as a reference point
                attempt_number: 1,
                status: status.status, // delivered, read, failed
                gateway_response: status,
                provider_name: 'meta-whatsapp',
                correlation_id: status.id,
              });
            }
          }

          // Handle Incoming Messages
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              console.log(`[META_WEBHOOK] Incoming message from: ${message.from}`);
              
              // Log incoming message to the audit log structure
              await supabase.from('notification_delivery_log').insert({
                notification_id: message.id, // Generate pseudo-ref for incoming
                attempt_number: 1,
                status: 'incoming_message',
                gateway_response: message,
                provider_name: 'meta-whatsapp',
                correlation_id: message.id,
              });
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
    // Still return 200 to prevent Meta from retrying indefinitely on parsing errors, 
    // unless it's a transient server issue.
    return NextResponse.json({ error: 'Internal server error' }, { status: 200 });
  }
}
