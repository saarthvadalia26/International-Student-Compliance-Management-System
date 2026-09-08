import "./../tests/test-preload";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAdminSupabase } from "@/lib/supabase/admin";
import { ComplianceCalculator } from "@/domain/compliance/services/compliance-calculator";

async function syncSnapshots() {
  console.log("============================================================");
  console.log(" ISCMS: Synchronizing Authoritative Compliance Snapshots");
  console.log("============================================================\n");

  const supabase = getAdminSupabase();

  const { data: snapshots, error: fetchErr } = await supabase
    .from("student_snapshot")
    .select(`
      student_id,
      passport_number,
      passport_expiry,
      passport_status,
      visa_number,
      visa_expiry,
      visa_status,
      efrro_number,
      efrro_expiry,
      efrro_status,
      compliance_status,
      compliance_score
    `);

  if (fetchErr || !snapshots) {
    console.error("Failed to fetch student_snapshot records:", fetchErr);
    process.exit(1);
  }

  console.log(`Retrieved ${snapshots.length} student snapshot records.`);

  const beforeDist: Record<string, number> = {};
  snapshots.forEach(s => {
    beforeDist[s.compliance_status || "UNKNOWN"] = (beforeDist[s.compliance_status || "UNKNOWN"] || 0) + 1;
  });
  console.log("Distribution BEFORE sync:", beforeDist);

  let updatedCount = 0;
  const afterDist: Record<string, number> = {};

  for (const s of snapshots) {
    const complianceResult = ComplianceCalculator.evaluateStudentCompliance({
      passport: { number: s.passport_number, expiry: s.passport_expiry },
      visa: { number: s.visa_number, expiry: s.visa_expiry },
      efrro: { number: s.efrro_number, expiry: s.efrro_expiry }
    });

    afterDist[complianceResult.overallStatus] = (afterDist[complianceResult.overallStatus] || 0) + 1;

    const { error: updateErr } = await supabase
      .from("student_snapshot")
      .update({
        passport_status: complianceResult.passport.status,
        visa_status: complianceResult.visa.status,
        efrro_status: complianceResult.efrro.status,
        compliance_status: complianceResult.overallStatus,
        compliance_score: complianceResult.complianceScore,
        days_until_efrro_expiry: complianceResult.daysUntilEfrroExpiry,
        updated_at: new Date().toISOString()
      })
      .eq("student_id", s.student_id);

    if (updateErr) {
      console.error(`Failed to update student ${s.student_id}:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log("\n============================================================");
  console.log(` Successfully synchronized ${updatedCount}/${snapshots.length} student snapshots.`);
  console.log(" Distribution AFTER sync:", afterDist);
  console.log("============================================================\n");
}

syncSnapshots().catch(err => {
  console.error("Fatal synchronization error:", err);
  process.exit(1);
});
