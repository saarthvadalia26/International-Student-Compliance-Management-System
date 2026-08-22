"use server";

import { StudentPortalService } from "@/domain/student-portal/services/student-portal.service";
import { getRequestOrigin } from "@/config/app-url";

const portalService = new StudentPortalService();

export async function verifyTokenAndGetRedirect(
  rawToken: string, 
  baseUrl?: string | null
): Promise<{
  success: boolean;
  link?: string;
  tokenHash?: string;
  email?: string;
  targetPath?: string;
  error?: string;
}> {
  try {
    console.log(`[UPLOAD_TOKEN_ACTION] Processing verification request for token: ${rawToken.substring(0, 8)}...`);
    const resolvedBaseUrl = await getRequestOrigin(baseUrl);
    const result = await portalService.verifyAndGenerateLoginLink(rawToken, resolvedBaseUrl);
    return {
      success: true,
      link: result.actionLink,
      tokenHash: result.tokenHash,
      email: result.email,
      targetPath: result.targetPath
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[UPLOAD_TOKEN_ACTION_ERROR] Verification failed:`, msg);
    return { success: false, error: msg };
  }
}
