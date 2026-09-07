import "./test-preload";
import assert from "node:assert/strict";
import { 
  aggregateMonthlyAdmissions, 
  aggregateEfrroExpiryTimeline 
} from "../src/domain/reports/utils/admissions-distribution";
import { calculatePercentage } from "../src/features/dashboard/charts/percentage-charts";
import { parseDateOnlyString } from "../src/lib/utils/date";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res.then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      }).catch((err) => {
        console.error(`  ✗ ${name}`);
        console.error(`    ${(err as Error).message}`);
        failed++;
      });
    } else {
      console.log(`  ✓ ${name}`);
      passed++;
    }
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

console.log("\n============================================================");
console.log(" ISCMS TEST SUITE: ADMISSIONS INTAKE DISTRIBUTION REGRESSION");
console.log("============================================================\n");

// --------------------------------------------------------------------------
// TEST 1 — July Admission Count
// --------------------------------------------------------------------------
test("Test 1 — July: Adding a student with July admission date increases July count", () => {
  const baseData = [
    { admission_date: "2026-07-15" },
    { admission_date: "2026-07-20" },
    { admission_date: "2026-08-10" }
  ];
  const initial = aggregateMonthlyAdmissions(baseData);
  const julInitial = initial.find(m => m.name === "Jul 2026")?.value || 0;
  assert.equal(julInitial, 2);

  const updatedData = [...baseData, { admission_date: "2026-07-25" }];
  const result = aggregateMonthlyAdmissions(updatedData);
  const julUpdated = result.find(m => m.name === "Jul 2026")?.value || 0;
  assert.equal(julUpdated, 3);
});

// --------------------------------------------------------------------------
// TEST 2 — August Admission Count
// --------------------------------------------------------------------------
test("Test 2 — August: Adding a student with August admission date increases August count", () => {
  const baseData = [
    { admission_date: "2026-07-15" },
    { admission_date: "2026-08-10" }
  ];
  const initial = aggregateMonthlyAdmissions(baseData);
  const augInitial = initial.find(m => m.name === "Aug 2026")?.value || 0;
  assert.equal(augInitial, 1);

  const updatedData = [
    ...baseData,
    { admission_date: "2026-08-18" },
    { admission_date: "2026-08-30" }
  ];
  const result = aggregateMonthlyAdmissions(updatedData);
  const augUpdated = result.find(m => m.name === "Aug 2026")?.value || 0;
  assert.equal(augUpdated, 3);
});

// --------------------------------------------------------------------------
// TEST 3 — September Admission Dynamic Inclusion
// --------------------------------------------------------------------------
test("Test 3 — September: September 2026 appears automatically when September admissions exist", () => {
  const baseData = [
    { admission_date: "2026-07-15" },
    { admission_date: "2026-08-10" },
    { admission_date: "2026-09-02" },
    { admission_date: "2026-09-15" }
  ];
  const result = aggregateMonthlyAdmissions(baseData);
  const sepItem = result.find(m => m.name === "Sep 2026");
  assert.ok(sepItem, "Sep 2026 must be present in dynamic aggregation");
  assert.equal(sepItem?.value, 2);
});

// --------------------------------------------------------------------------
// TEST 4 — Future Month Dynamic Inclusion
// --------------------------------------------------------------------------
test("Test 4 — New month: Future admissions (e.g. Oct 2026) appear automatically without code changes", () => {
  const baseData = [
    { admission_date: "2026-07-15" },
    { admission_date: "2026-08-10" },
    { admission_date: "2026-09-02" },
    { admission_date: "2026-10-01" },
    { admission_date: "2026-11-20" }
  ];
  const result = aggregateMonthlyAdmissions(baseData);
  const octItem = result.find(m => m.name === "Oct 2026");
  const novItem = result.find(m => m.name === "Nov 2026");
  assert.equal(octItem?.value, 1);
  assert.equal(novItem?.value, 1);
});

