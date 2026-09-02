"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator } from "@/lib/auth/permissions";
import { NOTIFICATION_TABLE_NAME } from "@/domain/notifications/config";
import { SystemDiagnosticsService } from "@/domain/system/services/system-diagnostics.service";
import { SystemInfrastructureDiagnostics } from "@/domain/system/types/diagnostics.types";
import { formatDateTime } from "@/lib/utils/date";

export interface SystemHealthMetrics {
  totalStudents: number;
  efrroExpiringSoon: number;
  pendingReviews: number;
  emailsSentToday: number;
  whatsAppDeliveredToday: number;
  failedNotificationsToday: number;
  queueLength: number;

  // Real production infrastructure diagnostics
  diagnostics: SystemInfrastructureDiagnostics;

  // Legacy field compatibility
  applicationVersion: string;
  environment: string;
  deploymentPlatform: string;
  deploymentType: string;
  deploymentTime: string;
  deploymentRegion: string;
  nodeVersion: string;
  nextVersion: string;
  databaseStatus: string;
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

/**
 * Server action to fetch real live production diagnostics for client refresh
 */
export async function fetchSystemDiagnosticsAction(forceRefresh: boolean = false): Promise<SystemInfrastructureDiagnostics> {
  const serverSupabase = await getServerSupabase();
  const { data: { user } } = await serverSupabase.auth.getUser();
  requireAdministrator(user);

  return SystemDiagnosticsService.getDiagnostics(forceRefresh);
}

export async function fetchSystemHealthMetrics(): Promise<SystemHealthMetrics> {
  // Backend authorization — Administrator only
  const serverSupabase = await getServerSupabase();
  const { data: { user } } = await serverSupabase.auth.getUser();
  requireAdministrator(user);

  const supabase = getAdminSupabase();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  // Execute database counts and real infrastructure diagnostics in parallel
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
    latestJobRes,
    diagnostics
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

    // Latest scheduled job execution
    supabase.from("scheduled_jobs").select("*").order("created_at", { ascending: false }).limit(5),

    // Live production diagnostics
    SystemDiagnosticsService.getDiagnostics()
  ]);

  const totalStudents = studentsRes.count || 0;
  const efrroExpiringSoon = expiringSoonRes.count || 0;
  const pendingReviews = (passportPendingRes.count || 0) + (visaPendingRes.count || 0) + (efrroPendingRes.count || 0);
  const emailsSentToday = emailsSentRes.count || 0;
  const whatsAppDeliveredToday = whatsAppSentRes.count || 0;
  const failedNotificationsToday = failedRes.count || 0;
  const queueLength = queueRes.count || 0;

  // Load scheduler logs
  let lastSchedulerRun = "No executions logged";
  const nextSchedulerRun = "Scheduled at 00:00 Daily";
  let jobsProcessedCount = 0;
  let jobsFailedCount = 0;
  let averageProcessingTimeMs = 0;

  if (latestJobRes.data && latestJobRes.data.length > 0) {
    const latestJob = latestJobRes.data[0];
    lastSchedulerRun = latestJob.started_at ? formatDateTime(latestJob.started_at) : "Running";
    
    // Sum jobs processed and failed from history
    jobsProcessedCount = latestJobRes.data.reduce((acc, job) => acc + (job.processed_count || 0), 0);
    jobsFailedCount = latestJobRes.data.filter(job => job.status === "failed").length;
    
    const times = latestJobRes.data
      .filter(job => job.started_at && job.finished_at)
      .map(job => new Date(job.finished_at!).getTime() - new Date(job.started_at!).getTime());
    averageProcessingTimeMs = times.length > 0 ? Math.floor(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  }

  const isDbConnected = diagnostics.services.database.status === "connected" || diagnostics.services.database.status === "healthy";

  return {
    totalStudents,
    efrroExpiringSoon,
    pendingReviews,
    emailsSentToday,
    whatsAppDeliveredToday,
    failedNotificationsToday,
    queueLength,

    diagnostics,

    // Real values mapped to legacy fields
    applicationVersion: diagnostics.runtime.appVersion,
    environment: diagnostics.runtime.environment,
    deploymentPlatform: diagnostics.runtime.platform,
    deploymentType: diagnostics.runtime.environment,
    deploymentTime: diagnostics.deployment.deployedAt 
      ? formatDateTime(diagnostics.deployment.deployedAt) 
      : "Local / Development",
    deploymentRegion: diagnostics.runtime.region,
    nodeVersion: diagnostics.runtime.nodeVersion,
    nextVersion: diagnostics.runtime.nextVersion,
    
    databaseStatus: isDbConnected ? "Connected" : diagnostics.services.database.status === "not_configured" ? "Not configured" : "Unhealthy",
    emailProviderName: diagnostics.services.email.providerName,
    emailProviderStatus: diagnostics.services.email.status,
    whatsappProviderName: diagnostics.services.whatsapp.providerName,
    whatsappProviderStatus: diagnostics.services.whatsapp.status,
    botProtectionStatus: diagnostics.services.botProtection?.status === "configured" 
      ? "Cloudflare Turnstile Active" 
      : "Not configured",
    
    lastSchedulerRun,
    nextSchedulerRun,
    jobsProcessedCount,
    jobsFailedCount,
    averageProcessingTimeMs
  };
}
