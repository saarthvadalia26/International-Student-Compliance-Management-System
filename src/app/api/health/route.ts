import { NextResponse } from "next/server";
import { SystemDiagnosticsService } from "@/domain/system/services/system-diagnostics.service";

const startTime = Date.now();

export const revalidate = 0;

export async function GET() {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  try {
    const diagnostics = await SystemDiagnosticsService.getDiagnostics();
    const isDbHealthy = diagnostics.services.database.status === "healthy" || diagnostics.services.database.status === "connected";

    const payload = {
      status: isDbHealthy ? "operational" : "degraded",
      uptime,
      timestamp: diagnostics.checkedAt,
      version: diagnostics.runtime.appVersion,
      commit: diagnostics.deployment.commitSha || "local",
      environment: diagnostics.runtime.environment,
      platform: diagnostics.runtime.platform,
      region: diagnostics.runtime.region,
      services: {
        database: diagnostics.services.database.status,
        whatsappProvider: diagnostics.services.whatsapp.status,
        emailProvider: diagnostics.services.email.status,
        botProtection: diagnostics.services.botProtection.status
      },
      system: {
        memoryUsage: process.memoryUsage().heapUsed,
        nodeVersion: diagnostics.runtime.nodeVersion,
        nextVersion: diagnostics.runtime.nextVersion
      }
    };

    const statusCode = payload.status === "operational" ? 200 : 503;

    return NextResponse.json(payload, { 
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache"
      }
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "unhealthy",
        uptime,
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Health check failure"
      },
      { status: 503 }
    );
  }
}
