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
