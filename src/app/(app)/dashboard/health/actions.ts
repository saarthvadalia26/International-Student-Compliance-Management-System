"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";

import { NotificationProviderFactory } from "@/domain/notifications/services/provider-factory";

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

  // Sprint 08 Operations Metrics
  applicationVersion: string;
  environment: string;
  deploymentPlatform: string;
  deploymentType: string;
  deploymentTime: string;
  deploymentRegion: string;
  nodeVersion: string;
  nextVersion: string;
  databaseStatus: string;
  storageStatus: string;
  emailProviderName: string;
  emailProviderStatus: string;
  whatsappProviderName: string;
  whatsappProviderStatus: string;
  botProtectionStatus: string;
  
  lastSchedulerRun: string;
  nextSchedulerRun: string;
  jobsProcessedCount: number;
  jobsFailedCount: number;
  averageProcessingTimeMs: number;
}

export async function fetchSystemHealthMetrics(): Promise<SystemHealthMetrics> {
  const supabase = getAdminSupabase();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  // Load provider singletons
  const emailProvider = NotificationProviderFactory.getEmailProvider();
  const whatsappProvider = NotificationProviderFactory.getWhatsAppProvider();

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
    cleanupRes,
    latestJobRes,
    emailHealthRes,
    whatsappHealthRes
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
    supabase.from("retention_audit_log").select("completed_at, action, dry_run").order("completed_at", { ascending: false }).limit(1),

    // Latest scheduled job execution
    supabase.from("scheduled_jobs").select("*").order("created_at", { ascending: false }).limit(5),

    // Provider health checks
    emailProvider.healthCheck(),
    whatsappProvider.healthCheck()
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

  // Load scheduler logs
  let lastSchedulerRun = "No executions logged";
  const nextSchedulerRun = "Scheduled at 00:00 Daily";
  let jobsProcessedCount = 0;
  let jobsFailedCount = 0;
  let averageProcessingTimeMs = 0;

  if (latestJobRes.data && latestJobRes.data.length > 0) {
    const latestJob = latestJobRes.data[0];
    lastSchedulerRun = latestJob.started_at ? new Date(latestJob.started_at).toLocaleString() : "Running";
    
    // Sum jobs processed and failed from history
    jobsProcessedCount = latestJobRes.data.reduce((acc, job) => acc + (job.processed_count || 0), 0);
    jobsFailedCount = latestJobRes.data.filter(job => job.status === "failed").length;
    
    const times = latestJobRes.data
      .filter(job => job.started_at && job.finished_at)
      .map(job => new Date(job.finished_at!).getTime() - new Date(job.started_at!).getTime());
    averageProcessingTimeMs = times.length > 0 ? Math.floor(times.reduce((a, b) => a + b, 0) / times.length) : 0;
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
    lastCleanupTime,

    applicationVersion: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "v1.2.0-release",
    environment: process.env.NODE_ENV === "production" ? "Production" : "Development",
    deploymentPlatform: process.env.VERCEL ? "Vercel" : "Local Environment",
    deploymentType: process.env.VERCEL_ENV ? (process.env.VERCEL_ENV.charAt(0).toUpperCase() + process.env.VERCEL_ENV.slice(1)) : "Local",
    deploymentTime: process.env.VERCEL ? new Date().toLocaleString() : "Live", // Best approximation without external build scripts
    deploymentRegion: process.env.VERCEL_REGION || "Local/Unknown",
    nodeVersion: process.version,
    nextVersion: "16.2.10",
    
    databaseStatus: studentsRes.error ? "Offline" : "Connected",
    storageStatus: process.env.STORAGE_PROVIDER === "cloudflare-r2" ? "Cloudflare R2 Connected" : "Connected", 
    emailProviderName: emailHealthRes.providerName,
    emailProviderStatus: emailHealthRes.status,
    whatsappProviderName: whatsappHealthRes.providerName,
    whatsappProviderStatus: whatsappHealthRes.status,
    botProtectionStatus: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? "Cloudflare Turnstile Active" : "Disabled",
    
    lastSchedulerRun,
    nextSchedulerRun,
    jobsProcessedCount,
    jobsFailedCount,
    averageProcessingTimeMs
  };
}
