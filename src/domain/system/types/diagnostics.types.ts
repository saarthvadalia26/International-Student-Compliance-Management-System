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
  bucket?: string;
  objectCount?: number;
  approximateStorageBytes?: number;
  checkedAt?: string;
}

export interface StorageServiceHealth extends ServiceHealth {
  bucket: string;
  objectCount: number;
  approximateStorageBytes: number;
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
  storage: StorageServiceHealth;
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
  storage: {
    provider: string;
    status: "connected" | "unhealthy" | "not_configured";
    bucket: string;
    checkedAt: string;
    objectCount?: number;
    approximateStorageBytes?: number;
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
