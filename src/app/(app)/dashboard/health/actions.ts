"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";

export interface SystemHealthMetrics {
  totalStudents: number;
  efrroExpiringSoon: number;
  pendingReviews: number;
  emailsSentToday: number;
  whatsAppDeliveredToday: number;
  failedNotificationsToday: number;
  queueLength: number;
  storageUsageFiles: number;
  storageUsageBytes: number;
  lastCleanupStatus: string;
  lastCleanupTime: string;
}

export async function fetchSystemHealthMetrics(): Promise<SystemHealthMetrics> {
  const supabase = getAdminSupabase();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  // Execute database counts in parallel
  const [
    studentsRes,
    expiringSoonRes,
    passportPendingRes,
    visaPendingRes,
    efrroPendingRes,
    emailsSentRes,
    whatsAppSentRes,
    failedRes,
    queueRes,
    passportCountRes,
    visaCountRes,
    efrroCountRes,
    cleanupRes
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("student_snapshot").select("student_id", { count: "exact", head: true }).eq("efrro_status", "WARNING"),
    supabase.from("passport_versions").select("id", { count: "exact", head: true }).eq("verification_status", "pending").eq("is_active", true).is("deleted_at", null),
    supabase.from("visa_versions").select("id", { count: "exact", head: true }).eq("verification_status", "pending").eq("is_active", true).is("deleted_at", null),
    supabase.from("efrro_versions").select("id", { count: "exact", head: true }).eq("verification_status", "pending").eq("is_active", true).is("deleted_at", null),
    
    // Notifications stats (Emails sent today)
    supabase.from(NOTIFICATION_TABLE_NAME).select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .eq("channel", "email")
      .gte("created_at", todayStart),
    
    // WhatsApp sent today
    supabase.from(NOTIFICATION_TABLE_NAME).select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .eq("channel", "whatsapp")
      .gte("created_at", todayStart),
    
    // Failed notifications today
    supabase.from(NOTIFICATION_TABLE_NAME).select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", todayStart),

    // Active queued size
    supabase.from(NOTIFICATION_TABLE_NAME).select("id", { count: "exact", head: true })
      .eq("status", "queued"),

    // Storage object files counts estimation
    supabase.from("passport_versions").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("visa_versions").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("efrro_versions").select("id", { count: "exact", head: true }).is("deleted_at", null),

    // Cleanup logs status
    supabase.from("retention_audit_log").select("completed_at, action, dry_run").order("completed_at", { ascending: false }).limit(1)
  ]);

  const totalStudents = studentsRes.count || 0;
  const efrroExpiringSoon = expiringSoonRes.count || 0;
  const pendingReviews = (passportPendingRes.count || 0) + (visaPendingRes.count || 0) + (efrroPendingRes.count || 0);
  const emailsSentToday = emailsSentRes.count || 0;
  const whatsAppDeliveredToday = whatsAppSentRes.count || 0;
  const failedNotificationsToday = failedRes.count || 0;
  const queueLength = queueRes.count || 0;

  const storageUsageFiles = (passportCountRes.count || 0) + (visaCountRes.count || 0) + (efrroCountRes.count || 0);
  // Estimate average document size = 450 KB (460,800 bytes) per document
  const storageUsageBytes = storageUsageFiles * 460800;

  let lastCleanupStatus = "Idle / Scheduled Daily";
  let lastCleanupTime = "No cleanups executed yet";

  if (cleanupRes.data && cleanupRes.data.length > 0) {
    const log = cleanupRes.data[0];
    lastCleanupTime = new Date(log.completed_at).toLocaleString();
    lastCleanupStatus = log.dry_run ? `Completed (Dry-Run: ${log.action})` : `Completed (Live: ${log.action})`;
  }

  return {
    totalStudents,
    efrroExpiringSoon,
    pendingReviews,
    emailsSentToday,
    whatsAppDeliveredToday,
    failedNotificationsToday,
    queueLength,
    storageUsageFiles,
    storageUsageBytes,
    lastCleanupStatus,
    lastCleanupTime
  };
}
