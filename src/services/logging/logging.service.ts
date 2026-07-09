

// Standard event taxonomy from Section 8 of DDS
export type ComplianceEvent =
  | "StudentCreated"
  | "StudentUpdated"
  | "PassportRenewed"
  | "VisaRenewed"
  | "EFRROUploaded"
  | "ReminderScheduled"
  | "ReminderSent"
  | "ReminderFailed"
  | "ReminderCancelled"
  | "NotificationRetried";

export interface LogEntry {
  id?: string;
  actorId?: string; // Reference to Supabase Auth User ID
  action: "INSERT" | "UPDATE" | "DELETE";
  eventName: ComplianceEvent;
  tableName: string;
  rowId: string;
  changes?: Record<string, unknown> | null;
  createdAt?: Date;
}

export interface ILoggingService {
  /**
   * Log an audit trail entry (ADR-004: Append-Only Immutable Activity Log)
   */
  log(entry: LogEntry): Promise<void>;

  /**
   * Fetch activity logs for a specific row/entity (e.g., student audits)
   */
  getLogsByRow(tableName: string, rowId: string): Promise<LogEntry[]>;

  /**
   * Query general system activity logs (auditor view)
   */
  getSystemLogs(limit: number, offset: number): Promise<LogEntry[]>;
}

export class ConsoleLoggingService implements ILoggingService {
  async log(entry: LogEntry): Promise<void> {
    console.log(`[AUDIT_LOG] [${entry.action}] [${entry.eventName}] - Table: ${entry.tableName}, Row: ${entry.rowId}`, {
      actorId: entry.actorId,
      changes: entry.changes,
      timestamp: new Date()
    });
    // Supabase DB integration will occur here in future sprints
  }

  async getLogsByRow(tableName: string, rowId: string): Promise<LogEntry[]> {
    console.log(`[AUDIT_LOG] Fetching logs for ${tableName} ID: ${rowId}`);
    return [];
  }

  async getSystemLogs(limit: number): Promise<LogEntry[]> {
    console.log(`[AUDIT_LOG] Fetching system logs with limit ${limit}`);
    return [];
  }
}
