import { NextResponse } from "next/server";
import { SystemDiagnosticsService } from "@/domain/system/services/system-diagnostics.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const diagnostics = await SystemDiagnosticsService.getDiagnostics();
    const isDbConnected = diagnostics.services.database.status === "connected" || diagnostics.services.database.status === "healthy";
    const isStorageConnected = diagnostics.services.storage.status === "connected" || diagnostics.services.storage.status === "healthy";

    const isHealthy = isDbConnected && (isStorageConnected || diagnostics.services.storage.status === "not_configured");

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "unhealthy",
        timestamp: diagnostics.checkedAt,
        environment: diagnostics.runtime.environment.toLowerCase(),
        services: {
          database: {
            status: diagnostics.services.database.status,
            latencyMs: diagnostics.services.database.latencyMs
          },
          storage: {
            provider: diagnostics.services.storage.providerName,
            status: diagnostics.services.storage.status,
            bucket: diagnostics.services.storage.bucket
          },
          whatsappProvider: {
            status: diagnostics.services.whatsapp.status,
            message: diagnostics.services.whatsapp.message
          },
          emailProvider: {
            status: diagnostics.services.email.status,
            message: diagnostics.services.email.message
          }
        }
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : "Health check failure"
      },
      { status: 503 }
    );
  }
}
