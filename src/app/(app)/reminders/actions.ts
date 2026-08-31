"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { TemplateValidator } from "@/domain/notifications/validators/template.validator";

export interface ReminderRuleDto {
  id: string;
  documentType: "passport" | "visa" | "efrro";
  alertThresholdDays: number;
  channel: "email" | "whatsapp" | "both";
  isActive: boolean;
  ruleName: string;
  templateId: string | null;
  templateTitle?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationTemplateDto {
  id: string;
  code: string;
  languageCode: string;
  version: number;
  isActive: boolean;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  title: string;
  documentType: "passport" | "visa" | "efrro" | "general" | "all";
  eventType: "document_expiry" | "portal_otp" | "replacement_approved" | "replacement_rejected" | "document_verified" | "document_rejected" | "general_alert";
  channel: "email" | "whatsapp" | "both" | "sms";
  category: "utility" | "authentication" | "marketing" | "alert";
  providerTemplateName?: string | null;
  providerTemplateId?: string | null;
  subjectTemplate: string;
  bodyTemplate: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateAuditLogDto {
  id: string;
  templateId: string;
  action: "CREATED" | "UPDATED" | "DUPLICATED" | "ACTIVATED" | "DEACTIVATED" | "ARCHIVED";
  actorId: string | null;
  actorEmail: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  createdAt: string;
}

export interface CommunicationLogItem {
  id: string;
  recipient: string;
  documentType: "passport" | "visa" | "efrro";
  channel: string;
  status: "queued" | "sending" | "processing" | "sent" | "failed" | "cancelled";
  retryCount: number;
  triggerSource: string;
  scheduledFor: string;
  createdAt: string;
  notificationContext: Record<string, unknown>;
  errorMessage: string | null;
  gatewayResponse: Record<string, unknown> | null;
}

export interface ReminderSummaryMetrics {
  passport: { total: number; upcoming: number; overdue: number };
  visa: { total: number; upcoming: number; overdue: number };
  efrro: { total: number; upcoming: number; overdue: number };
  system: {
    totalNotifications: number;
    queuedCount: number;
    sentCount: number;
    failedCount: number;
    successRate: number;
    activeRulesCount: number;
  };
}

import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator } from "@/lib/auth/permissions";

async function getAdminUser() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    if (process.env.NODE_ENV === "development") {
      return { id: "dev-admin", email: "admin@iscms.internal" };
    }
    throw new Error("Unauthorized: Please log in as an Administrator.");
  }
  requireAdministrator(user);
  return user;
}

/**
 * Fetch all reminder threshold rules with optional document_type filter
 */
export async function fetchReminderRules(docType?: string): Promise<ReminderRuleDto[]> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();
    let query = supabase
      .from("reminder_rules")
      .select(`
        id,
        document_type,
        alert_threshold_days,
        channel,
        is_active,
        rule_name,
        template_id,
        created_at,
        updated_at,
        notification_templates(id, title)
      `)
      .order("document_type", { ascending: true })
      .order("alert_threshold_days", { ascending: false });

    if (docType && docType !== "all") {
      query = query.eq("document_type", docType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[FETCH_REMINDER_RULES_ERROR]", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      documentType: row.document_type,
      alertThresholdDays: row.alert_threshold_days,
      channel: row.channel,
      isActive: row.is_active,
      ruleName: row.rule_name || `${row.document_type.toUpperCase()} ${row.alert_threshold_days}-Day Reminder`,
      templateId: row.template_id,
      templateTitle: row.notification_templates?.title || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.error("[FETCH_REMINDER_RULES_EXCEPTION]", err);
    return [];
  }
}

/**
 * Create or Update a Reminder Rule
 */
