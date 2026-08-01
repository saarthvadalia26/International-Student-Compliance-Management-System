import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { USER_ROLES } from "@/lib/auth/permissions";
import { auditService } from "@/lib/audit/audit.service";

/**
 * GET /api/setup/initial-admin
 * Checks whether an initial Administrator account is required.
 */
export async function GET() {
  try {
    const admin = getAdminSupabase();
    const { data: { users }, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const adminCount = users.filter((u) => {
      const role = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      return role === USER_ROLES.ADMINISTRATOR || role === "admin";
    }).length;

    return NextResponse.json({
      initialAdminRequired: adminCount === 0,
      existingAdminCount: adminCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/setup/initial-admin
 * Creates the initial Administrator account if no Administrator exists.
 * Returns 403 Forbidden if an Administrator already exists.
 */
export async function POST(req: Request) {
  try {
    const admin = getAdminSupabase();
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const adminCount = users.filter((u) => {
      const role = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      return role === USER_ROLES.ADMINISTRATOR || role === "admin";
    }).length;

    // Permanently disable initial setup if an Administrator already exists
    if (adminCount > 0) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Initial Administrator setup has already been completed. Creation of additional initial administrators is permanently disabled.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, fullName } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Create the initial Administrator account
    const { data: { user }, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: USER_ROLES.ADMINISTRATOR,
        full_name: fullName,
      },
    });

    if (createError || !user) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create administrator user." },
        { status: 400 }
      );
    }

    // Extract IP address for audit log
    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

    // Write audit log entry
    await auditService.logInitialAdminSetup({
      adminId: user.id,
      adminEmail: user.email ?? email,
      ipAddress,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Initial Administrator account created successfully.",
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
