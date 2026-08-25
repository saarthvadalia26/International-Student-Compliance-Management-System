import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function checkAuditLogs() {
  const { data: auditTables, error } = await supabase
    .from("audit_logs")
    .select("*")
    .limit(20);

  if (error) {
    console.log("audit_logs query:", error.message);
  } else {
    console.log("audit_logs entries:", auditTables?.length);
    console.log(JSON.stringify(auditTables, null, 2));
  }
}

checkAuditLogs().catch(console.error);