export async function saveReminderRule(payload: {
  id?: string;
  documentType: "passport" | "visa" | "efrro";
  alertThresholdDays: number;
  channel: "email" | "whatsapp" | "both";
  isActive: boolean;
  ruleName?: string;
  templateId?: string | null;
}): Promise<{ success: boolean; rule?: ReminderRuleDto; error?: string }> {
  try {
    await getAdminUser();
    if (payload.channel === "email" || payload.channel === "both") {
      return { success: false, error: "Email notification channel is currently disabled. Please select WhatsApp." };
    }

    const supabase = getAdminSupabase();
    const isNew = !payload.id || payload.id.startsWith("temp-") || payload.id.startsWith("r-");

    const record = {
      document_type: payload.documentType,
      alert_threshold_days: payload.alertThresholdDays,
      channel: payload.channel,
      is_active: payload.isActive,
      rule_name: payload.ruleName || `${payload.documentType.toUpperCase()} ${payload.alertThresholdDays}-Day Reminder`,
      template_id: payload.templateId || null,
      updated_at: new Date().toISOString()
    };

    if (isNew) {
      const { data, error } = await supabase
        .from("reminder_rules")
        .insert(record)
        .select("*")
        .single();

      if (error) throw error;
      revalidatePath("/reminders");
      return { success: true, rule: data as ReminderRuleDto };
    } else {
      const { data, error } = await supabase
        .from("reminder_rules")
        .update(record)
        .eq("id", payload.id)
        .select("*")
        .single();

      if (error) throw error;
      revalidatePath("/reminders");
      return { success: true, rule: data as ReminderRuleDto };
    }
  } catch (err: any) {
    console.error("[SAVE_REMINDER_RULE_ERROR]", err);
    return { success: false, error: err.message || "Failed to save reminder rule" };
  }
}

/**
 * Toggle Reminder Rule active state
 */
export async function toggleReminderRule(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("reminder_rules")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/reminders");
    return { success: true };
  } catch (err: any) {
    console.error("[TOGGLE_REMINDER_RULE_ERROR]", err);
    return { success: false, error: err.message || "Failed to update reminder rule" };
  }
}

/**
 * Delete a Reminder Rule
 */
export async function deleteReminderRule(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("reminder_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/reminders");
    return { success: true };
  } catch (err: any) {
    console.error("[DELETE_REMINDER_RULE_ERROR]", err);
    return { success: false, error: err.message || "Failed to delete reminder rule" };
  }
}

/**
 * Fetch all notification templates with full multi-dimensional filtering and search
 */
