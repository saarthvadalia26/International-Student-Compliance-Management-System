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

async function compareQueries() {
  const supabase = getAdminSupabase();

  console.log("=== COMPARING QUERIES ===");

  // Query A: with iccr_application_number
  console.log("\n[Query A: with iccr_application_number]");
  const qA = await supabase
    .from("students")
    .select(`
      id,
      registration_number,
      status,
      created_at,
      student_personal(full_name, nationality_code),
      student_contact(email, phone_home),
      student_academic(program_id, program_code, academic_status, override_school_id, school_override_reason, admission_category, iccr_application_number, sii_application_number),
      student_snapshot(compliance_status, passport_number, visa_number)
    `)
    .is("deleted_at", null);
  console.log(`  Query A: data count = ${qA.data?.length}, error =`, qA.error);

  // Query B: with student_academic(*)
  console.log("\n[Query B: with student_academic(*)]");
  const qB = await supabase
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
    .is("deleted_at", null);
  console.log(`  Query B: data count = ${qB.data?.length}, error =`, qB.error);

  // Query C: without iccr_application_number
  console.log("\n[Query C: without iccr_application_number]");
  const qC = await supabase
    .from("students")
    .select(`
      id,
      registration_number,
      status,
      created_at,
      student_personal(full_name, nationality_code),
      student_contact(email, phone_home),
      student_academic(program_id, program_code, academic_status, override_school_id, school_override_reason, admission_category, sii_application_number),
      student_snapshot(compliance_status, passport_number, visa_number)
    `)
    .is("deleted_at", null);
  console.log(`  Query C: data count = ${qC.data?.length}, error =`, qC.error);
}

compareQueries().catch(console.error);
