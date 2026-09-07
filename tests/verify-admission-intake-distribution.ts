import "./mock-server-only.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { 
  aggregateMonthlyAdmissions, 
  getYearMonthInTimezone, 
  APP_TIMEZONE, 
  MONTH_NAMES 
} from "../src/domain/reports/utils/admissions-distribution";
import { fetchAnalyticsCharts } from "../src/app/(app)/dashboard/actions";

async function runTests() {
  console.log("=== RUNNING ISCMS ADMISSION INTAKE DISTRIBUTION TESTS ===\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials in .env.local");
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // --------------------------------------------------------------------------
  // Test 1: Direct Database Aggregation on Authoritative `students` Table
  // --------------------------------------------------------------------------
  console.log("Test 1: Direct Database Aggregation on 'students' Table");
  const { data: students, error: studErr } = await supabase
    .from("students")
    .select("id, created_at, status, deleted_at")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (studErr || !students) {
    throw new Error(`Failed to query students table: ${studErr?.message}`);
  }

  console.log(`  ✓ Total Active, Non-deleted Students: ${students.length}`);

  const dbCounts: Record<string, number> = {};
  students.forEach(s => {
    const ym = getYearMonthInTimezone(s.created_at, APP_TIMEZONE);
    if (!ym) return;
    const key = `${ym.year}-${String(ym.month).padStart(2, "0")}`;
    dbCounts[key] = (dbCounts[key] || 0) + 1;
  });

  console.log("  ✓ Direct Database Grouping (Asia/Kolkata):", dbCounts);
  const julDb = dbCounts["2026-07"] || 0;
  const augDb = dbCounts["2026-08"] || 0;
  const sepDb = dbCounts["2026-09"] || 0;

  console.log(`    - July 2026 Database Count: ${julDb}`);
  console.log(`    - August 2026 Database Count: ${augDb}`);
  console.log(`    - September 2026 Database Count: ${sepDb}`);
  console.log("  -> Test 1 PASSED\n");

  // --------------------------------------------------------------------------
  // Test 2: aggregateMonthlyAdmissions output with active student rows
  // --------------------------------------------------------------------------
  console.log("Test 2: aggregateMonthlyAdmissions Domain Aggregator");
  const aggregated = aggregateMonthlyAdmissions(
    students.map(s => ({ created_at: s.created_at }))
  );

  console.log("  ✓ Aggregated Output:", JSON.stringify(aggregated, null, 2));

  const julItem = aggregated.find(a => a.name === "Jul 2026");
  const augItem = aggregated.find(a => a.name === "Aug 2026");
  const sepItem = aggregated.find(a => a.name === "Sep 2026");

  if (!julItem || julItem.value !== julDb) {
    throw new Error(`Test 2 FAILED: July count mismatch! Expected ${julDb}, got ${julItem?.value}`);
  }
  if (!augItem || augItem.value !== augDb) {
    throw new Error(`Test 2 FAILED: August count mismatch! Expected ${augDb}, got ${augItem?.value}`);
  }
  if (!sepItem || sepItem.value !== sepDb) {
    throw new Error(`Test 2 FAILED: September count mismatch! Expected ${sepDb}, got ${sepItem?.value}`);
  }

  const totalAggregated = aggregated.reduce((sum, item) => sum + item.value, 0);
  if (totalAggregated !== students.length) {
    throw new Error(`Test 2 FAILED: Total mismatch! Expected ${students.length}, got ${totalAggregated}`);
  }

  console.log(`  ✓ July 2026: ${julItem.value} (matches DB)`);
  console.log(`  ✓ August 2026: ${augItem.value} (matches DB)`);
  console.log(`  ✓ September 2026: ${sepItem.value} (matches DB)`);
  console.log(`  ✓ Total Cohort Sum: ${totalAggregated} = ${students.length}`);
  console.log("  -> Test 2 PASSED\n");

  // --------------------------------------------------------------------------
  // Test 3: Dashboard fetchAnalyticsCharts() Live Verification
  // --------------------------------------------------------------------------
  console.log("Test 3: Dashboard fetchAnalyticsCharts() Integration");
  const chartsData = await fetchAnalyticsCharts();
  const dashboardMonthly = chartsData.monthlyAdmissions;

  console.log("  ✓ Dashboard Charts monthlyAdmissions:", JSON.stringify(dashboardMonthly, null, 2));

  const dJul = dashboardMonthly.find(m => m.name === "Jul 2026");
  const dAug = dashboardMonthly.find(m => m.name === "Aug 2026");
  const dSep = dashboardMonthly.find(m => m.name === "Sep 2026");

  console.log("\n  =======================================================");
  console.log("  VALIDATION TABLE: DATABASE vs DASHBOARD");
  console.log("  =======================================================");
  console.log(`  Month             Database Count     Dashboard Count     Match?`);
  console.log(`  -------------------------------------------------------`);
  console.log(`  July 2026         ${String(julDb).padEnd(19)}${String(dJul?.value ?? "N/A").padEnd(20)}${julDb === dJul?.value ? "YES ✓" : "NO ✗"}`);
  console.log(`  August 2026       ${String(augDb).padEnd(19)}${String(dAug?.value ?? "N/A").padEnd(20)}${augDb === dAug?.value ? "YES ✓" : "NO ✗"}`);
  console.log(`  September 2026    ${String(sepDb).padEnd(19)}${String(dSep?.value ?? "N/A").padEnd(20)}${sepDb === dSep?.value ? "YES ✓" : "NO ✗"}`);
  console.log(`  =======================================================\n`);

  if (dJul?.value !== julDb || dAug?.value !== augDb || dSep?.value !== sepDb) {
    throw new Error("Test 3 FAILED: Dashboard counts do not match database counts!");
  }
  console.log("  -> Test 3 PASSED\n");

  // --------------------------------------------------------------------------
  // Test 4: Timezone Boundary Safety (Asia/Kolkata UTC+5:30)
  // --------------------------------------------------------------------------
  console.log("Test 4: Timezone Midnight Boundary Tests");
  // 2026-08-31 18:29 UTC -> 2026-08-31 23:59 IST (August)
  const augBorder = getYearMonthInTimezone("2026-08-31T18:29:00.000Z");
  // 2026-08-31 18:31 UTC -> 2026-09-01 00:01 IST (September)
  const sepBorder = getYearMonthInTimezone("2026-08-31T18:31:00.000Z");

  if (augBorder?.year !== 2026 || augBorder?.month !== 8) {
    throw new Error(`Test 4 FAILED: 18:29 UTC should be August in IST, got ${JSON.stringify(augBorder)}`);
  }
  if (sepBorder?.year !== 2026 || sepBorder?.month !== 9) {
    throw new Error(`Test 4 FAILED: 18:31 UTC should be September in IST, got ${JSON.stringify(sepBorder)}`);
  }
  console.log(`  ✓ 2026-08-31T18:29:00Z -> ${augBorder.year}-${augBorder.month} (August in IST)`);
  console.log(`  ✓ 2026-08-31T18:31:00Z -> ${sepBorder.year}-${sepBorder.month} (September in IST)`);
  console.log("  -> Test 4 PASSED\n");

  // --------------------------------------------------------------------------
  // Test 5: Future Month Transition Dynamic Behavior
  // --------------------------------------------------------------------------
  console.log("Test 5: Future Month Transition Verification");
  // Test with a synthetic registration in October 2026
  const sampleWithOct = [
    ...students.map(s => ({ created_at: s.created_at })),
    { created_at: "2026-10-15T10:00:00.000Z" }
  ];
  const withOctAggregated = aggregateMonthlyAdmissions(sampleWithOct);
  const octItem = withOctAggregated.find(a => a.name === "Oct 2026");
  if (!octItem || octItem.value !== 1) {
    throw new Error(`Test 5 FAILED: Future month October not automatically added!`);
  }
  console.log(`  ✓ When registrations exist in October, "Oct 2026" automatically appears with count ${octItem.value}`);
  console.log("  -> Test 5 PASSED\n");

  console.log("=================================================");
  console.log("ALL INTAKE DISTRIBUTION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runTests().catch(err => {
  console.error("\nTEST SUITE RUN ERROR:", err);
  process.exit(1);
});