export async function fetchNotificationTemplates(filters?: {
  searchQuery?: string;
  documentType?: string;
  channel?: string;
  category?: string;
  status?: string;
  eventType?: string;
}): Promise<NotificationTemplateDto[]> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();
    let query = supabase
      .from("notification_templates")
      .select("*")
      .order("document_type", { ascending: true })
      .order("code", { ascending: true })
      .order("language_code", { ascending: true });

    if (filters?.documentType && filters.documentType !== "all") {
      query = query.or(`document_type.eq.${filters.documentType},document_type.eq.all`);
    }

    if (filters?.channel && filters.channel !== "all") {
      query = query.or(`channel.eq.${filters.channel},channel.eq.both`);
    }

    if (filters?.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }

    if (filters?.eventType && filters.eventType !== "all") {
      query = query.eq("event_type", filters.eventType);
    }

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status.toUpperCase());
    } else {
      // Exclude archived by default unless explicitly requested
      query = query.neq("status", "ARCHIVED");
    }

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = `%${filters.searchQuery.trim()}%`;
      query = query.or(`title.ilike.${q},code.ilike.${q},event_type.ilike.${q}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[FETCH_TEMPLATES_ERROR]", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      languageCode: row.language_code,
      version: row.version,
      isActive: row.status === "ACTIVE" || (row.is_active && row.status !== "INACTIVE" && row.status !== "DRAFT"),
      status: (row.status as any) || (row.is_active ? "ACTIVE" : "INACTIVE"),
      title: row.title,
      documentType: row.document_type || "all",
      eventType: row.event_type || "document_expiry",
      channel: row.channel || "both",
      category: row.category || "utility",
      providerTemplateName: row.provider_template_name || null,
      providerTemplateId: row.provider_template_id || null,
      subjectTemplate: row.subject_template || "",
      bodyTemplate: row.body_template || "",
      createdBy: row.created_by || null,
      updatedBy: row.updated_by || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.error("[FETCH_TEMPLATES_EXCEPTION]", err);
    return [];
  }
}

/**
 * Save / Create Notification Template with strict server-side validation and audit logging
 */
export async function saveNotificationTemplate(payload: {
  id?: string;
  code: string;
  languageCode: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  title: string;
  documentType: "passport" | "visa" | "efrro" | "general" | "all";
  eventType: "document_expiry" | "portal_otp" | "replacement_approved" | "replacement_rejected" | "document_verified" | "document_rejected" | "general_alert";
  channel: "email" | "whatsapp" | "both" | "sms";
  category: "utility" | "authentication" | "marketing" | "alert";
  providerTemplateName?: string | null;
  subjectTemplate: string;
  bodyTemplate: string;
  actorEmail?: string;
}): Promise<{ success: boolean; template?: NotificationTemplateDto; error?: string }> {
  try {
    await getAdminUser();
    // 1. Strict Business Validation
    const validation = TemplateValidator.validateTemplate({
      title: payload.title,
      code: payload.code,
      eventType: payload.eventType,
      documentType: payload.documentType,
      channel: payload.channel,
      category: payload.category,
      status: payload.status,
      subjectTemplate: payload.subjectTemplate,
      bodyTemplate: payload.bodyTemplate,
      languageCode: payload.languageCode
    });

    if (!validation.isValid) {
      return { success: false, error: validation.errors[0] };
    }

    const supabase = getAdminSupabase();
    const isNew = !payload.id || payload.id.startsWith("temp-") || payload.id.startsWith("t-");
    const isActive = payload.status === "ACTIVE";

    let beforeState: Record<string, unknown> | null = null;

    if (!isNew && payload.id) {
      const { data: existing } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("id", payload.id)
        .single();
      beforeState = existing || null;
    }

    const record = {
      code: payload.code.trim().toUpperCase(),
      language_code: payload.languageCode.trim().toLowerCase(),
      version: payload.version || 1,
      is_active: isActive,
      status: payload.status,
      title: payload.title.trim(),
      document_type: payload.documentType,
      event_type: payload.eventType,
      channel: payload.channel,
      category: payload.category,
      provider_template_name: payload.providerTemplateName?.trim() || null,
      subject_template: payload.subjectTemplate.trim() || null,
      body_template: payload.bodyTemplate.trim(),
      updated_by: payload.actorEmail || "compliance_staff",
      updated_at: new Date().toISOString()
    };

    let resultTemplate: NotificationTemplateDto;

    if (isNew) {
      const { data, error } = await supabase
        .from("notification_templates")
        .insert({
          ...record,
          created_by: payload.actorEmail || "compliance_staff"
        })
        .select("*")
        .single();

      if (error) throw error;
      resultTemplate = data as any;

      // Log audit
      await supabase.from("notification_template_audit_log").insert({
        template_id: data.id,
        action: "CREATED",
        actor_email: payload.actorEmail || "compliance_staff",
        after_state: data
      });
    } else {
      const { data, error } = await supabase
        .from("notification_templates")
        .update(record)
        .eq("id", payload.id)
        .select("*")
        .single();

      if (error) throw error;
      resultTemplate = data as any;

      // Log audit
      await supabase.from("notification_template_audit_log").insert({
        template_id: data.id,
        action: "UPDATED",
        actor_email: payload.actorEmail || "compliance_staff",
        before_state: beforeState,
        after_state: data
      });
    }

    revalidatePath("/reminders");
    return { success: true, template: resultTemplate };
  } catch (err: any) {
    console.error("[SAVE_NOTIFICATION_TEMPLATE_ERROR]", err);
    return { success: false, error: err.message || "Failed to save template" };
  }
}

/**
 * Duplicate a Notification Template (creates a DRAFT copy)
 */
export async function duplicateNotificationTemplate(
  sourceId: string, 
  actorEmail?: string
): Promise<{ success: boolean; template?: NotificationTemplateDto; error?: string }> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();

    const { data: source, error: sErr } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sErr || !source) {
      return { success: false, error: "Source template not found." };
    }

    const newCode = `${source.code}_COPY_${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const newTitle = `${source.title} (Draft Copy)`;

    const duplicateRecord = {
      code: newCode,
      language_code: source.language_code,
      version: 1,
      is_active: false,
      status: "DRAFT",
      title: newTitle,
      document_type: source.document_type,
      event_type: source.event_type,
      channel: source.channel,
      category: source.category,
      provider_template_name: null,
      subject_template: source.subject_template,
      body_template: source.body_template,
      created_by: actorEmail || "compliance_staff",
      updated_by: actorEmail || "compliance_staff"
    };

    const { data: created, error: cErr } = await supabase
      .from("notification_templates")
      .insert(duplicateRecord)
      .select("*")
      .single();

    if (cErr) throw cErr;

    // Log audit
    await supabase.from("notification_template_audit_log").insert({
      template_id: created.id,
      action: "DUPLICATED",
      actor_email: actorEmail || "compliance_staff",
      before_state: { source_template_id: sourceId, source_code: source.code },
      after_state: created
    });

    revalidatePath("/reminders");
    return { success: true, template: created as any };
  } catch (err: any) {
    console.error("[DUPLICATE_NOTIFICATION_TEMPLATE_ERROR]", err);
    return { success: false, error: err.message || "Failed to duplicate template" };
  }
}

