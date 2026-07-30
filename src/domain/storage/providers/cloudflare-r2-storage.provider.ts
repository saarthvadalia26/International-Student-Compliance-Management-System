import { IStorageProvider, StorageMetadata } from "./storage.provider";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class CloudflareR2StorageProvider implements IStorageProvider {
  private s3Client: S3Client;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    
    // In production, these should be strictly validated during initialization
    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn("[CLOUDFLARE_R2] Missing required environment variables. R2 operations will fail.");
    }

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
      },
    });
  }

  async upload(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    console.log(`[CLOUDFLARE_R2] Uploading to ${bucket}/${path}`);
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: file,
      ContentType: contentType,
    });

    try {
      await this.s3Client.send(command);
      return path;
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`[STORAGE_UPLOAD_FAILED] ${err.message}`);
    }
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    console.log(`[CLOUDFLARE_R2] Downloading from ${bucket}/${path}`);

    const command = new GetObjectCommand({
      Bucket: bucket,
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
      const err = error as Error;
      throw new Error(`[STORAGE_DOWNLOAD_FAILED] ${err.message}`);
    }
  }

  async delete(bucket: string, path: string): Promise<boolean> {
    console.log(`[CLOUDFLARE_R2] Deleting from ${bucket}/${path}`);

    const command = new DeleteObjectCommand({
      Bucket: bucket,
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
    console.log(`[CLOUDFLARE_R2] Generating signed URL for ${bucket}/${path}`);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
      return signedUrl;
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(`[STORAGE_SIGNED_URL_FAILED] ${err.message}`);
    }
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
    const command = new HeadObjectCommand({
      Bucket: bucket,
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
      const err = error as Error;
      throw new Error(`[STORAGE_METADATA_FAILED] ${err.message}`);
    }
  }
}
