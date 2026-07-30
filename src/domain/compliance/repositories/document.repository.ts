import { ComplianceDocument, ComplianceDocumentType, StudentSnapshot } from "../types/student-snapshot.types";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { DocumentMapper } from "../mappers/document.mapper";

export interface IComplianceDocumentRepository {
  getActiveDocument(studentId: string, type: ComplianceDocumentType): Promise<ComplianceDocument | null>;
  getVersionHistory(studentId: string, type: ComplianceDocumentType): Promise<ComplianceDocument[]>;
  createDocumentVersion(doc: Partial<ComplianceDocument>, type: ComplianceDocumentType): Promise<ComplianceDocument>;
  deactivatePreviousVersions(studentId: string, type: ComplianceDocumentType, activeId: string): Promise<void>;
  updateVerificationStatus(id: string, type: ComplianceDocumentType, status: string, actorId: string | null, rejectionReason?: string, notes?: string): Promise<ComplianceDocument>;
  getSnapshot(studentId: string): Promise<StudentSnapshot | null>;
  upsertSnapshot(snapshot: StudentSnapshot): Promise<StudentSnapshot>;
  updateStorageLifecycle(id: string, type: ComplianceDocumentType, status: string, deletionReason?: string, deletedBySystem?: boolean): Promise<void>;
  logStorageAudit(studentId: string, documentId: string, documentType: ComplianceDocumentType, action: string, operatorSystem: string, correlationId?: string, details?: Record<string, unknown>): Promise<void>;
}

export class SupabaseComplianceDocumentRepository implements IComplianceDocumentRepository {
  private getTableName(type: ComplianceDocumentType): string {
    return `${type}_versions`;
  }

  async getActiveDocument(studentId: string, type: ComplianceDocumentType): Promise<ComplianceDocument | null> {
    const supabase = getAdminSupabase();
    const table = this.getTableName(type);
    
    console.log(`[DB_REPOSITORY] Querying active ${type} version for student ${studentId}`);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    return data ? DocumentMapper.toDomain(data) : null;
  }

  async getVersionHistory(studentId: string, type: ComplianceDocumentType): Promise<ComplianceDocument[]> {
    const supabase = getAdminSupabase();
    const table = this.getTableName(type);

    console.log(`[DB_REPOSITORY] Fetching ${type} version history logs for student ${studentId}`);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("version_number", { ascending: false });

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    return (data || []).map(row => DocumentMapper.toDomain(row));
  }

  async createDocumentVersion(doc: Partial<ComplianceDocument>, type: ComplianceDocumentType): Promise<ComplianceDocument> {
    const supabase = getAdminSupabase();
    const table = this.getTableName(type);
    const dbRow = DocumentMapper.toDb({
      ...doc,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ComplianceDocument);

    // Delete primary keys and timestamp structures to let DB default them if not set
    delete dbRow.id;

    console.log(`[DB_REPOSITORY] Inserting new ${type} version row in database...`);
    const { data, error } = await supabase
      .from(table)
      .insert(dbRow)
      .select("*")
      .single();

    if (error) {
      throw new Error(`[DB_INSERT_FAILED] ${error.message}`);
    }

    return DocumentMapper.toDomain(data);
  }

  async deactivatePreviousVersions(studentId: string, type: ComplianceDocumentType, activeId: string): Promise<void> {
    const supabase = getAdminSupabase();
    const table = this.getTableName(type);

    console.log(`[DB_REPOSITORY] Deactivating older ${type} versions for student ${studentId}`);
    const { error } = await supabase
      .from(table)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .neq("id", activeId);

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] ${error.message}`);
    }
  }

  async updateVerificationStatus(id: string, type: ComplianceDocumentType, status: string, actorId: string | null, rejectionReason?: string, notes?: string): Promise<ComplianceDocument> {
    const supabase = getAdminSupabase();
    const table = this.getTableName(type);

    console.log(`[DB_REPOSITORY] Updating verification status for ${type} record ${id} to: ${status}`);
    const updatePayload: Record<string, unknown> = {
      verification_status: status,
      updated_at: new Date().toISOString(),
      verified_by: actorId,
      verified_at: new Date().toISOString()
    };

    if (status === "rejected") {
      updatePayload.rejection_reason = rejectionReason || null;
    }
    if (notes) {
      updatePayload.notes = notes;
    }

    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] ${error.message}`);
    }

    return DocumentMapper.toDomain(data);
  }

  async getSnapshot(studentId: string): Promise<StudentSnapshot | null> {
    const supabase = getAdminSupabase();
    
    console.log(`[DB_REPOSITORY] Querying student compliance snapshot for ${studentId}`);
    const { data, error } = await supabase
      .from("student_snapshot")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) {
      throw new Error(`[DB_QUERY_FAILED] ${error.message}`);
    }

    return data ? DocumentMapper.toSnapshotDomain(data) : null;
  }

  async upsertSnapshot(snapshot: StudentSnapshot): Promise<StudentSnapshot> {
    const supabase = getAdminSupabase();
    const dbRow = DocumentMapper.toSnapshotDb(snapshot);

    console.log(`[DB_REPOSITORY] Upserting student snapshot metrics for student ${snapshot.studentId}`);
    const { data, error } = await supabase
      .from("student_snapshot")
      .upsert(dbRow)
      .select("*")
      .single();

    if (error) {
      throw new Error(`[DB_UPSERT_FAILED] ${error.message}`);
    }

    return DocumentMapper.toSnapshotDomain(data);
  }

  async updateStorageLifecycle(id: string, type: ComplianceDocumentType, status: string, deletionReason?: string, deletedBySystem?: boolean): Promise<void> {
    const supabase = getAdminSupabase();
    const table = this.getTableName(type);

    console.log(`[DB_REPOSITORY] Updating storage lifecycle for ${type} record ${id} to status: ${status}`);
    const updatePayload: Record<string, unknown> = {
      storage_status: status,
      updated_at: new Date().toISOString()
    };

    if (status === 'DELETED') {
      updatePayload.deleted_at = new Date().toISOString();
    }
    
    if (deletionReason !== undefined) {
      updatePayload.deletion_reason = deletionReason;
    }
    
    if (deletedBySystem !== undefined) {
      updatePayload.deleted_by_system = deletedBySystem;
    }

    const { error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      throw new Error(`[DB_UPDATE_FAILED] Failed to update storage lifecycle: ${error.message}`);
    }
  }

  async logStorageAudit(studentId: string, documentId: string, documentType: ComplianceDocumentType, action: string, operatorSystem: string, correlationId?: string, details?: Record<string, unknown>): Promise<void> {
    const supabase = getAdminSupabase();
    
    console.log(`[DB_REPOSITORY] Logging storage audit event: ${action} for document ${documentId}`);
    
    const { error } = await supabase
      .from("document_lifecycle_audit_log")
      .insert({
        student_id: studentId,
        document_id: documentId,
        document_type: documentType,
        action: action,
        operator_system: operatorSystem,
        correlation_id: correlationId || null,
        details: details || {}
      });

    if (error) {
      console.error(`[DB_INSERT_FAILED] Failed to log storage audit: ${error.message}`);
      // Not throwing error to avoid blocking the main workflow due to logging failure
    }
  }
}
