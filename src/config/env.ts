import { z } from "zod";

// Base schema for public variables available on both client and server
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, "NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid key string")
});

// Extended schema for server-side environments where administrative service keys are required
const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, "SUPABASE_SERVICE_ROLE_KEY must be configured on the server")
});

export type ClientEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

// Cloudflare R2 Object Storage schema (server-side only, validated on-demand when R2 operations are executed)
export const r2StorageConfigSchema = z.object({
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required for Cloudflare R2 operations"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required for Cloudflare R2 operations"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required for Cloudflare R2 operations"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required for Cloudflare R2 operations"),
  R2_ENDPOINT: z.string().url("R2_ENDPOINT must be a valid URL").optional().or(z.literal(""))
});

export type R2StorageConfig = z.infer<typeof r2StorageConfigSchema>;

/**
 * Retrieves the Cloudflare R2 server environment variables safely without throwing on startup.
 */
export function getR2StorageConfig(): {
  accountId: string | undefined;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  bucketName: string | undefined;
  endpoint: string | undefined;
  isConfigured: boolean;
} {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const endpoint = process.env.R2_ENDPOINT?.trim();

  const isConfigured = Boolean(
    accountId && accessKeyId && secretAccessKey && bucketName
  );

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    isConfigured
  };
}

/**
 * Validates that Cloudflare R2 storage credentials are configured.
 * Call this inside R2 storage provider methods rather than on general application startup.
 */
export function validateR2StorageConfig(): R2StorageConfig {
  const parsed = r2StorageConfigSchema.safeParse({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_ENDPOINT: process.env.R2_ENDPOINT
  });

  if (!parsed.success) {
    const formattedErrors = parsed.error.issues
      .map((issue) => ` - [${issue.path.join(".")}]: ${issue.message}`)
      .join("\n");
    throw new Error(`[R2_CONFIG_ERROR] Cloudflare R2 environment configuration validation failed:\n${formattedErrors}`);
  }

  return parsed.data;
}

export function validateEnvironment(): ServerEnv | ClientEnv {
  const isServer = typeof window === "undefined";

  if (isServer) {
    const parsed = serverEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    if (!parsed.success) {
      const formattedErrors = parsed.error.issues
        .map((issue) => ` - [${issue.path.join(".")}]: ${issue.message}`)
        .join("\n");
      throw new Error(`[STARTUP_ERROR] Server environment validation failed:\n${formattedErrors}`);
    }

    return parsed.data;
  } else {
    const parsed = publicEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });

    if (!parsed.success) {
      const formattedErrors = parsed.error.issues
        .map((issue) => ` - [${issue.path.join(".")}]: ${issue.message}`)
        .join("\n");
      throw new Error(`[STARTUP_ERROR] Client environment validation failed:\n${formattedErrors}`);
    }

    return parsed.data;
  }
}
