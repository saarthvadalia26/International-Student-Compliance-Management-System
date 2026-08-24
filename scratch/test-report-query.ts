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

async function testReportQuery() {
  const supabase = getAdminSupabase();

  const STUDENT_FIELDS = `id, registration_number, status, created_at`;
  const SNAPSHOT_FIELDS = `student_snapshot(compliance_status, passport_number, visa_number, efrro_number)`;
  const PERSONAL_FIELDS = `student_personal(full_name, nationality_code, gender)`;
  const ACADEMIC_FIELDS = `student_academic(program_id, program_code, override_school_id, school_override_reason, admission_category, iccr_application_number, sii_application_number, expected_graduation)`;
  const CONTACT_FIELDS = `student_contact(email, phone_home, phone_local)`;

  const res = await supabase
    .from("students")
    .select(`
      ${STUDENT_FIELDS},
      ${SNAPSHOT_FIELDS},
      ${PERSONAL_FIELDS},
      ${ACADEMIC_FIELDS},
      ${CONTACT_FIELDS}
    `, { count: "exact" })
    .is("deleted_at", null);

  console.log("Direct report query error:", res.error);
  console.log("Direct report query data count:", res.data?.length);
}

testReportQuery().catch(console.error);
