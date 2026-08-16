export interface StorageMetadata {
  size: number;
  contentType: string;
  lastModified: Date;
}

export interface IStorageProvider {
  /**
   * Uploads a file buffer to the specified bucket and path.
   * @param bucket The name of the storage bucket.
   * @param path The destination file path.
   * @param file The file buffer.
   * @param contentType The MIME type of the file.
   * @returns The resolved storage path.
   */
  upload(bucket: string, path: string, file: Buffer, contentType: string): Promise<string>;

  /**
   * Downloads a file from the specified bucket and path.
   * @param bucket The name of the storage bucket.
   * @param path The file path.
   * @returns The file buffer.
   */
  download(bucket: string, path: string): Promise<Buffer>;

  /**
   * Deletes a file from the specified bucket and path.
   * @param bucket The name of the storage bucket.
   * @param path The file path.
   * @returns Boolean indicating success.
   */
  delete(bucket: string, path: string): Promise<boolean>;

  /**
   * Generates a pre-signed URL for secure, temporary file access.
   * @param bucket The name of the storage bucket.
   * @param path The file path.
   * @param expiresInSeconds Duration before the URL expires.
   * @returns The signed URL.
   */
  generateSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;

  /**
   * Checks if a file exists at the specified path.
   * @param bucket The name of the storage bucket.
   * @param path The file path.
   * @returns Boolean indicating existence.
   */
  fileExists(bucket: string, path: string): Promise<boolean>;

  /**
   * Retrieves metadata for a specific file.
   * @param bucket The name of the storage bucket.
   * @param path The file path.
   * @returns The storage metadata.
   */
  getMetadata(bucket: string, path: string): Promise<StorageMetadata>;

  /**
   * Performs a safe, non-mutating connectivity check to the storage provider.
   * @returns Health status, latency in milliseconds, bucket name, and provider name.
   */
  healthCheck(): Promise<StorageHealthCheckResult>;
}

export interface StorageHealthCheckResult {
  status: "connected" | "healthy" | "unhealthy" | "not_configured" | "unavailable";
  providerName: string;
  bucket?: string;
  latencyMs: number | null;
  checkedAt?: string;
  objectCount?: number;
  approximateStorageBytes?: number;
  error?: string;
}
