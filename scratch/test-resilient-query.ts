import * as fs from "fs";
import * as path from "path";

try {
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
} catch (e) {}

import { getAdminSupabase } from "../src/lib/supabase/admin";

async function testResilientQuery() {
  const supabase = getAdminSupabase();

  console.log("=== TESTING RESILIENT QUERY WITH student_academic(*) ===");

  const query = supabase
    .from("students")
    .select(`
      id,
      registration_number,
      status,
      created_at,
      student_personal(full_name, nationality_code),
      student_contact(email, phone_home),
      student_academic(*),
      student_snapshot(compliance_status, passport_number, visa_number)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  console.log(`Query result: count = ${data?.length || 0}, error = ${error?.message || "none"}`);

  if (data) {
    data.forEach((r: any, idx: number) => {
      const pers = r.student_personal?.[0] || r.student_personal;
      const acad = r.student_academic?.[0] || r.student_academic;
      console.log(`  [${idx + 1}] ID: ${r.id}, Name: ${pers?.full_name}, RegNo: ${r.registration_number}, Program: ${acad?.program_code}, Cat: ${acad?.admission_category}, SII_No: ${acad?.sii_application_number}`);
    });
  }
}

testResilientQuery().catch(console.error);
