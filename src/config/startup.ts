import { validateEnvironment } from "./env";

let isInitialized = false;

/**
 * Initialize application-wide runtime configurations and validate system variables.
 */
export function initializeStartup(): void {
  if (isInitialized) return;

  try {
    console.log("[STARTUP] Checking environment configuration matrices...");
    validateEnvironment();
    console.log("[STARTUP] Environment configurations successfully verified.");
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
