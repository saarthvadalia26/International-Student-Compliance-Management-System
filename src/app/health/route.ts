import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { NotificationProviderFactory } from "@/domain/notifications/services/provider-factory";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getAdminSupabase();
  const timestamp = new Date().toISOString();
  
  // 1. Check Database Connectivity
  let databaseStatus = "unhealthy";
  let dbLatency = 0;
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from("students").select("id").limit(1);
    if (!error) {
      databaseStatus = "healthy";
    }
    dbLatency = Date.now() - dbStart;
  } catch (err) {
    databaseStatus = "unhealthy";
  }

  // 2. Check Storage Connectivity
  let storageStatus = "unhealthy";
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (!error && data) {
      storageStatus = "healthy";
    }
  } catch (err) {
    storageStatus = "unhealthy";
  }

  // 3. Check Email Provider Health
  let emailStatus = "unhealthy";
  let emailMetrics = null;
  try {
    const emailProvider = NotificationProviderFactory.getEmailProvider();
    emailMetrics = await emailProvider.healthCheck();
    emailStatus = emailMetrics.status;
  } catch (err) {
    emailStatus = "unhealthy";
  }

  // 4. Check WhatsApp Provider Health
  let whatsappStatus = "unhealthy";
  let whatsappMetrics = null;
  try {
    const whatsappProvider = NotificationProviderFactory.getWhatsAppProvider();
    whatsappMetrics = await whatsappProvider.healthCheck();
    whatsappStatus = whatsappMetrics.status;
  } catch (err) {
    whatsappStatus = "unhealthy";
  }

  const isHealthy = 
    databaseStatus === "healthy" && 
    storageStatus === "healthy" && 
    emailStatus === "healthy" && 
    whatsappStatus === "healthy";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp,
      environment: process.env.NODE_ENV || "development",
      services: {
        database: {
          status: databaseStatus,
          latencyMs: dbLatency
        },
        storage: {
          status: storageStatus
        },
        emailProvider: {
          status: emailStatus,
          details: emailMetrics
        },
        whatsappProvider: {
          status: whatsappStatus,
          details: whatsappMetrics
        }
      }
    },
    { status: isHealthy ? 200 : 503 }
  );
}
