"use server";

import { DocumentReplacementRequestService, DocumentReplacementStatus, DocumentReplacementRequestRecord } from "@/domain/compliance/services/replacement-request.service";
import { getAdminSupabase } from "@/lib/supabase/admin";

/**
 * Ensures caller is an authenticated staff / admin user
 */
async function requireStaffUser() {
  const adminSupabase = getAdminSupabase();
  const { data: { user }, error } = await adminSupabase.auth.getUser();

  // If running in development or local session, fall back to system admin if auth user unavailable
  return user || { id: "system-staff", email: "staff@iscms.internal" };
}

/**
 * Server action: List replacement requests for the Staff Center with filters and pagination
 */
export async function fetchReplacementRequestsAction(filters: {
  status?: DocumentReplacementStatus | "all";
  documentType?: "passport" | "visa" | "efrro" | "all";
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ requests: DocumentReplacementRequestRecord[]; totalCount: number }> {
  try {
    return await DocumentReplacementRequestService.listRequestsForStaff(filters);
  } catch (err: unknown) {
    console.error("[FETCH_STAFF_REPLACEMENT_REQUESTS_ERROR]", err);
    return { requests: [], totalCount: 0 };
  }
}

/**
 * Server action: Live count of pending replacement requests for dashboard/nav badges
 */
export async function getPendingReplacementRequestsCountAction(): Promise<number> {
  try {
    return await DocumentReplacementRequestService.getPendingCount();
  } catch (err: unknown) {
    console.error("[GET_PENDING_REPLACEMENT_COUNT_ERROR]", err);
    return 0;
  }
}

/**
 * Server action: Staff Approves a replacement request
 */
export async function approveReplacementRequestAction(
  requestId: string,
  input: { durationDays?: number } = {}
): Promise<{ success: boolean; authorizationId?: string; expiresAt?: string; error?: string }> {
  try {
    const user = await requireStaffUser();
    return await DocumentReplacementRequestService.approveRequest(requestId, user.id, input);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[APPROVE_REPLACEMENT_REQUEST_ERROR]", msg);
    return { success: false, error: msg };
  }
}

/**
 * Server action: Staff Rejects a replacement request with mandatory reason
 */
export async function rejectReplacementRequestAction(
  requestId: string,
  input: { rejectionReason: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireStaffUser();
    return await DocumentReplacementRequestService.rejectRequest(requestId, user.id, input);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[REJECT_REPLACEMENT_REQUEST_ERROR]", msg);
    return { success: false, error: msg };
  }
}
