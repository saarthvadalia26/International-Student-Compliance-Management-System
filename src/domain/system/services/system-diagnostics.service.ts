import { getAdminSupabase } from "@/lib/supabase/admin";
import { StorageProviderFactory } from "@/domain/storage/factory";
import { WhatsAppIntegrationService } from "@/domain/notifications/services/whatsapp-integration.service";
import { 
  SystemInfrastructureDiagnostics, 
  RuntimeDiagnostics, 
  DeploymentDiagnostics, 
  ServicesDiagnostics,
  ServiceHealth 
} from "../types/diagnostics.types";
import pkg from "../../../../package.json";

/**
 * Timeout helper to prevent health check operations from hanging indefinitely.
 */
async function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`[TIMEOUT] ${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

export class SystemDiagnosticsService {
  /**
   * Evaluates the active runtime environment.
   */
  static getRuntimeDiagnostics(): RuntimeDiagnostics {
    const isVercel = Boolean(process.env.VERCEL);
    const platform = isVercel ? "Vercel" : "Local Environment";

    let environment = "Development";
    if (process.env.VERCEL_ENV) {
      const vEnv = process.env.VERCEL_ENV.toLowerCase();
      if (vEnv === "production") environment = "Production";
      else if (vEnv === "preview") environment = "Preview";
      else if (vEnv === "development") environment = "Development";
      else environment = process.env.VERCEL_ENV.charAt(0).toUpperCase() + process.env.VERCEL_ENV.slice(1);
    } else if (process.env.NODE_ENV === "production") {
      environment = "Production";
    }

    const region = process.env.VERCEL_REGION?.trim() || "Not available locally";
    const nodeVersion = process.version;
    const nextVersion = pkg.dependencies?.next?.replace(/[\^~]/g, "") || "16.2.10";
    const appVersion = pkg.version || "1.0.0";

    return {
      platform,
      environment,
      region,
      nodeVersion,
      nextVersion,
      appVersion
    };
  }

  /**
   * Resolves the current deployment metadata without hardcoding or inventing values.
   */
  static getDeploymentDiagnostics(): DeploymentDiagnostics {
    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID?.trim() || null;
    const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
    const shortCommitSha = commitSha ? commitSha.substring(0, 7) : null;
    const commitRef = process.env.VERCEL_GIT_COMMIT_REF?.trim() || (process.env.VERCEL ? null : "local");
    const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim() || null;
    const deployedAt = process.env.NEXT_PUBLIC_BUILD_TIME?.trim() || null;

    return {
      deploymentId,
      commitSha,
      shortCommitSha,
      commitRef,
      commitMessage,
      deployedAt
    };
  }

  /**
   * Performs real database connectivity check with timeout protection and latency tracking.
   */
  static async checkDatabaseHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const supabase = getAdminSupabase();
      // Perform a minimal, non-mutating query
      const queryPromise = supabase.from("students").select("id", { count: "exact", head: true }).limit(1);
      const res = await withTimeout(queryPromise, 4000, "Database health check");

      const latencyMs = Date.now() - start;
      if (res.error) {
        console.error(`[DIAGNOSTICS] Database health check error: ${res.error.message}`);
        return {
          name: "Database",
          providerName: "PostgreSQL / Supabase",
          status: "unhealthy",
          latencyMs,
          error: "Database query returned an error"
        };
      }

      return {
        name: "Database",
        providerName: "PostgreSQL / Supabase",
        status: "healthy",
        latencyMs
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : "Database connection failed";
      console.error(`[DIAGNOSTICS] Database health check failed: ${errorMsg}`);
      return {
        name: "Database",
        providerName: "PostgreSQL / Supabase",
        status: "unhealthy",
        latencyMs,
        error: errorMsg.includes("[TIMEOUT]") ? "Connection timed out" : "Service unavailable"
      };
    }
  }

  /**
   * Performs real Cloudflare R2 / storage health check.
   */
  static async checkStorageHealth(): Promise<ServiceHealth> {
    try {
      const provider = StorageProviderFactory.getProvider();
      const res = await provider.healthCheck();

      return {
        name: "Storage",
        providerName: res.providerName,
        status: res.status,
        latencyMs: res.latencyMs,
        error: res.error
      };
    } catch (err: unknown) {
      console.error(`[DIAGNOSTICS] Storage health check error:`, err);
      return {
        name: "Storage",
        providerName: "Cloudflare R2",
        status: "unhealthy",
        latencyMs: null,
        error: "Storage connectivity check failed"
      };
    }
  }

  /**
   * Performs WhatsApp Business API configuration check and safe reachability check if configured.
   */
  static async checkWhatsAppHealth(): Promise<ServiceHealth> {
    const integration = WhatsAppIntegrationService.getIntegrationStatus();

    if (!integration.isConfigured || integration.status === "NOT_CONFIGURED") {
      return {
        name: "WhatsApp Business API",
        providerName: "WhatsApp Business API",
        status: "not_configured",
        latencyMs: null
      };
    }

    if (integration.status === "CONFIGURED_BUT_INVALID") {
      return {
        name: "WhatsApp Business API",
        providerName: "WhatsApp Business API",
        status: "unhealthy",
        latencyMs: null,
        error: "Credentials format invalid"
      };
    }

    // Perform a safe, non-mutating reachability check
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch("https://graph.facebook.com", {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;
      return {
        name: "WhatsApp Business API",
        providerName: "WhatsApp Business API",
        status: res.status < 500 ? "configured" : "unhealthy",
        latencyMs
      };
    } catch {
      const latencyMs = Date.now() - start;
      return {
        name: "WhatsApp Business API",
        providerName: "WhatsApp Business API",
        status: "unhealthy",
        latencyMs,
        error: "Graph API endpoint unreachable"
      };
    }
  }

  /**
   * Email integration is explicitly disabled in ISCMS.
   */
  static checkEmailHealth(): ServiceHealth {
    return {
      name: "Email",
      providerName: "Email",
      status: "not_integrated",
      latencyMs: null
    };
  }

  /**
   * Evaluates Cloudflare Turnstile Bot Protection configuration.
   */
  static checkBotProtectionHealth(): ServiceHealth {
    const hasSiteKey = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
    const hasSecretKey = Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());

    const isConfigured = hasSiteKey || hasSecretKey;

    return {
      name: "Bot Protection",
      providerName: "Cloudflare Turnstile",
      status: isConfigured ? "configured" : "not_configured",
      latencyMs: null
    };
  }

  /**
   * Compiles live production diagnostics across runtime, deployment, and all infrastructure services.
   * All responses are sanitized and allowlisted. Secrets are strictly prohibited.
   */
  static async getDiagnostics(): Promise<SystemInfrastructureDiagnostics> {
    const runtime = this.getRuntimeDiagnostics();
    const deployment = this.getDeploymentDiagnostics();

    const [database, storage, whatsapp] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkStorageHealth(),
      this.checkWhatsAppHealth()
    ]);

    const email = this.checkEmailHealth();
    const botProtection = this.checkBotProtectionHealth();

    const services: ServicesDiagnostics = {
      database,
      storage,
      whatsapp,
      email,
      botProtection
    };

    return {
      runtime,
      deployment,
      services,
      checkedAt: new Date().toISOString()
    };
  }
}