/**
 * Toggle template lifecycle status (ACTIVE, INACTIVE, DRAFT, ARCHIVED)
 */
export async function toggleNotificationTemplateStatus(
  id: string, 
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED",
  actorEmail?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();
    const isActive = status === "ACTIVE";

    const { data: before } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("id", id)
      .single();

    const { data: updated, error } = await supabase
      .from("notification_templates")
      .update({
        status,
        is_active: isActive,
        updated_by: actorEmail || "compliance_staff",
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    const actionMap: Record<string, "ACTIVATED" | "DEACTIVATED" | "ARCHIVED" | "UPDATED"> = {
      ACTIVE: "ACTIVATED",
      INACTIVE: "DEACTIVATED",
      ARCHIVED: "ARCHIVED",
      DRAFT: "UPDATED"
    };

    await supabase.from("notification_template_audit_log").insert({
      template_id: id,
      action: actionMap[status] || "UPDATED",
      actor_email: actorEmail || "compliance_staff",
      before_state: before || null,
      after_state: updated
    });

    revalidatePath("/reminders");
    return { success: true };
  } catch (err: any) {
    console.error("[TOGGLE_TEMPLATE_STATUS_ERROR]", err);
    return { success: false, error: err.message || "Failed to update template status" };
  }
}

/**
 * Safe Delete / Archival Policy:
 * If template has historical notifications or is referenced by reminder rules, archives it safely instead of hard deleting.
 */
export async function deleteNotificationTemplate(id: string, actorEmail?: string): Promise<{ success: boolean; archived?: boolean; error?: string }> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();

    // Check if referenced in notifications
    const { count: notifCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("template_id", id);

    // Check if referenced in active reminder rules
    const { count: rulesCount } = await supabase
      .from("reminder_rules")
      .select("id", { count: "exact", head: true })
      .eq("template_id", id);

    const hasReferences = (notifCount || 0) > 0 || (rulesCount || 0) > 0;

    if (hasReferences) {
      // Safe Archival
      const { data: before } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("id", id)
        .single();

      await supabase
        .from("notification_templates")
        .update({
          status: "ARCHIVED",
          is_active: false,
          updated_by: actorEmail || "compliance_staff",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      await supabase.from("notification_template_audit_log").insert({
        template_id: id,
        action: "ARCHIVED",
        actor_email: actorEmail || "compliance_staff",
        before_state: before || null,
        after_state: { status: "ARCHIVED", is_active: false, reason: "Referenced by historical notifications or active rules" }
      });

      revalidatePath("/reminders");
      return { success: true, archived: true };
    }

    // No historical references -> safe hard delete
    const { error } = await supabase
      .from("notification_templates")
      .delete()
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/reminders");
    return { success: true, archived: false };
  } catch (err: any) {
    console.error("[DELETE_NOTIFICATION_TEMPLATE_ERROR]", err);
    return { success: false, error: err.message || "Failed to delete template" };
  }
}

/**
 * Fetch chronological audit logs for a template
 */
export async function fetchTemplateAuditLogs(templateId: string): Promise<TemplateAuditLogDto[]> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("notification_template_audit_log")
      .select("*")
      .eq("template_id", templateId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[FETCH_TEMPLATE_AUDIT_LOGS_ERROR]", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      templateId: row.template_id,
      action: row.action,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      beforeState: row.before_state,
      afterState: row.after_state,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error("[FETCH_TEMPLATE_AUDIT_LOGS_EXCEPTION]", err);
    return [];
  }
}

/**
 * Fetch Communication Queue Logs with delivery details
 */
export async function fetchCommunicationLogs(filters?: {
  documentType?: string;
  channel?: string;
  status?: string;
  limit?: number;
}): Promise<CommunicationLogItem[]> {
  try {
    await getAdminUser();
    const supabase = getAdminSupabase();
    let query = supabase
      .from("notifications")
      .select(`
        id,
        recipient_address,
        document_type,
        channel,
        status,
        retry_count,
        trigger_source,
        scheduled_for,
        created_at,
        notification_context,
        notification_delivery_log(error_message, gateway_response)
      `)
      .order("created_at", { ascending: false })
      .limit(filters?.limit || 50);

    if (filters?.documentType && filters.documentType !== "all") {
      query = query.eq("document_type", filters.documentType);
    }

    if (filters?.channel && filters.channel !== "all") {
      query = query.eq("channel", filters.channel);
    }

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[FETCH_COMMUNICATION_LOGS_ERROR]", error.message);
      return [];
    }

    return (data || []).map((row: any) => {
      const logs = row.notification_delivery_log || [];
      const latestLog = logs[logs.length - 1];

      return {
        id: row.id,
        recipient: row.recipient_address,
        documentType: row.document_type,
        channel: row.channel,
        status: row.status,
        retryCount: row.retry_count || 0,
        triggerSource: row.trigger_source || "reminder_engine",
        scheduledFor: row.scheduled_for,
        createdAt: row.created_at,
        notificationContext: row.notification_context || {},
        errorMessage: latestLog?.error_message || null,
        gatewayResponse: latestLog?.gateway_response || null
      };
    });
  } catch (err) {
    console.error("[FETCH_COMMUNICATION_LOGS_EXCEPTION]", err);
    return [];
  }
}

