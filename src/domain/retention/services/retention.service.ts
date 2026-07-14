import { IRetentionRepository, SupabaseRetentionRepository } from "../repositories/retention.repository";
import { RetentionPolicy, CleanupExecutionReport, CleanupResultItem } from "../types";
import { getAdminSupabase } from "@/lib/supabase/admin";

export class RetentionService {
  private repository: IRetentionRepository;

  constructor(repository: IRetentionRepository = new SupabaseRetentionRepository()) {
    this.repository = repository;
  }

  async getPolicies(): Promise<RetentionPolicy[]> {
    return this.repository.getRetentionPolicies();
  }

  async updatePolicy(policy: Partial<RetentionPolicy> & { id: string }): Promise<void> {
    return this.repository.updateRetentionPolicy(policy);
  }

  async executeCleanupLifecycle(dryRun: boolean, performedBy: string = "System Scheduler"): Promise<CleanupExecutionReport> {
    console.log(`[RETENTION_SERVICE] Starting document cleanup lifecycle. Mode: ${dryRun ? "DRY-RUN" : "LIVE"}`);
    
    const policies = await this.repository.getRetentionPolicies();
    const resultItems: CleanupResultItem[] = [];
    let totalScanned = 0;

    const supabase = getAdminSupabase();

    for (const policy of policies) {
      if (!policy.isActive) continue;

      const documentType = policy.documentType;
      const retentionDays = policy.retentionPeriodDays;
      const graceDays = policy.gracePeriodDays;

      console.log(`[RETENTION_SERVICE] Processing ${documentType} documents (Retention: ${retentionDays} days, Grace: ${graceDays} days)`);

      // Fetch non-active versions exceeding retention threshold
      const expiredVersions = await this.repository.getExpiredDocumentVersions(documentType, retentionDays);
      totalScanned += expiredVersions.length;

      for (const version of expiredVersions) {
        const createdAt = new Date(version.created_at);
        const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const bucketName = `${documentType}-documents`;

        // 1. Permanent Delete Lifecycle Stage (Age exceeds Retention + Grace)
        if (ageInDays > retentionDays + graceDays) {
          const actionDetails = `Exceeded retention (${retentionDays}d) + grace period (${graceDays}d) at age ${ageInDays}d. Permanent purge.`;
          console.log(`[RETENTION_SERVICE] Purging version ${version.id} for student ${version.student_id}. Age: ${ageInDays}d`);

          if (!dryRun) {
            try {
              // Delete asset binary from Supabase Storage
              const { error: storageErr } = await supabase.storage
                .from(bucketName)
                .remove([version.file_path]);

              if (storageErr) {
                console.error(`[RETENTION_SERVICE_ERROR] Storage removal failed for path ${version.file_path}:`, storageErr.message);
              }

              // Remove DB version row record
              await this.repository.deleteDocumentVersionRow(documentType, version.id);

              // Log deletion activity in audit history
              await this.repository.logRetentionActivity({
                documentType,
                versionId: version.id,
                studentId: version.student_id,
                action: "deleted",
                filePath: version.file_path,
                dryRun: false,
                performedBy
              });
            } catch (err) {
              console.error(`[RETENTION_SERVICE_ERROR] Failed during live delete execution for version ${version.id}:`, err);
            }
          }

          resultItems.push({
            versionId: version.id,
            studentId: version.student_id,
            documentType,
            filePath: version.file_path,
            action: "deleted",
            details: actionDetails
          });
        }
        // 2. Grace Warning & Archive Lifecycle Stage (Age exceeds Retention but within Grace)
        else if (ageInDays > retentionDays) {
          const actionDetails = `Exceeded retention (${retentionDays}d) but inside grace period (${graceDays}d) at age ${ageInDays}d. Grace status warning.`;
          console.log(`[RETENTION_SERVICE] Warning/Archiving version ${version.id} for student ${version.student_id}. Age: ${ageInDays}d`);

          if (!dryRun) {
            try {
              // Check if grace warning was already issued to prevent duplicate audit entries
              const { data: logs, error: logsErr } = await supabase
                .from("retention_audit_log")
                .select("id")
                .eq("version_id", version.id)
                .eq("action", "grace_warning_issued");

              if (!logsErr && (!logs || logs.length === 0)) {
                await this.repository.logRetentionActivity({
                  documentType,
                  versionId: version.id,
                  studentId: version.student_id,
                  action: "grace_warning_issued",
                  filePath: version.file_path,
                  dryRun: false,
                  performedBy
                });
              }

              // Archive document if requested
              if (policy.archiveBeforeDelete) {
                const { data: archLogs, error: archLogsErr } = await supabase
                  .from("retention_audit_log")
                  .select("id")
                  .eq("version_id", version.id)
                  .eq("action", "archived");

                if (!archLogsErr && (!archLogs || archLogs.length === 0)) {
                  // Simulate or copy file binary to an archive location prefix
                  const archivePath = `archive/${version.file_path}`;
                  await supabase.storage
                    .from(bucketName)
                    .copy(version.file_path, archivePath);

                  await this.repository.logRetentionActivity({
                    documentType,
                    versionId: version.id,
                    studentId: version.student_id,
                    action: "archived",
                    filePath: archivePath,
                    dryRun: false,
                    performedBy
                  });
                }
              }
            } catch (err) {
              console.error(`[RETENTION_SERVICE_ERROR] Failed during live warning/archival for version ${version.id}:`, err);
            }
          }

          resultItems.push({
            versionId: version.id,
            studentId: version.student_id,
            documentType,
            filePath: version.file_path,
            action: policy.archiveBeforeDelete ? "archived" : "grace_warning_issued",
            details: actionDetails
          });
        }
      }
    }

    return {
      dryRun,
      totalScanned,
      actionsPerformed: resultItems,
      completedAt: new Date()
    };
  }
}
export const retentionService = new RetentionService();
