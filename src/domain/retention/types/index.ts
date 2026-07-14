export interface RetentionPolicy {
  id: string;
  documentType: "passport" | "visa" | "efrro";
  retentionPeriodDays: number;
  archiveBeforeDelete: boolean;
  gracePeriodDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionAuditRow {
  id: string;
  documentType: string;
  versionId: string;
  studentId: string;
  action: "archived" | "deleted" | "grace_warning_issued";
  filePath: string;
  dryRun: boolean;
  performedBy: string;
  completedAt: Date;
}

export interface CleanupResultItem {
  versionId: string;
  studentId: string;
  documentType: string;
  filePath: string;
  action: "archived" | "deleted" | "grace_warning_issued";
  details: string;
}

export interface CleanupExecutionReport {
  dryRun: boolean;
  totalScanned: number;
  actionsPerformed: CleanupResultItem[];
  completedAt: Date;
}

export interface ExpiredDocumentVersion {
  id: string;
  student_id: string;
  file_path: string;
  created_at: string;
  is_active: boolean;
}
