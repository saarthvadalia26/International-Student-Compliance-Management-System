/**
 * System Infrastructure & Environment Diagnostics Types
 */

export type ServiceHealthStatus = 
  | "connected"
  | "healthy" 
  | "unhealthy" 
  | "not_configured" 
  | "not_integrated" 
  | "disabled"
  | "unavailable" 
  | "configured";

export interface ServiceHealth {
  name: string;
  providerName: string;
  status: ServiceHealthStatus;
  latencyMs: number | null;
  message?: string;
  error?: string;
  checkedAt?: string;
}

export interface RuntimeDiagnostics {
  platform: string;
  environment: string;
  region: string;
  nodeVersion: string;
  nextVersion: string;
  appVersion: string;
}

export interface DeploymentDiagnostics {
  deploymentId: string | null;
  commitSha: string | null;
  shortCommitSha: string | null;
  commitRef: string | null;
  commitMessage: string | null;
  deployedAt: string | null;
}

export interface ServicesDiagnostics {
  database: ServiceHealth;
  whatsapp: ServiceHealth;
  email: ServiceHealth;
  botProtection: ServiceHealth;
}

export interface SystemInfrastructureDiagnostics {
  runtime: RuntimeDiagnostics;
  deployment: DeploymentDiagnostics;
  services: ServicesDiagnostics;
  checkedAt: string;
}

export interface SystemHealthApiResponse {
  environment: {
    name: string;
    deploymentPlatform: string;
    version: string;
    commit: string;
    nodeVersion: string;
    nextVersion: string;
    region: string;
  };
  database: {
    status: "connected" | "unhealthy" | "not_configured";
    latencyMs?: number | null;
    checkedAt: string;
    error?: string;
  };
  whatsapp: {
    provider: string;
    status: "not_configured" | "connected" | "unhealthy" | "disabled";
    checkedAt: string;
    message?: string;
    error?: string;
  };
  email: {
    status: "not_configured" | "disabled" | "connected" | "unhealthy";
    checkedAt: string;
    message?: string;
    error?: string;
  };
  botProtection?: {
    provider: string;
    status: "configured" | "not_configured";
    checkedAt: string;
  };
}
