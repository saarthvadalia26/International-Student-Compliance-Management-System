"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { retentionService } from "@/domain/retention/services/retention.service";
import { RetentionPolicy, CleanupExecutionReport } from "@/domain/retention/types";

async function verifyAuth() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

export async function fetchRetentionPolicies(): Promise<RetentionPolicy[]> {
  await verifyAuth();
  return retentionService.getPolicies();
}

export async function updateRetentionPolicyAction(policy: Partial<RetentionPolicy> & { id: string }): Promise<void> {
  await verifyAuth();
  return retentionService.updatePolicy(policy);
}

export async function runDocumentCleanupAction(dryRun: boolean, performedBy: string): Promise<CleanupExecutionReport> {
  await verifyAuth();
  return retentionService.executeCleanupLifecycle(dryRun, performedBy);
}