// --------------------------------------------------------------------------
// TEST 5 — Existing Record Update
// --------------------------------------------------------------------------
test("Test 5 — Existing record update: Changing admission date from July to September updates counts accurately", () => {
  const studentRecords = [
    { id: "1", admission_date: "2026-07-20" },
    { id: "2", admission_date: "2026-07-25" },
    { id: "3", admission_date: "2026-08-15" }
  ];

  const before = aggregateMonthlyAdmissions(studentRecords);
  assert.equal(before.find(m => m.name === "Jul 2026")?.value, 2);
  assert.equal(before.find(m => m.name === "Sep 2026"), undefined);

  // Update student "2" from July to September
  const afterRecords = studentRecords.map(s => s.id === "2" ? { ...s, admission_date: "2026-09-07" } : s);
  const after = aggregateMonthlyAdmissions(afterRecords);

  assert.equal(after.find(m => m.name === "Jul 2026")?.value, 1);
  assert.equal(after.find(m => m.name === "Sep 2026")?.value, 1);
  assert.equal(after.find(m => m.name === "Aug 2026")?.value, 1);
});

// --------------------------------------------------------------------------
// TEST 6 — Total Reconciliation and Percentage Sum
// --------------------------------------------------------------------------
test("Test 6 — Percentage: SUM(counts) equals total admissions and displayed percentages sum to ~100%", () => {
  // Scenario from prompt: July 3, August 12, September 16 -> Total 31
  const dataset = [
    ...Array(3).fill({ admission_date: "2026-07-10" }),
    ...Array(12).fill({ admission_date: "2026-08-15" }),
    ...Array(16).fill({ admission_date: "2026-09-05" })
  ];

  const distribution = aggregateMonthlyAdmissions(dataset);
  const total = distribution.reduce((sum, d) => sum + d.value, 0);

  assert.equal(total, 31, "Total admissions must equal sum of period counts");

  const julCount = distribution.find(d => d.name === "Jul 2026")?.value || 0;
  const augCount = distribution.find(d => d.name === "Aug 2026")?.value || 0;
  const sepCount = distribution.find(d => d.name === "Sep 2026")?.value || 0;

  assert.equal(julCount, 3);
  assert.equal(augCount, 12);
  assert.equal(sepCount, 16);

  const julPct = calculatePercentage(julCount, total, 1);
  const augPct = calculatePercentage(augCount, total, 1);
  const sepPct = calculatePercentage(sepCount, total, 1);

  assert.equal(julPct, "9.7%");
  assert.equal(augPct, "38.7%");
  assert.equal(sepPct, "51.6%");

  const sumPct = parseFloat(julPct) + parseFloat(augPct) + parseFloat(sepPct);
  assert.ok(Math.abs(sumPct - 100) < 0.2, `Percentages should sum to approximately 100% (got ${sumPct}%)`);
});

// --------------------------------------------------------------------------
// TEST 7 — Year Separation (Jul 2025 vs Jul 2026)
// --------------------------------------------------------------------------
test("Test 7 — Year separation: July 2025 and July 2026 are separate periods and never combined", () => {
  const dataset = [
    { admission_date: "2025-07-10" },
    { admission_date: "2025-07-20" },
    { admission_date: "2026-07-15" }
  ];

  const result = aggregateMonthlyAdmissions(dataset);
  assert.equal(result.length, 2);

  const jul2025 = result.find(d => d.name === "Jul 2025");
  const jul2026 = result.find(d => d.name === "Jul 2026");

  assert.ok(jul2025, "Jul 2025 must exist as distinct period");
  assert.ok(jul2026, "Jul 2026 must exist as distinct period");
  assert.equal(jul2025?.value, 2);
  assert.equal(jul2026?.value, 1);

  // Chronological order check
  assert.equal(result[0].name, "Jul 2025");
  assert.equal(result[1].name, "Jul 2026");
});

