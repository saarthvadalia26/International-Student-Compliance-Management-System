import * as fs from "fs";
import * as path from "path";

// Load .env.local if present
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
} catch (e) {
  console.warn("Could not load .env.local", e);
}

import { getAdminSupabase } from "../src/lib/supabase/admin";
import { SupabaseReportRepository } from "../src/domain/reports/repositories/report.repository";
import { getStudentsListAction } from "../src/app/(app)/students/actions";

async function diagnose() {
  console.log("=================================================================");
  console.log(" ISCMS DATA DIAGNOSIS: DASHBOARD VS STUDENT LIST");
  console.log("=================================================================\n");

  const supabase = getAdminSupabase();

  // 1. Check raw counts in each table
  console.log("[1] Raw Table Counts:");
  const tables = ["students", "student_personal", "student_contact", "student_academic", "student_snapshot"];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    console.log(`  Table '${table}': count = ${count}, error = ${error?.message || "none"}`);
  }

  // 2. Query Dashboard Metrics
  console.log("\n[2] Dashboard Metrics Query (SupabaseReportRepository.getDashboardMetrics):");
  try {
    const repo = new SupabaseReportRepository();
    const metrics = await repo.getDashboardMetrics();
    console.log("  Dashboard metrics:", JSON.stringify(metrics, null, 2));
  } catch (err: any) {
    console.error("  Dashboard metrics error:", err.message);
  }

  // 3. Query students table directly with select
  console.log("\n[3] Raw Students Query (supabase.from('students').select('*')):");
  const rawStudents = await supabase.from("students").select("id, registration_number, status, deleted_at, created_at");
  console.log(`  Returned ${rawStudents.data?.length || 0} rows. Error: ${rawStudents.error?.message || "none"}`);
  if (rawStudents.data) {
    rawStudents.data.forEach((s, idx) => {
      console.log(`  [${idx + 1}] ID: ${s.id}, RegNo: ${s.registration_number}, Status: ${s.status}, DeletedAt: ${s.deleted_at}`);
    });
  }

  // 4. Query getStudentsListAction()
  console.log("\n[4] Student List Action Query (getStudentsListAction):");
  try {
    const res = await getStudentsListAction();
    console.log(`  getStudentsListAction result: success = ${res.success}, students count = ${res.students?.length}, error = ${res.error || "none"}`);
    if (res.students && res.students.length > 0) {
      res.students.forEach((s, idx) => {
        console.log(`  [${idx + 1}] Name: ${s.fullName}, RegNo: ${s.registrationNumber}, School: ${s.school}, Program: ${s.programName}`);
      });
    }
  } catch (err: any) {
    console.error("  getStudentsListAction threw error:", err);
  }

  // 5. Test individual joins in getStudentsListAction query
  console.log("\n[5] Detailed Join Isolation Test for getStudentsListAction:");
  const testQuery1 = await supabase
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
  console.log(`  Full nested select: count = ${testQuery1.data?.length || 0}, error = ${testQuery1.error?.message || "none"}`);
  if (testQuery1.error) {
    console.log("  Full error details:", JSON.stringify(testQuery1.error, null, 2));
  }

  console.log("\n=================================================================\n");
}

diagnose().catch(err => {
  console.error("Fatal error running diagnosis:", err);
  process.exit(1);
});
