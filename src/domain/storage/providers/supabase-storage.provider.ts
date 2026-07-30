import { IStorageProvider, StorageMetadata } from "./storage.provider";
import { getAdminSupabase } from "@/lib/supabase/admin";

export class SupabaseStorageProvider implements IStorageProvider {
  async upload(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const supabase = getAdminSupabase();
    console.log(`[SUPABASE_STORAGE] Uploading to ${bucket}/${path}`);
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true
      });

    if (error) {
      throw new Error(`[STORAGE_UPLOAD_FAILED] ${error.message}`);
    }

    return path;
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    const supabase = getAdminSupabase();
    console.log(`[SUPABASE_STORAGE] Downloading from ${bucket}/${path}`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      throw new Error(`[STORAGE_DOWNLOAD_FAILED] ${error?.message || "No data returned"}`);
    }

    return Buffer.from(await data.arrayBuffer());
  }

  async delete(bucket: string, path: string): Promise<boolean> {
    const supabase = getAdminSupabase();
    console.log(`[SUPABASE_STORAGE] Deleting from ${bucket}/${path}`);

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error(`[STORAGE_DELETE_WARNING] Failed to remove file: ${error.message}`);
      return false;
    }

    return true;
  }

  async generateSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
    const supabase = getAdminSupabase();
    console.log(`[SUPABASE_STORAGE] Generating signed URL for ${bucket}/${path}`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      throw new Error(`[STORAGE_SIGNED_URL_FAILED] ${error?.message || "No URL returned"}`);
    }

    return data.signedUrl;
  }

  async fileExists(bucket: string, path: string): Promise<boolean> {
    try {
      await this.getMetadata(bucket, path);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(bucket: string, path: string): Promise<StorageMetadata> {
    const supabase = getAdminSupabase();
    
    // In Supabase, list is the most reliable way to check metadata without downloading
    // We assume path does not end with a slash and is a full file path
    const folderPath = path.substring(0, path.lastIndexOf('/'));
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath, {
        limit: 1,
        search: fileName
      });

    if (error || !data || data.length === 0 || data[0].name !== fileName) {
      throw new Error(`[STORAGE_METADATA_FAILED] File not found or error occurred`);
    }

    const fileMeta = data[0];
    return {
      size: fileMeta.metadata?.size || 0,
      contentType: fileMeta.metadata?.mimetype || "application/octet-stream",
      lastModified: new Date(fileMeta.updated_at || fileMeta.created_at || Date.now())
    };
  }
}
