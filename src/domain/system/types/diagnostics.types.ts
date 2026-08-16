/**
 * System Infrastructure & Environment Diagnostics Types
 */

export type ServiceHealthStatus = 
  | "healthy" 
  | "unhealthy" 
  | "not_configured" 
  | "not_integrated" 
  | "unavailable" 
  | "configured";

export interface ServiceHealth {
  name: string;
  providerName: string;
  status: ServiceHealthStatus;
  latencyMs: number | null;
  error?: string;
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
  storage: ServiceHealth;
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
