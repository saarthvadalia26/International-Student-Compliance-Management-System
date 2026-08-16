import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdministrator } from "@/lib/auth/permissions";
import { SystemDiagnosticsService } from "@/domain/system/services/system-diagnostics.service";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator session required." },
        { status: 401 }
      );
    }

    try {
      requireAdministrator(user);
    } catch {
      return NextResponse.json(
        { error: "Forbidden. Administrator privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true" || searchParams.get("force") === "true";

    const payload = await SystemDiagnosticsService.getSystemHealthApiResponse(forceRefresh);

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error: unknown) {
    console.error("[API_ADMIN_SYSTEM_HEALTH_ERROR]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal system health diagnostics error"
      },
      { status: 500 }
    );
  }
}
