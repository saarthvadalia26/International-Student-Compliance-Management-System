import { IStorageProvider } from "./providers/storage.provider";
import { SupabaseStorageProvider } from "./providers/supabase-storage.provider";
import { CloudflareR2StorageProvider } from "./providers/cloudflare-r2-storage.provider";

export class StorageProviderFactory {
  private static instance: IStorageProvider;

  /**
   * Initializes and returns the configured storage provider based on environment variables.
   * Uses a singleton pattern to prevent redundant instantiations (e.g. recreating S3 clients).
   */
  static getProvider(): IStorageProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = process.env.STORAGE_PROVIDER?.toLowerCase();
    const hasR2Env = Boolean(
      process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim()
    );

    if (providerType === "cloudflare-r2" || hasR2Env) {
      console.log("[STORAGE_FACTORY] Initializing Cloudflare R2 Storage Provider");
      this.instance = new CloudflareR2StorageProvider();
    } else {
      // Default fallback is Supabase for backwards compatibility
      console.log("[STORAGE_FACTORY] Initializing Supabase Storage Provider");
      this.instance = new SupabaseStorageProvider();
    }

    return this.instance;
  }
}