// --------------------------------------------------------------------------
// TEST 8 — DD/MM/YYYY Interpretation
// --------------------------------------------------------------------------
test("Test 8 — DD/MM/YYYY: 02/09/2026 is parsed strictly as September 2, 2026", () => {
  const parts = parseDateOnlyString("02/09/2026");
  assert.ok(parts);
  assert.equal(parts?.year, 2026);
  assert.equal(parts?.month, 9, "Month 9 is September");
  assert.equal(parts?.day, 2, "Day is 2");

  const dataset = [{ admission_date: "02/09/2026" }];
  const result = aggregateMonthlyAdmissions(dataset);
  assert.equal(result[0].name, "Sep 2026");
  assert.equal(result[0].value, 1);
});

// --------------------------------------------------------------------------
// TEST 9 — Timezone Safety (1st of month never shifts)
// --------------------------------------------------------------------------
test("Test 9 — Timezone safety: 2026-09-01 is always September and 2026-08-01 is always August", () => {
  // First of the month dates often shift back 1 day in UTC-negative zones if parsed via new Date()
  const dataset = [
    { admission_date: "2026-09-01" },
    { admission_date: "2026-08-01" },
    { admission_date: "2026-07-01" }
  ];

  const result = aggregateMonthlyAdmissions(dataset);
  assert.equal(result.length, 3);
  assert.equal(result[0].name, "Jul 2026");
  assert.equal(result[0].value, 1);
  assert.equal(result[1].name, "Aug 2026");
  assert.equal(result[1].value, 1);
  assert.equal(result[2].name, "Sep 2026");
  assert.equal(result[2].value, 1);
});

// --------------------------------------------------------------------------
// TEST 10 — Current Month Admissions Included
// --------------------------------------------------------------------------
test("Test 10 — Current month: September 2026 admissions appear while month is ongoing", () => {
  const dataset = [
    { admission_date: "2026-07-20" },
    { admission_date: "2026-09-07" } // Ongoing admission date
  ];

  const result = aggregateMonthlyAdmissions(dataset);
  const sepItem = result.find(d => d.name === "Sep 2026");
  assert.ok(sepItem, "Ongoing September admissions must appear immediately");
  assert.equal(sepItem?.value, 1);
});

// --------------------------------------------------------------------------
// TEST 11 — Empty Dataset
// --------------------------------------------------------------------------
test("Test 11 — Empty dataset: Returns empty array without fabricating periods or 0%/100%", () => {
  const emptyResult = aggregateMonthlyAdmissions([]);
  assert.deepEqual(emptyResult, []);

  const nullsOnly = aggregateMonthlyAdmissions([
    { admission_date: null },
    { admission_date: "" },
    { admission_date: undefined }
  ]);
  assert.deepEqual(nullsOnly, []);
});

// --------------------------------------------------------------------------
// TEST 12 — Mathematical Precision & Formatting
// --------------------------------------------------------------------------
test("Test 12 — Precision: calculatePercentage handles single decimal and zero safely", () => {
  assert.equal(calculatePercentage(0, 31, 1), "0%");
  assert.equal(calculatePercentage(31, 31, 1), "100.0%");
  assert.equal(calculatePercentage(1, 3, 1), "33.3%");
  assert.equal(calculatePercentage(2, 3, 1), "66.7%");
  assert.equal(calculatePercentage(5, 0, 1), "0%");
});

// --------------------------------------------------------------------------
// TEST 13 — Single Student Dataset
// --------------------------------------------------------------------------
test("Test 13 — Single student: Displays exactly that month with 1 admission and 100.0%", () => {
  const dataset = [{ admission_date: "2026-09-07" }];
  const result = aggregateMonthlyAdmissions(dataset);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Sep 2026");
  assert.equal(result[0].value, 1);
  assert.equal(calculatePercentage(result[0].value, 1, 1), "100.0%");
});

