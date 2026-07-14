import { validateEnvironment } from "./env";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { NOTIFICATION_TABLE_NAME, isTableNotFoundError } from "@/domain/notifications/config";

let isInitialized = false;

/**
 * Background check to verify if the notifications table is deployed.
 */
async function verifyNotificationTableExists(): Promise<void> {
  try {
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from(NOTIFICATION_TABLE_NAME)
      .select("id")
      .limit(1);

    if (error && isTableNotFoundError(error)) {
      console.warn("=========================================================================");
      console.warn(`[STARTUP_WARNING] Table '${NOTIFICATION_TABLE_NAME}' does not exist in database.`);
      console.warn("Please run and apply migration '006_notifications.sql' to deploy the table.");
      console.warn("=========================================================================");
    }
  } catch (err) {
    console.warn(`[STARTUP_WARNING] Failed validating '${NOTIFICATION_TABLE_NAME}' table deployment:`, err);
  }
}

/**
 * Initialize application-wide runtime configurations and validate system variables.
 */
export function initializeStartup(): void {
  if (isInitialized) return;

  try {
    console.log("[STARTUP] Checking environment configuration matrices...");
    validateEnvironment();
    console.log("[STARTUP] Environment configurations successfully verified.");
    
    // Verify notifications table deployment asynchronously (non-blocking)
    verifyNotificationTableExists();
    
    isInitialized = true;
  } catch (error) {
    console.error("=========================================================================");
    console.error("[FATAL] APPLICATION STARTUP BLOCKED DUE TO CONFIGURATION MISMATCH");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    console.error("=========================================================================");
    
    // Only throw the error during development mode to prevent halting production compilation builds
    if (process.env.NODE_ENV === "development") {
      throw error;
    }
  }
}
