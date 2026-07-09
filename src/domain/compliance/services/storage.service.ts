import { ComplianceDocumentType } from "../types/student-snapshot.types";
import { getAdminSupabase } from "@/lib/supabase";

export interface IStorageService {
  uploadFile(studentId: string, type: ComplianceDocumentType, file: Buffer, fileName: string): Promise<string>;
  replaceFile(existingPath: string, file: Buffer): Promise<string>;
  deleteFile(path: string): Promise<boolean>;
  generateSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  validatePath(path: string): boolean;
}

export class SupabaseStorageService implements IStorageService {
  private bucketName = "student-documents";

  async uploadFile(studentId: string, type: ComplianceDocumentType, file: Buffer, fileName: string): Promise<string> {
    const supabase = getAdminSupabase();
    const filePath = `${type}/${studentId}/${fileName}`;
    
    console.log(`[STORAGE] Uploading ${type} file to: ${filePath}`);
    
    const { error } = await supabase.storage
      .from(this.bucketName)
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: true
      });

    if (error) {
      throw new Error(`[STORAGE_UPLOAD_FAILED] ${error.message}`);
    }

    return filePath;
  }

  async replaceFile(existingPath: string, file: Buffer): Promise<string> {
    const supabase = getAdminSupabase();
    console.log(`[STORAGE] Replacing file at path: ${existingPath}`);
    
    const { error } = await supabase.storage
      .from(this.bucketName)
      .update(existingPath, file, {
        contentType: "application/pdf",
        upsert: true
      });

    if (error) {
      throw new Error(`[STORAGE_REPLACE_FAILED] ${error.message}`);
    }

    return existingPath;
  }

  async deleteFile(path: string): Promise<boolean> {
    const supabase = getAdminSupabase();
    console.log(`[STORAGE] Archiving/Deleting file at path: ${path}`);
    
    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      console.error(`[STORAGE_DELETE_WARNING] Failed to remove file: ${error.message}`);
      return false;
    }

    return true;
  }

  async generateSignedUrl(path: string, expiresInSeconds: number): Promise<string> {
    const supabase = getAdminSupabase();
    console.log(`[STORAGE] Creating signed URL for path: ${path} (expires in ${expiresInSeconds}s)`);
    
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      throw new Error(`[STORAGE_SIGNED_URL_FAILED] ${error ? error.message : "No URL returned"}`);
    }

    return data.signedUrl;
  }

  validatePath(path: string): boolean {
    if (!path.trim()) return false;
    // Expected structure: type/studentId/fileName.pdf
    const parts = path.split("/");
    if (parts.length !== 3) return false;
    const [type, studentId, fileName] = parts;
    return (
      ["passport", "visa", "efrro"].includes(type) &&
      studentId.length > 10 &&
      fileName.endsWith(".pdf")
    );
  }
}
