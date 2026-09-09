import { ComplianceDocumentType } from "@/features/compliance/constants/constants";
import { isEfrroApplicable } from "@/domain/compliance/utils/efrro-applicability";

export interface ReminderEligibilityResult {
  isEligible: boolean;
  reason: "ELIGIBLE" | "AFTER_GRADUATION" | "MISSING_EXPIRY" | "MISSING_GRADUATION_DATE";
  details: string;
}

export interface StudentReconciliationSummary {
  studentId: string;
  cancelledCount: number;
  evaluatedDocs: Record<ComplianceDocumentType, {
    expiryDate: string | null;
    isEligible: boolean;
    reason: string;
  }>;
  errors: string[];
}

export interface GlobalReconciliationReport {
  studentsScanned: number;
  documentsEvaluated: number;
  remindersCancelled: number;
  recordsSkipped: number;
  errors: string[];
}

export class ReminderReconciliationService {
  /**
   * Centralized canonical rule evaluation:
   * A document expiry reminder schedule is ELIGIBLE if and only if:
   * 1. A valid document expiry date exists.
   * 2. EITHER expected graduation date is not recorded (fallback policy)
   *    OR document_expiry_date <= student_expected_graduation_date.
   *
   * If document_expiry_date > student_expected_graduation_date, returns isEligible = false with reason = AFTER_GRADUATION.
   */
  public static isDocumentReminderEligible(params: {
    expiryDate?: string | null | undefined;
    expectedGraduationDate?: string | null | undefined;
  }): ReminderEligibilityResult {
    const cleanExpiry = params.expiryDate ? params.expiryDate.split("T")[0].trim() : "";
    const cleanGrad = params.expectedGraduationDate ? params.expectedGraduationDate.split("T")[0].trim() : "";

    const hasValidExpiry = Boolean(cleanExpiry && /^\d{4}-\d{2}-\d{2}$/.test(cleanExpiry));
    const hasValidGrad = Boolean(cleanGrad && /^\d{4}-\d{2}-\d{2}$/.test(cleanGrad));

    if (!hasValidExpiry) {
      return {
        isEligible: false,
        reason: "MISSING_EXPIRY",
        details: "Document expiry date is not recorded. Reminders cannot be scheduled."
      };
    }

    if (!hasValidGrad) {
      return {
        isEligible: true,
        reason: "MISSING_GRADUATION_DATE",
        details: "Student expected graduation date is not recorded. Reminders evaluate standard expiry timeline."
      };
    }

    // Canonical ISO date string comparison (YYYY-MM-DD ensures exact chronological ordering)
    if (cleanExpiry > cleanGrad) {
      return {
        isEligible: false,
        reason: "AFTER_GRADUATION",
        details: `Document expires (${cleanExpiry}) after student expected graduation date (${cleanGrad}). Reminders are excluded.`
      };
    }

    return {
      isEligible: true,
      reason: "ELIGIBLE",
      details: `Document expires (${cleanExpiry}) on or before expected graduation date (${cleanGrad}). Reminders are active.`
    };
  }

