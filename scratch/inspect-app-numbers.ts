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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function inspectStudentApplicationNumbers() {
  const { data: records, error } = await supabase
    .from("student_academic")
    .select(`
      student_id,
      admission_category,
      iccr_application_number,
      sii_application_number,
      created_at,
      updated_at,
      students(
        registration_number,
        student_personal(full_name)
      )
    `)
    .or("iccr_application_number.not.is.null,sii_application_number.not.is.null");

  if (error) {
    console.error("Error querying database:", error.message);
    return;
  }

  console.log(`\n=============================================================`);
  console.log(` DATABASE APPLICATION NUMBERS AUDIT`);
  console.log(`=============================================================`);
  console.log(`Total students with application numbers: ${records?.length || 0}`);
  
  let identicalCount = 0;
  let independentCount = 0;
  let onlyIccrCount = 0;
  let onlySiiCount = 0;

  for (const r of records || []) {
    const student = Array.isArray(r.students) ? r.students[0] : r.students;
    const personal = Array.isArray(student?.student_personal) ? student?.student_personal[0] : student?.student_personal;
    const isIdentical = Boolean(r.iccr_application_number && r.sii_application_number && r.iccr_application_number === r.sii_application_number);
    
    if (isIdentical) {
      identicalCount++;
    } else if (r.iccr_application_number && r.sii_application_number) {
      independentCount++;
    } else if (r.iccr_application_number) {
      onlyIccrCount++;
    } else if (r.sii_application_number) {
      onlySiiCount++;
    }

    console.log(`\nStudent: ${personal?.full_name || "Unknown"} [Reg: ${student?.registration_number || r.student_id}]`);
    console.log(`  Admission Category: ${r.admission_category}`);
    console.log(`  ICCR App No: ${r.iccr_application_number ? `"${r.iccr_application_number}"` : "NULL"}`);
    console.log(`  SII App No:  ${r.sii_application_number ? `"${r.sii_application_number}"` : "NULL"}`);
    console.log(`  Status:      ${isIdentical ? "⚠️ IDENTICAL (ICCR == SII)" : "✓ INDEPENDENT"}`);
    console.log(`  Updated At:  ${r.updated_at}`);
  }

  console.log(`\n=============================================================`);
  console.log(` AUDIT SUMMARY`);
  console.log(`=============================================================`);
  console.log(`Total records:                  ${records?.length || 0}`);
  console.log(`Identical (ICCR == SII):        ${identicalCount}`);
  console.log(`Both present & distinct:        ${independentCount}`);
  console.log(`Only ICCR populated:            ${onlyIccrCount}`);
  console.log(`Only SII populated:             ${onlySiiCount}`);
  console.log(`=============================================================\n`);
}

inspectStudentApplicationNumbers().catch(console.error);
