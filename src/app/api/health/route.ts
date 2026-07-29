import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

const startTime = Date.now();

export async function GET() {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  let dbStatus = "unknown";
  try {
    const supabase = await getServerSupabase();
    const { error } = await supabase.from("students").select("id").limit(1);
    dbStatus = error ? "unhealthy" : "healthy";
  } catch (err) {
    dbStatus = "unhealthy";
  }

  const payload = {
    status: dbStatus === "healthy" ? "operational" : "degraded",
    uptime,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    services: {
      database: dbStatus,
      storage: "unknown", // To be implemented with storage ping
      emailProvider: "unknown",
      whatsappProvider: "unknown",
      scheduler: "unknown"
    },
    system: {
      memoryUsage: process.memoryUsage().heapUsed,
      nodeVersion: process.version,
    }
  };

  const statusCode = payload.status === "operational" ? 200 : 503;

  return NextResponse.json(payload, { status: statusCode });
}