// --------------------------------------------------------------------------
// TEST 14 — Last Day of Month Boundary
// --------------------------------------------------------------------------
test("Test 14 — Last day boundary: 2026-08-31 remains in August and 2026-09-30 remains in September", () => {
  const dataset = [
    { admission_date: "2026-08-31" },
    { admission_date: "2026-09-30" }
  ];
  const result = aggregateMonthlyAdmissions(dataset);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, "Aug 2026");
  assert.equal(result[0].value, 1);
  assert.equal(result[1].name, "Sep 2026");
  assert.equal(result[1].value, 1);
});

// --------------------------------------------------------------------------
// TEST 15 — Authoritative Field Precedence
// --------------------------------------------------------------------------
test("Test 15 — Authoritative field: admission_date takes precedence over joining_date, created_at, academic_year", () => {
  // A student created in July, joining in October, with academic year 2025-2026, but admission_date in September 2026
  const record = {
    admission_date: "2026-09-05",
    joining_date: "2026-10-01",
    created_at: "2026-07-15T10:00:00Z",
    admission_academic_year: "2025-2026"
  };
  const result = aggregateMonthlyAdmissions([record]);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Sep 2026");
  assert.equal(result[0].value, 1);
});

// --------------------------------------------------------------------------
// TEST 16 — Zero Count Suppression
// --------------------------------------------------------------------------
test("Test 16 — Zero count suppression: Months with 0 admissions are not fabricated or displayed", () => {
  const dataset = [
    { admission_date: "2026-07-15" },
    { admission_date: "2026-09-15" }
  ];
  const result = aggregateMonthlyAdmissions(dataset);
  // Only Jul 2026 and Sep 2026 should be returned; Aug 2026 has 0 admissions and must be omitted
  assert.equal(result.length, 2);
  assert.equal(result.find(d => d.name === "Aug 2026"), undefined);
  assert.equal(result[0].name, "Jul 2026");
  assert.equal(result[1].name, "Sep 2026");
});

// --------------------------------------------------------------------------
// TEST 17 — eFRRO Expiry Timeline Aggregation
// --------------------------------------------------------------------------
test("Test 17 — eFRRO timeline: Aggregates date-only expiry dates chronologically and timezone-safely", () => {
  const efrroData = [
    { efrro_expiry: "2026-11-01", efrro_status: "WARNING" },
    { efrro_expiry: "2026-09-15", efrro_status: "CRITICAL" },
    { efrro_expiry: "2026-09-30", efrro_status: "CRITICAL" },
    { efrro_expiry: null, efrro_status: "PENDING_REVIEW" }
  ];
  const result = aggregateEfrroExpiryTimeline(efrroData);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, "Sep 2026");
  assert.equal(result[0].value, 2);
  assert.equal(result[1].name, "Nov 2026");
  assert.equal(result[1].value, 1);
});

// --------------------------------------------------------------------------
// TEST 18 — Mathematical Reconciliation (32 Jul + 3 Aug = 35)
// --------------------------------------------------------------------------
test("Test 18 — Mathematical reconciliation: Live DB cohort volume (32 Jul + 3 Aug) sums to 35 and 100.0%", () => {
  const dataset = [
    ...Array(32).fill({ admission_date: "2026-07-20" }),
    ...Array(3).fill({ admission_date: "2026-08-10" })
  ];
  const result = aggregateMonthlyAdmissions(dataset);
  const total = result.reduce((sum, d) => sum + d.value, 0);
  assert.equal(total, 35);

  const julPct = calculatePercentage(32, 35, 1);
  const augPct = calculatePercentage(3, 35, 1);

  // 32/35 = 91.428... -> 91.4%
  // 3/35 = 8.571... -> 8.6%
  assert.equal(julPct, "91.4%");
  assert.equal(augPct, "8.6%");
  const sum = parseFloat(julPct) + parseFloat(augPct);
  assert.equal(sum, 100.0);
});

console.log("\n============================================================");
console.log(` RESULTS: ${passed} passed, ${failed} failed`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
}