/**
 * Fetch overview summary metrics for Passport, Visa, and eFRRO
 */
export async function fetchReminderSummary(): Promise<ReminderSummaryMetrics> {
  await getAdminUser();
  const fallback: ReminderSummaryMetrics = {
    passport: { total: 0, upcoming: 0, overdue: 0 },
    visa: { total: 0, upcoming: 0, overdue: 0 },
    efrro: { total: 0, upcoming: 0, overdue: 0 },
    system: {
      totalNotifications: 0,
      queuedCount: 0,
      sentCount: 0,
      failedCount: 0,
      successRate: 100,
      activeRulesCount: 0
    }
  };

  try {
    const supabase = getAdminSupabase();

    // 1. Fetch student snapshot data
    const { data: snapshots } = await supabase
      .from("student_snapshot")
      .select("passport_expiry, visa_expiry, efrro_expiry");

    const today = new Date().toISOString().split("T")[0];
    const todayMs = new Date(today).getTime();

    const summary: ReminderSummaryMetrics = {
      passport: { total: 0, upcoming: 0, overdue: 0 },
      visa: { total: 0, upcoming: 0, overdue: 0 },
      efrro: { total: 0, upcoming: 0, overdue: 0 },
      system: {
        totalNotifications: 0,
        queuedCount: 0,
        sentCount: 0,
        failedCount: 0,
        successRate: 100,
        activeRulesCount: 0
      }
    };

    if (snapshots) {
      for (const s of snapshots) {
        // Passport
        if (s.passport_expiry) {
          summary.passport.total++;
          const diffDays = Math.ceil((new Date(s.passport_expiry.split("T")[0]).getTime() - todayMs) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) summary.passport.overdue++;
          else if (diffDays <= 90) summary.passport.upcoming++;
        }

        // Visa
        if (s.visa_expiry) {
          summary.visa.total++;
          const diffDays = Math.ceil((new Date(s.visa_expiry.split("T")[0]).getTime() - todayMs) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) summary.visa.overdue++;
          else if (diffDays <= 90) summary.visa.upcoming++;
        }

        // eFRRO
        if (s.efrro_expiry) {
          summary.efrro.total++;
          const diffDays = Math.ceil((new Date(s.efrro_expiry.split("T")[0]).getTime() - todayMs) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) summary.efrro.overdue++;
          else if (diffDays <= 90) summary.efrro.upcoming++;
        }
      }
    }

    // 2. Fetch notification counts
    const { data: notifs } = await supabase
      .from("notifications")
      .select("status");

    if (notifs) {
      summary.system.totalNotifications = notifs.length;
      summary.system.sentCount = notifs.filter(n => n.status === "sent").length;
      summary.system.queuedCount = notifs.filter(n => n.status === "queued" || n.status === "sending" || n.status === "processing").length;
      summary.system.failedCount = notifs.filter(n => n.status === "failed").length;
      
      const finishedCount = summary.system.sentCount + summary.system.failedCount;
      summary.system.successRate = finishedCount > 0 
        ? Math.round((summary.system.sentCount / finishedCount) * 1000) / 10 
        : 100;
    }

    // 3. Fetch active rules count
    const { count: rulesCount } = await supabase
      .from("reminder_rules")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    summary.system.activeRulesCount = rulesCount || 0;

    return summary;
  } catch (err) {
    console.error("[FETCH_REMINDER_SUMMARY_EXCEPTION]", err);
    return fallback;
  }
}
