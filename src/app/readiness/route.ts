import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getAdminSupabase();
  const start = Date.now();
  
  try {
    const { error } = await supabase.from("students").select("id").limit(1);
    if (error) throw error;
    
    return NextResponse.json({
      status: "ready",
      database: "connected",
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "unready", error: errMsg, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
