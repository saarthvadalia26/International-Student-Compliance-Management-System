import { getAdminSupabase } from "@/lib/supabase/admin";
import { RetentionPolicy, RetentionAuditRow, ExpiredDocumentVersion } from "../types";

export interface IRetentionRepository {
  getRetentionPolicies(): Promise<RetentionPolicy[]>;
  updateRetentionPolicy(policy: Partial<RetentionPolicy> & { id: string }): Promise<void>;
  logRetentionActivity(log: Omit<RetentionAuditRow, "id" | "completedAt">): Promise<void>;
  getExpiredDocumentVersions(documentType: "passport" | "visa" | "efrro", retentionDays: number): Promise<ExpiredDocumentVersion[]>;
  deleteDocumentVersionRow(documentType: "passport" | "visa" | "efrro", versionId: string): Promise<void>;
}

export class SupabaseRetentionRepository implements IRetentionRepository {
  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("retention_policies")
      .select("*")
      .eq("is_active", true);

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] Failed to load retention policies: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      documentType: row.document_type as "passport" | "visa" | "efrro",
      retentionPeriodDays: row.retention_period_days,
      archiveBeforeDelete: row.archive_before_delete,
      gracePeriodDays: row.grace_period_days,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async updateRetentionPolicy(policy: Partial<RetentionPolicy> & { id: string }): Promise<void> {
    const supabase = getAdminSupabase();
    
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    if (policy.retentionPeriodDays !== undefined) updatePayload.retention_period_days = policy.retentionPeriodDays;
    if (policy.archiveBeforeDelete !== undefined) updatePayload.archive_before_delete = policy.archiveBeforeDelete;
    if (policy.gracePeriodDays !== undefined) updatePayload.grace_period_days = policy.gracePeriodDays;
    if (policy.isActive !== undefined) updatePayload.is_active = policy.isActive;

    const { error } = await supabase
      .from("retention_policies")
      .update(updatePayload)
      .eq("id", policy.id);

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] Failed updating retention policy: ${error.message}`);
    }
  }

  async logRetentionActivity(log: Omit<RetentionAuditRow, "id" | "completedAt">): Promise<void> {
    const supabase = getAdminSupabase();
    const dbRow = {
      document_type: log.documentType,
      version_id: log.versionId,
      student_id: log.studentId,
      action: log.action,
      file_path: log.filePath,
      dry_run: log.dryRun,
      performed_by: log.performedBy
    };

    const { error } = await supabase
      .from("retention_audit_log")
      .insert(dbRow);

    if (error) {
      throw new Error(`[DB_INSERT_FAILED] Failed logging retention audit action: ${error.message}`);
    }
  }

  async getExpiredDocumentVersions(documentType: "passport" | "visa" | "efrro", retentionDays: number): Promise<ExpiredDocumentVersion[]> {
    const supabase = getAdminSupabase();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - retentionDays);
    const dateStr = thresholdDate.toISOString();

    const tableName = `${documentType}_versions`;
    
    // Select versions older than the retention threshold that are not pending and not already purged
    const { data, error } = await supabase
      .from(tableName)
      .select("id, student_id, file_path, created_at, is_active")
      .neq("verification_status", "pending")
      .neq("file_path", "[PURGED]")
      .lte("created_at", dateStr);

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] Failed loading expired ${documentType} documents: ${error.message}`);
    }

    return data || [];
  }

  async deleteDocumentVersionRow(documentType: "passport" | "visa" | "efrro", versionId: string): Promise<void> {
    const supabase = getAdminSupabase();
    const tableName = `${documentType}_versions`;

    // Update the expired version's file path to [PURGED] to preserve metadata
    const { error } = await supabase
      .from(tableName)
      .update({ file_path: "[PURGED]", updated_at: new Date().toISOString() })
      .eq("id", versionId);

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] Failed marking expired ${documentType} version file as purged: ${error.message}`);
    }
  }
}