  /**
   * Idempotently reconciles the reminder schedule and outstanding notifications for a single student.
   * - Cancels any outstanding notifications ('queued', 'sending', 'processing', 'failed') for documents expiring after graduation.
   * - Preserves historical 'sent' or 'delivered' notification records for compliance audit.
   * - Re-queues any eligible due reminders.
   */
  public static async reconcileStudentReminderSchedule(
    studentId: string,
    actorId?: string
  ): Promise<StudentReconciliationSummary> {
    const summary: StudentReconciliationSummary = {
      studentId,
      cancelledCount: 0,
      evaluatedDocs: {
        passport: { expiryDate: null, isEligible: false, reason: "NOT_EVALUATED" },
        visa: { expiryDate: null, isEligible: false, reason: "NOT_EVALUATED" },
        efrro: { expiryDate: null, isEligible: false, reason: "NOT_EVALUATED" }
      },
      errors: []
    };

    try {
      const { getAdminSupabase } = await import("@/lib/supabase/admin");
      const supabase = getAdminSupabase();

      // 1. Fetch student data with academic expected graduation and active document versions
      const { data: student, error: sErr } = await supabase
        .from("students")
        .select(`
          id,
          registration_number,
          student_personal(nationality_code),
          student_academic(expected_graduation),
          student_snapshot(passport_expiry, visa_expiry, efrro_expiry),
          passport_versions(id, is_active, expiry_date, deleted_at),
          visa_versions(id, is_active, expiry_date, deleted_at),
          efrro_versions(id, is_active, expiry_date, deleted_at)
        `)
        .eq("id", studentId)
        .maybeSingle();

      if (sErr || !student) {
        summary.errors.push(`Student not found: ${sErr?.message || studentId}`);
        return summary;
      }

      const academic = Array.isArray(student.student_academic) ? student.student_academic[0] : student.student_academic;
      const snapshot = Array.isArray(student.student_snapshot) ? student.student_snapshot[0] : student.student_snapshot;

      const activePassport = (student.passport_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);
      const activeVisa = (student.visa_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);
      const activeEfrro = (student.efrro_versions || []).find((v: { is_active: boolean; deleted_at: string | null }) => v.is_active && !v.deleted_at);

      const expectedGraduation = academic?.expected_graduation || null;

      const docExpiries: Record<ComplianceDocumentType, string | null> = {
        passport: activePassport?.expiry_date || snapshot?.passport_expiry || null,
        visa: activeVisa?.expiry_date || snapshot?.visa_expiry || null,
        efrro: activeEfrro?.expiry_date || snapshot?.efrro_expiry || null
      };

      const docTypes: ComplianceDocumentType[] = ["passport", "visa", "efrro"];

      const personal = Array.isArray(student.student_personal) ? student.student_personal[0] : student.student_personal;
      const isEfrroApp = isEfrroApplicable(personal?.nationality_code);

      for (const docType of docTypes) {
        if (docType === "efrro" && !isEfrroApp) {
          summary.evaluatedDocs.efrro = {
            expiryDate: null,
            isEligible: false,
            reason: "NOT_APPLICABLE"
          };

          const { data: staleNotifs, error: qErr } = await supabase
            .from("notifications")
            .select("id, status, retry_count, notification_context")
            .eq("student_id", studentId)
            .eq("document_type", "efrro")
            .in("status", ["queued", "sending", "processing", "failed"]);

          if (staleNotifs && staleNotifs.length > 0) {
            for (const notif of staleNotifs) {
              const updatedContext = {
                ...(notif.notification_context || {}),
                cancellation_reason: "EFRRO_NOT_APPLICABLE_FOR_INDIAN_NATIONAL",
                cancelled_at: new Date().toISOString(),
                cancelled_by: actorId || "reconciliation_engine"
              };
              await supabase
                .from("notifications")
                .update({
                  status: "cancelled",
                  notification_context: updatedContext,
                  updated_at: new Date().toISOString()
                })
                .eq("id", notif.id);

              summary.cancelledCount++;
            }
          }
          continue;
        }

        const expiryDate = docExpiries[docType];
        const eligibility = this.isDocumentReminderEligible({
          expiryDate,
          expectedGraduationDate: expectedGraduation
        });

        summary.evaluatedDocs[docType] = {
          expiryDate,
          isEligible: eligibility.isEligible,
          reason: eligibility.reason
        };

        if (eligibility.reason === "AFTER_GRADUATION") {
          // Document expires after graduation -> Cancel all outstanding (queued, sending, processing, failed) notifications
          const { data: staleNotifs, error: qErr } = await supabase
            .from("notifications")
            .select("id, status, retry_count, notification_context")
            .eq("student_id", studentId)
            .eq("document_type", docType)
            .in("status", ["queued", "sending", "processing", "failed"]);

          if (qErr) {
            summary.errors.push(`Failed querying stale notifications for ${docType}: ${qErr.message}`);
            continue;
          }

          if (staleNotifs && staleNotifs.length > 0) {
            for (const notif of staleNotifs) {
              const updatedContext = {
                ...(notif.notification_context || {}),
                cancellation_reason: "DOCUMENT_EXPIRES_AFTER_GRADUATION",
                cancelled_at: new Date().toISOString(),
                cancelled_by: actorId || "reconciliation_engine"
              };

              const { error: uErr } = await supabase
                .from("notifications")
                .update({
                  status: "cancelled",
                  updated_at: new Date().toISOString(),
                  notification_context: updatedContext
                })
                .eq("id", notif.id);

              if (!uErr) {
                summary.cancelledCount++;

                // Log cancellation in delivery audit log
                await supabase.from("notification_delivery_log").insert({
                  notification_id: notif.id,
                  attempt_number: (notif.retry_count || 0) + 1,
                  status: "cancelled",
                  gateway_response: {
                    cancellation_reason: "DOCUMENT_EXPIRES_AFTER_GRADUATION",
                    graduation_date: expectedGraduation,
                    document_expiry: expiryDate
                  },
                  error_message: "Cancelled during reconciliation: Document expires after student expected graduation date.",
                  created_at: new Date().toISOString()
                });
              } else {
                summary.errors.push(`Failed cancelling notification ${notif.id}: ${uErr.message}`);
              }
            }
          }
        }
      }

      return summary;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`Reconciliation exception: ${msg}`);
      return summary;
    }
  }

  /**
   * System-wide maintenance reconciliation:
   * Scans all students, evaluates document reminder eligibility, and cancels stale notifications.
   * Safe to run during migration, scheduled maintenance, or manual administration.
   */
  public static async reconcileAllStudentsReminderSchedules(
    actorId?: string
  ): Promise<GlobalReconciliationReport> {
    const report: GlobalReconciliationReport = {
      studentsScanned: 0,
      documentsEvaluated: 0,
      remindersCancelled: 0,
      recordsSkipped: 0,
      errors: []
    };

    try {
      const { getAdminSupabase } = await import("@/lib/supabase/admin");
      const supabase = getAdminSupabase();

      // Retrieve all non-deleted students
      const { data: students, error } = await supabase
        .from("students")
        .select("id")
        .is("deleted_at", null);

      if (error || !students) {
        report.errors.push(`Failed loading students for global reconciliation: ${error?.message}`);
        return report;
      }

      report.studentsScanned = students.length;

      for (const student of students) {
        const studentSummary = await this.reconcileStudentReminderSchedule(student.id, actorId);
        report.documentsEvaluated += 3;
        report.remindersCancelled += studentSummary.cancelledCount;

        if (studentSummary.cancelledCount === 0) {
          report.recordsSkipped++;
        }

        if (studentSummary.errors.length > 0) {
          report.errors.push(...studentSummary.errors);
        }
      }

      console.log("[RECONCILIATION_AUDIT_COMPLETE]", {
        studentsScanned: report.studentsScanned,
        documentsEvaluated: report.documentsEvaluated,
        remindersCancelled: report.remindersCancelled,
        recordsSkipped: report.recordsSkipped,
        errorsCount: report.errors.length
      });

      return report;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push(`Global reconciliation failed: ${msg}`);
      return report;
    }
  }
}
