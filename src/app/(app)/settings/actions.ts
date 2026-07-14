"use server";

import { retentionService } from "@/domain/retention/services/retention.service";
import { RetentionPolicy, CleanupExecutionReport } from "@/domain/retention/types";

export async function fetchRetentionPolicies(): Promise<RetentionPolicy[]> {
  return retentionService.getPolicies();
}

export async function updateRetentionPolicyAction(policy: Partial<RetentionPolicy> & { id: string }): Promise<void> {
  return retentionService.updatePolicy(policy);
}

export async function runDocumentCleanupAction(dryRun: boolean, performedBy: string): Promise<CleanupExecutionReport> {
  return retentionService.executeCleanupLifecycle(dryRun, performedBy);
}
