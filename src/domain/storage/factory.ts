import { IStorageProvider } from "./providers/storage.provider";
import { SupabaseStorageProvider } from "./providers/supabase-storage.provider";

export class StorageProviderFactory {
  private static instance: IStorageProvider;

  /**
   * Initializes and returns the standard storage provider.
   * Uses a singleton pattern to prevent redundant instantiations.
   */
  static getProvider(): IStorageProvider {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new SupabaseStorageProvider();
    return this.instance;
  }
}
