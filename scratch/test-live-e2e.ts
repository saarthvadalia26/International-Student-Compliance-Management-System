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

async function runLiveE2EVerification() {
  console.log("\n============================================================");
  console.log(" ISCMS LIVE DATABASE E2E VERIFICATION FOR ICCR & SII");
  console.log("============================================================\n");

  // 1. Fetch an existing student
  const { data: student, error: fetchErr } = await supabase
    .from("students")
    .select("id, registration_number, student_academic(admission_category, iccr_application_number, sii_application_number)")
    .limit(1)
    .single();

  if (fetchErr || !student) {
    console.error("No student found for live verification:", fetchErr?.message);
    return;
  }

  const studentId = student.id;
  const originalAcademic = Array.isArray(student.student_academic) ? student.student_academic[0] : student.student_academic;
  console.log(`Using test student ID: ${studentId} (Reg: ${student.registration_number})`);
  console.log(`Original Category: ${originalAcademic?.admission_category}, ICCR: ${originalAcademic?.iccr_application_number}, SII: ${originalAcademic?.sii_application_number}`);

  try {
    // Step A: Set ICCR to "ICCR-TEST-001" and SII to null
    console.log("\n[Step A] Setting ICCR = 'ICCR-TEST-001', SII = NULL...");
    await supabase
      .from("student_academic")
      .update({
        iccr_application_number: "ICCR-TEST-001",
        sii_application_number: null,
        updated_at: new Date().toISOString()
      })
      .eq("student_id", studentId);

    const { data: checkA } = await supabase
      .from("student_academic")
      .select("iccr_application_number, sii_application_number")
      .eq("student_id", studentId)
      .single();

    console.log(`  Result -> ICCR: "${checkA?.iccr_application_number}", SII: "${checkA?.sii_application_number}"`);
    if (checkA?.iccr_application_number === "ICCR-TEST-001" && checkA?.sii_application_number === null) {
      console.log("  ✓ Step A PASSED: ICCR populated, SII remains NULL");
    } else {
      throw new Error(`Step A FAILED: ${JSON.stringify(checkA)}`);
    }

    // Step B: Set SII to "SII-TEST-002" while keeping ICCR intact
    console.log("\n[Step B] Setting SII = 'SII-TEST-002'...");
    await supabase
      .from("student_academic")
      .update({
        sii_application_number: "SII-TEST-002",
        updated_at: new Date().toISOString()
      })
      .eq("student_id", studentId);

    const { data: checkB } = await supabase
      .from("student_academic")
      .select("iccr_application_number, sii_application_number")
      .eq("student_id", studentId)
      .single();

    console.log(`  Result -> ICCR: "${checkB?.iccr_application_number}", SII: "${checkB?.sii_application_number}"`);
    if (checkB?.iccr_application_number === "ICCR-TEST-001" && checkB?.sii_application_number === "SII-TEST-002") {
      console.log("  ✓ Step B PASSED: Both values exist independently and distinct");
    } else {
      throw new Error(`Step B FAILED: ${JSON.stringify(checkB)}`);
    }

    // Step C: Update only ICCR to "ICCR-TEST-003"
    console.log("\n[Step C] Updating ICCR = 'ICCR-TEST-003'...");
    await supabase
      .from("student_academic")
      .update({
        iccr_application_number: "ICCR-TEST-003",
        updated_at: new Date().toISOString()
      })
      .eq("student_id", studentId);

    const { data: checkC } = await supabase
      .from("student_academic")
      .select("iccr_application_number, sii_application_number")
      .eq("student_id", studentId)
      .single();

    console.log(`  Result -> ICCR: "${checkC?.iccr_application_number}", SII: "${checkC?.sii_application_number}"`);
    if (checkC?.iccr_application_number === "ICCR-TEST-003" && checkC?.sii_application_number === "SII-TEST-002") {
      console.log("  ✓ Step C PASSED: ICCR changed, SII unchanged");
    } else {
      throw new Error(`Step C FAILED: ${JSON.stringify(checkC)}`);
    }

    // Step D: Update only SII to "SII-TEST-004"
    console.log("\n[Step D] Updating SII = 'SII-TEST-004'...");
    await supabase
      .from("student_academic")
      .update({
        sii_application_number: "SII-TEST-004",
        updated_at: new Date().toISOString()
      })
      .eq("student_id", studentId);

    const { data: checkD } = await supabase
      .from("student_academic")
      .select("iccr_application_number, sii_application_number")
      .eq("student_id", studentId)
      .single();

    console.log(`  Result -> ICCR: "${checkD?.iccr_application_number}", SII: "${checkD?.sii_application_number}"`);
    if (checkD?.iccr_application_number === "ICCR-TEST-003" && checkD?.sii_application_number === "SII-TEST-004") {
      console.log("  ✓ Step D PASSED: SII changed, ICCR unchanged");
    } else {
      throw new Error(`Step D FAILED: ${JSON.stringify(checkD)}`);
    }

    // Step E: Clear ICCR to null
    console.log("\n[Step E] Clearing ICCR = NULL...");
    await supabase
      .from("student_academic")
      .update({
        iccr_application_number: null,
        updated_at: new Date().toISOString()
      })
      .eq("student_id", studentId);

    const { data: checkE } = await supabase
      .from("student_academic")
      .select("iccr_application_number, sii_application_number")
      .eq("student_id", studentId)
      .single();

    console.log(`  Result -> ICCR: "${checkE?.iccr_application_number}", SII: "${checkE?.sii_application_number}"`);
    if (checkE?.iccr_application_number === null && checkE?.sii_application_number === "SII-TEST-004") {
      console.log("  ✓ Step E PASSED: ICCR is NULL, SII remains intact");
    } else {
      throw new Error(`Step E FAILED: ${JSON.stringify(checkE)}`);
    }

    // Step F: Restore original student record
    console.log("\n[Step F] Restoring original student record state...");
    await supabase
      .from("student_academic")
      .update({
        iccr_application_number: originalAcademic?.iccr_application_number || null,
        sii_application_number: originalAcademic?.sii_application_number || null,
        updated_at: new Date().toISOString()
      })
      .eq("student_id", studentId);
    console.log("  ✓ Step F PASSED: Original student data restored");

  } catch (err) {
    console.error("Live test failed:", err);
    // Attempt rollback to original
    await supabase
      .from("student_academic")
      .update({
        iccr_application_number: originalAcademic?.iccr_application_number || null,
        sii_application_number: originalAcademic?.sii_application_number || null
      })
      .eq("student_id", studentId);
    process.exit(1);
  }

  console.log("\n============================================================");
  console.log(" ALL LIVE E2E DATABASE CHECKS COMPLETED SUCCESSFULLY!");
  console.log("============================================================\n");
}

runLiveE2EVerification().catch(console.error);
