import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { CloudflareR2StorageProvider } from '@/domain/storage/providers/cloudflare-r2-storage.provider';
import { randomUUID } from 'crypto';

export const maxDuration = 300; // 5 minutes max duration for cron
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Verify cron authorization
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check if automatic deletion is enabled
  if (process.env.ENABLE_AUTOMATIC_DOCUMENT_DELETION !== 'true') {
    return NextResponse.json({ status: 'skipped', reason: 'ENABLE_AUTOMATIC_DOCUMENT_DELETION is not true' });
  }

  const supabase = getAdminSupabase();
  const storageProvider = new CloudflareR2StorageProvider();
  const correlationId = randomUUID();
  const retentionDays = parseInt(process.env.DOCUMENT_RETENTION_DAYS || '30', 10);
  
  // Calculate the cutoff date for APPROVED_PENDING_RETENTION
  const retentionCutoff = new Date();
  retentionCutoff.setDate(retentionCutoff.getDate() - retentionDays);
  const cutoffIso = retentionCutoff.toISOString();

  let processedCount = 0;
  let failedCount = 0;

  console.log(`[CRON] Starting retention cleanup job ${correlationId}. Cutoff date for retention: ${cutoffIso}`);

  const tables = ['passport_versions', 'visa_versions', 'efrro_versions'];

  for (const table of tables) {
    const documentType = table.split('_')[0]; // passport, visa, efrro

    // Fetch records eligible for deletion
    // 1. REJECTED_PENDING_DELETE (immediate)
    // 2. APPROVED_PENDING_RETENTION (older than cutoff)
    const { data: eligibleRecords, error } = await supabase
      .from(table)
      .select('id, student_id, storage_object_key, storage_status, updated_at')
      .or(`storage_status.eq.REJECTED_PENDING_DELETE,and(storage_status.eq.APPROVED_PENDING_RETENTION,updated_at.lt.${cutoffIso})`);

    if (error) {
      console.error(`[CRON] Failed to query ${table}:`, error.message);
      continue;
    }

    if (!eligibleRecords || eligibleRecords.length === 0) continue;

    console.log(`[CRON] Found ${eligibleRecords.length} eligible records in ${table}`);

    for (const record of eligibleRecords) {
      if (!record.storage_object_key) {
        // Edge case: No file path exists, just mark as deleted
        await supabase.from(table).update({ storage_status: 'DELETED', deleted_at: new Date().toISOString() }).eq('id', record.id);
        continue;
      }

      try {
        // Physical deletion
        const success = await storageProvider.delete('iscms-documents', record.storage_object_key);
        
        if (success) {
          // Update DB
          await supabase.from(table).update({
            storage_status: 'DELETED',
            deleted_at: new Date().toISOString(),
            deleted_by_system: true,
            deletion_reason: record.storage_status === 'REJECTED_PENDING_DELETE' ? 'Rejected Cleanup' : 'Retention Expiry'
          }).eq('id', record.id);

          // Log audit
          await supabase.from('document_lifecycle_audit_log').insert({
            student_id: record.student_id,
            document_id: record.id,
            document_type: documentType,
            action: 'Deletion',
            operator_system: 'CRON_SCHEDULER',
            correlation_id: correlationId,
            details: { storage_object_key: record.storage_object_key, previous_status: record.storage_status }
          });
          
          processedCount++;
        } else {
          throw new Error('Storage provider returned false for delete operation');
        }
      } catch (error: unknown) {
        const err = error as Error;
        failedCount++;
        console.error(`[CRON] Failed to delete file for record ${record.id}:`, err.message);
        
        // Log failure
        await supabase.from('document_lifecycle_audit_log').insert({
          student_id: record.student_id,
          document_id: record.id,
          document_type: documentType,
          action: 'Cleanup failure',
          operator_system: 'CRON_SCHEDULER',
          correlation_id: correlationId,
          details: { storage_object_key: record.storage_object_key, error: err.message }
        });
      }
    }
  }

  console.log(`[CRON] Job ${correlationId} completed. Processed: ${processedCount}, Failed: ${failedCount}`);

  return NextResponse.json({
    status: 'success',
    correlationId,
    processedCount,
    failedCount
  });
}
