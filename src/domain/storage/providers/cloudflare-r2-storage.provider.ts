import { IStorageProvider, StorageMetadata } from "./storage.provider";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class CloudflareR2StorageProvider implements IStorageProvider {
  private s3Client: S3Client;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    const endpoint = process.env.R2_ENDPOINT?.trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "https://placeholder.r2.cloudflarestorage.com");
    
    // In production, these should be strictly validated during initialization
    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn("[CLOUDFLARE_R2] Missing required environment variables. R2 operations will fail.");
    }

    this.s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
    });
  }

  private getTargetBucket(bucket?: string): string {
    return process.env.R2_BUCKET_NAME?.trim() || bucket || "iscms-documents";
  }

  private sanitizeError(err: unknown, fallbackMessage: string): Error {
    const raw = err instanceof Error ? err.message : String(err);
    const sanitized = raw
      .replace(/[A-Fa-f0-9]{32,}/g, "[REDACTED]")
      .replace(/https:\/\/[^@/]+@/g, "https://[REDACTED]@");
    return new Error(`${fallbackMessage}: ${sanitized}`);
  }

  async upload(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const targetBucket = this.getTargetBucket(bucket);
    console.log(`[CLOUDFLARE_R2] Uploading to ${targetBucket}/${path}`);
    
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: path,
      Body: file,
      ContentType: contentType,
    });

    try {
      await this.s3Client.send(command);
      return path;
    } catch (error: unknown) {
      throw this.sanitizeError(error, "[STORAGE_UPLOAD_FAILED]");
    }
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    const targetBucket = this.getTargetBucket(bucket);
    console.log(`[CLOUDFLARE_R2] Downloading from ${targetBucket}/${path}`);

    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: path,
    });

    try {
      const response = await this.s3Client.send(command);
      const stream = response.Body as NodeJS.ReadableStream;
      
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
      });
    } catch (error: unknown) {
      throw this.sanitizeError(error, "[STORAGE_DOWNLOAD_FAILED]");
    }
  }

  async delete(bucket: string, path: string): Promise<boolean> {
    const targetBucket = this.getTargetBucket(bucket);
    console.log(`[CLOUDFLARE_R2] Deleting from ${targetBucket}/${path}`);

    const command = new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: path,
    });

    try {
      await this.s3Client.send(command);
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`[STORAGE_DELETE_WARNING] Failed to remove file: ${err.message}`);
      return false;
    }
  }

  async generateSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
    const targetBucket = this.getTargetBucket(bucket);
    console.log(`[CLOUDFLARE_R2] Generating signed URL for ${targetBucket}/${path} (${expiresInSeconds}s)`);

    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: path,
    });

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
      return signedUrl;
    } catch (error: unknown) {
      throw this.sanitizeError(error, "[STORAGE_SIGNED_URL_FAILED]");
    }
  }

  async fileExists(bucket: string, path: string): Promise<boolean> {
    const targetBucket = this.getTargetBucket(bucket);
    const command = new HeadObjectCommand({
      Bucket: targetBucket,
      Key: path,
    });

    try {
      await this.s3Client.send(command);
      return true;
    } catch (error: unknown) {
      const errorName = (error as { name?: string })?.name || "";
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (errorName === "NotFound" || statusCode === 404 || errorName === "NoSuchKey") {
        return false;
      }
      return false;
    }
  }

  async getMetadata(bucket: string, path: string): Promise<StorageMetadata> {
    const targetBucket = this.getTargetBucket(bucket);
    const command = new HeadObjectCommand({
      Bucket: targetBucket,
      Key: path,
    });

    try {
      const response = await this.s3Client.send(command);
      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || "application/octet-stream",
        lastModified: response.LastModified || new Date()
      };
    } catch (error: unknown) {
      throw this.sanitizeError(error, "[STORAGE_METADATA_FAILED]");
    }
  }
}
