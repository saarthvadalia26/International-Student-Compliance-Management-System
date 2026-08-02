import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { USER_ROLES } from "@/lib/auth/permissions";
import { auditService } from "@/lib/audit/audit.service";
import { systemConfigService } from "@/lib/system-config";

/**
 * GET /api/setup/initial-admin
 * Returns system initialization status.
 */
export async function GET() {
  try {
    const state = await systemConfigService.checkInitializationState();
    return NextResponse.json({
      initialAdminRequired: !state.isInitialized,
      isInitialized: state.isInitialized,
      existingAdminCount: state.adminCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/setup/initial-admin
 * Executes the One-Time Initial Setup Wizard payload:
 * 1. Validates system initialization status (permanently returns 403 if already initialized).
 * 2. Creates the root Administrator account.
 * 3. Saves University Information & System Preferences to `system_config`.
 * 4. Marks the system as initialized.
 * 5. Writes complete audit log entry.
 */
export async function POST(req: Request) {
  try {
    const state = await systemConfigService.checkInitializationState();

    // Permanently disable initial setup if system is already initialized or admin exists
    if (state.isInitialized) {
      return NextResponse.json(
        {
          error:
            "Forbidden: The One-Time Initial Setup Wizard has already been completed. Further initial setup attempts are permanently disabled.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { admin, university, preferences } = body;

    if (!admin?.email || !admin?.password || !admin?.fullName) {
      return NextResponse.json(
        { error: "Administrator email, password, and full name are required." },
        { status: 400 }
      );
    }

    if (admin.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminSupabase();

    // 1. Create root Administrator account
    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true,
      user_metadata: {
        role: USER_ROLES.ADMINISTRATOR,
        full_name: admin.fullName,
      },
    });

    if (createError || !user) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create administrator account." },
        { status: 400 }
      );
    }

    // 2. Save University Metadata & System Preferences to system_config table
    const universityConfig = {
      universityName: university?.universityName || "National Forensic Sciences University",
      shortName: university?.shortName || "NFSU",
      timezone: university?.timezone || "Asia/Kolkata",
      defaultLanguage: university?.defaultLanguage || "en",
      academicYear: university?.academicYear || "2026-2027",
      logoUrl: university?.logoUrl || undefined,
    };

    const preferencesConfig = {
      reminderSchedule: preferences?.reminderSchedule || "30,15,7,1",
      sessionTimeoutMinutes: Number(preferences?.sessionTimeoutMinutes) || 60,
      maxUploadSizeBytes: Number(preferences?.maxUploadSizeBytes) || 10485760, // 10 MB
      dateFormat: preferences?.dateFormat || "DD/MM/YYYY",
      enableAuditLogging: preferences?.enableAuditLogging ?? true,
      enableMaintenanceNotifications: preferences?.enableMaintenanceNotifications ?? true,
    };

    await systemConfigService.saveInitializationPayload({
      adminEmail: user.email ?? admin.email,
      university: universityConfig,
      preferences: preferencesConfig,
    });

    // Extract request headers for audit logging
    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    // 3. Write comprehensive audit log
    await auditService.logInitialAdminSetup({
      adminId: user.id,
      adminEmail: user.email ?? admin.email,
      ipAddress,
    });

    await auditService.logConfigChange({
      userId: user.id,
      userEmail: user.email ?? admin.email,
      setting: "INITIAL_SETUP_WIZARD_COMPLETED",
      previousValue: "uninitialized",
      newValue: "initialized",
    });

    return NextResponse.json(
      {
        success: true,
        message: "One-Time Initial Setup Wizard completed successfully.",
        user: {
          id: user.id,
          email: user.email,
          role: USER_ROLES.ADMINISTRATOR,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
