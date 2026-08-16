import { getAdminSupabase } from "@/lib/supabase/admin";
import { ExpiryReminderEngine, RawNotificationRecord, ReminderRuleConfig } from "./reminder-engine.service";
import { DocumentReminderGroup } from "../types/reminder.types";

/**
 * Server-only scheduler service to evaluate and queue due reminders into Supabase.
 */
export class ReminderSchedulerServer {
  /**
   * Evaluates and queues due reminders for all configured document types for a student.
   */
  static async evaluateAndQueueStudentDueReminders(studentId: string): Promise<{ queuedCount: number; errors: string[] }> {
    const supabase = getAdminSupabase();

    // 1. Fetch student details, snapshot, and active document versions across all 3 document types
    const { data: student, error: sErr } = await supabase
      .from("students")
      .select(`
        id,
        registration_number,
        status,
        student_personal(full_name, preferred_language),
        student_contact(email, phone_home, phone_local),
        student_academic(program_code),
        student_snapshot(
          passport_expiry, passport_number,
          visa_expiry, visa_number,
          efrro_expiry, efrro_number
        ),
        passport_versions(id, version_number, is_active, document_number, expiry_date, verification_status, file_path, deleted_at),
        visa_versions(id, version_number, is_active, document_number, expiry_date, verification_status, file_path, deleted_at),
        efrro_versions(id, version_number, is_active, document_number, expiry_date, verification_status, file_path, deleted_at)
      `)
      .eq("id", studentId)
      .single();

    if (sErr || !student) {
      return { queuedCount: 0, errors: [`Failed to load student: ${sErr?.message || "Not found"}`] };
    }

    const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;
    const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;
    const contact = Array.isArray(student.student_contact) ? student.student_contact[0] : student.student_contact;
    const academic = Array.isArray(student.student_academic) ? student.student_academic[0] : student.student_academic;

    // Extract active approved document versions
    const activePassport = (student.passport_versions || []).find((v: { is_active: boolean; deleted_at: string | null; document_number?: string }) => v.is_active && !v.deleted_at);
    const activeVisa = (student.visa_versions || []).find((v: { is_active: boolean; deleted_at: string | null; document_number?: string }) => v.is_active && !v.deleted_at);
    const activeEfrro = (student.efrro_versions || []).find((v: { is_active: boolean; deleted_at: string | null; document_number?: string }) => v.is_active && !v.deleted_at);

    const passportExpiry = activePassport?.expiry_date || snapshot?.passport_expiry || null;
    const visaExpiry = activeVisa?.expiry_date || snapshot?.visa_expiry || null;
    const efrroExpiry = activeEfrro?.expiry_date || snapshot?.efrro_expiry || null;

    // 2. Fetch existing notification history for this student
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*, notification_delivery_log(*)")
      .eq("student_id", studentId);

    const notifications: RawNotificationRecord[] = (notifData || []) as RawNotificationRecord[];

    // 3. Fetch active reminder rules from database
    const { data: dbRules } = await supabase
      .from("reminder_rules")
      .select("id, document_type, alert_threshold_days, channel, is_active, rule_name, template_id")
      .eq("is_active", true);

    const customRules: Record<"passport" | "visa" | "efrro", ReminderRuleConfig[]> = {
      passport: [],
      visa: [],
      efrro: []
    };

    if (dbRules && dbRules.length > 0) {
      for (const r of dbRules) {
        const dType = r.document_type as "passport" | "visa" | "efrro";
        if (customRules[dType]) {
          customRules[dType].push({
            id: r.id,
            ruleName: r.rule_name || `${r.alert_threshold_days}-Day Reminder`,
            thresholdDays: r.alert_threshold_days,
            channel: r.channel as "email" | "whatsapp" | "both"
          });
        }
      }
    }

    const scheduleResponse = ExpiryReminderEngine.calculateStudentReminders({
      studentId,
      passport: {
        number: activePassport?.document_number || snapshot?.passport_number || "",
        expiryDate: passportExpiry,
        isUploaded: Boolean(activePassport?.file_path),
        verificationStatus: (activePassport?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      visa: {
        number: activeVisa?.document_number || snapshot?.visa_number || "",
        expiryDate: visaExpiry,
        isUploaded: Boolean(activeVisa?.file_path),
        verificationStatus: (activeVisa?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      efrro: {
        number: activeEfrro?.document_number || snapshot?.efrro_number || "",
        expiryDate: efrroExpiry,
        isUploaded: Boolean(activeEfrro?.file_path),
        verificationStatus: (activeEfrro?.verification_status as "not_uploaded" | "pending" | "verified" | "rejected") || "not_uploaded"
      },
      notifications,
      customRules: dbRules && dbRules.length > 0 ? customRules : undefined
    });

    let queuedCount = 0;
    const errors: string[] = [];
    const studentName = personal?.full_name || "Student";
    const enrollmentNumber = student.registration_number || "Pending Registration";
    const studentEmail = contact?.email || "";
    const studentPhone = contact?.phone_local || contact?.phone_home || "";
    const institutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME || "Office of International Student Affairs";
    const programName = academic?.program_code || "Academic Program";

    const docGroups: DocumentReminderGroup[] = [
      scheduleResponse.passport,
      scheduleResponse.visa,
      scheduleResponse.efrro
    ];

    // 4. Iterate over each document type and queue DUE reminders
    for (const doc of docGroups) {
      if (!doc.expiryDate || doc.isExpired) {
        continue;
      }

      for (const item of doc.schedule) {
        if (item.status === "DUE" && item.scheduledDateISO && doc.expiryDate) {
          // Email channel is currently disabled - do not queue email reminders
          if (item.channel === "email") {
            continue;
          }

          const targetChannel = "whatsapp";
          // Idempotency key accounts for student, docType, thresholdDays, channel, and expiryDate
          const idempotencyKey = `${studentId}:${doc.documentType}:${item.thresholdDays}:${targetChannel}:${doc.expiryDate}`;
          const recipientAddress = studentPhone || studentEmail;

          if (!recipientAddress) {
            errors.push(`No valid contact address for ${doc.documentType.toUpperCase()} ${item.thresholdDays}-day alert.`);
            continue;
          }

          const docTitle = doc.documentTitle;
          const daysLeft = String(item.thresholdDays);

          try {
            const { error: insertErr } = await supabase
              .from("notifications")
              .insert({
                student_id: studentId,
                document_type: doc.documentType,
                status: "queued",
                channel: targetChannel,
                recipient_address: recipientAddress,
                scheduled_for: new Date().toISOString(),
                trigger_source: "reminder_engine_calc",
                idempotency_key: idempotencyKey,
                notification_context: {
                  student_name: studentName,
                  enrollment_number: enrollmentNumber,
                  document_type: docTitle,
                  days_left: daysLeft,
                  days_remaining: daysLeft,
                  expiry_date: doc.expiryDate,
                  scheduled_date: item.scheduledDate,
                  institution_name: institutionName,
                  program_name: programName
                }
              });

            if (!insertErr) {
              queuedCount++;
            } else if (!insertErr.message.includes("unique") && !insertErr.message.includes("duplicate")) {
              errors.push(`Failed to queue ${doc.documentType} reminder: ${insertErr.message}`);
            }
          } catch (err) {
            errors.push(err instanceof Error ? err.message : "Error queuing reminder");
          }
        }
      }
    }

    return { queuedCount, errors };
  }
}
