import { 
  SystemInfrastructureDiagnostics, 
  RuntimeDiagnostics, 
  DeploymentDiagnostics, 
  ServicesDiagnostics,
  ServiceHealth,
  SystemHealthApiResponse
} from "../types/diagnostics.types";
import { APP_VERSION } from "@/config/version";
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

// In-memory diagnostics cache for short TTL to prevent redundant expensive checks
interface CachedDiagnostics {
  data: SystemInfrastructureDiagnostics;
  cachedAt: number;
}

const CACHE_TTL_MS = 20000; // 20 seconds cache TTL
let memoryCache: CachedDiagnostics | null = null;

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

    const region = process.env.VERCEL_REGION?.trim() || "Not available";
    const nodeVersion = process.version;
    const nextVersion = pkg.dependencies?.next?.replace(/[\^~]/g, "") || "16.2.10";
    const appVersion = APP_VERSION;

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const checkedAt = new Date().toISOString();

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        name: "Database",
        providerName: "PostgreSQL / Supabase",
        status: "not_configured",
        latencyMs: null,
        checkedAt,
        error: "Supabase connection credentials not configured"
      };
    }

    const start = Date.now();
    try {
      const { getAdminSupabase } = await import("@/lib/supabase/admin");
      const supabase = getAdminSupabase();
      // Perform a minimal, safe query
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
          checkedAt,
          error: "Database query returned an error"
        };
      }

      return {
        name: "Database",
        providerName: "PostgreSQL / Supabase",
        status: "connected",
        latencyMs,
        checkedAt
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
        checkedAt,
        error: errorMsg.includes("[TIMEOUT]") ? "Connection timed out" : "Service unavailable"
      };
    }
  }

  /**
   * Performs WhatsApp Business API configuration check and safe reachability check if configured.
   */
  static async checkWhatsAppHealth(): Promise<ServiceHealth> {
    const checkedAt = new Date().toISOString();
    const { WhatsAppIntegrationService } = await import("@/domain/notifications/services/whatsapp-integration.service");
    const integration = WhatsAppIntegrationService.getIntegrationStatus();

    if (!integration.isConfigured || integration.status === "NOT_CONFIGURED") {
      return {
        name: "WhatsApp Business API",
        providerName: "Meta WhatsApp Business Platform",
        status: "not_configured",
        latencyMs: null,
        checkedAt,
        message: "WhatsApp Business API credentials have not been configured."
      };
    }

    if (integration.status === "CONFIGURED_BUT_INVALID") {
      return {
        name: "WhatsApp Business API",
        providerName: "Meta WhatsApp Business Platform",
        status: "unhealthy",
        latencyMs: null,
        checkedAt,
        message: "WhatsApp Business API credentials appear invalid or incomplete.",
        error: "Credentials format invalid"
      };
    }

    // Perform safe reachability check if configured
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
      const isOk = res.status < 500;
      return {
        name: "WhatsApp Business API",
        providerName: "Meta WhatsApp Business Platform",
        status: isOk ? "connected" : "unhealthy",
        latencyMs,
        checkedAt,
        message: isOk ? "WhatsApp Business API is configured and operational." : "Graph API returned an error status.",
        error: isOk ? undefined : `Graph API returned status ${res.status}`
      };
    } catch {
      const latencyMs = Date.now() - start;
      return {
        name: "WhatsApp Business API",
        providerName: "Meta WhatsApp Business Platform",
        status: "unhealthy",
        latencyMs,
        checkedAt,
        message: "Unable to reach Meta Graph API endpoint.",
        error: "Graph API endpoint unreachable"
      };
    }
  }

  /**
   * Email integration is explicitly not configured in ISCMS.
   */
  static checkEmailHealth(): ServiceHealth {
    return {
      name: "Email Service",
      providerName: "Email Service",
      status: "not_configured",
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      message: "Email service is not configured."
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
      latencyMs: null,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Compiles live production diagnostics across runtime, deployment, and active infrastructure services.
   * All responses are sanitized and allowlisted. Secrets are strictly prohibited.
   */
  static async getDiagnostics(forceRefresh: boolean = false): Promise<SystemInfrastructureDiagnostics> {
    const now = Date.now();
    if (!forceRefresh && memoryCache && (now - memoryCache.cachedAt) < CACHE_TTL_MS) {
      return memoryCache.data;
    }

    const runtime = this.getRuntimeDiagnostics();
    const deployment = this.getDeploymentDiagnostics();

    const [database, whatsapp] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkWhatsAppHealth()
    ]);

    const email = this.checkEmailHealth();
    const botProtection = this.checkBotProtectionHealth();

    const services: ServicesDiagnostics = {
      database,
      whatsapp,
      email,
      botProtection
    };

    const diagnostics: SystemInfrastructureDiagnostics = {
      runtime,
      deployment,
      services,
      checkedAt: new Date().toISOString()
    };

    memoryCache = {
      data: diagnostics,
      cachedAt: now
    };

    return diagnostics;
  }

  /**
   * Generates the authoritative API payload for /api/admin/system-health.
   */
  static async getSystemHealthApiResponse(forceRefresh: boolean = false): Promise<SystemHealthApiResponse> {
    const diag = await this.getDiagnostics(forceRefresh);

    const dbStatus = diag.services.database.status === "connected" || diag.services.database.status === "healthy"
      ? "connected"
      : diag.services.database.status === "not_configured"
        ? "not_configured"
        : "unhealthy";

    const waStatus = diag.services.whatsapp.status === "connected" || diag.services.whatsapp.status === "healthy" || diag.services.whatsapp.status === "configured"
      ? "connected"
      : diag.services.whatsapp.status === "not_configured"
        ? "not_configured"
        : diag.services.whatsapp.status === "disabled"
          ? "disabled"
          : "unhealthy";

    return {
      environment: {
        name: diag.runtime.environment.toLowerCase(),
        deploymentPlatform: diag.runtime.platform,
        version: diag.runtime.appVersion,
        commit: diag.deployment.commitSha || "local",
        nodeVersion: diag.runtime.nodeVersion,
        nextVersion: diag.runtime.nextVersion,
        region: diag.runtime.region
      },
      database: {
        status: dbStatus,
        latencyMs: diag.services.database.latencyMs,
        checkedAt: diag.services.database.checkedAt || diag.checkedAt,
        error: diag.services.database.error
      },
      whatsapp: {
        provider: "meta-whatsapp-business-platform",
        status: waStatus,
        checkedAt: diag.services.whatsapp.checkedAt || diag.checkedAt,
        message: diag.services.whatsapp.message,
        error: diag.services.whatsapp.error
      },
      email: {
        status: "not_configured",
        checkedAt: diag.services.email.checkedAt || diag.checkedAt,
        message: diag.services.email.message || "Email service is not configured."
      },
      botProtection: {
        provider: "cloudflare-turnstile",
        status: diag.services.botProtection?.status === "configured" ? "configured" : "not_configured",
        checkedAt: diag.services.botProtection?.checkedAt || diag.checkedAt
      }
    };
  }
}
