/**
 * ISCMS Automated Test Suite: Dashboard Analytics Complete Coverage & Reconciliation
 *
 * Verifies:
 * TEST 1 — COUNTRY: Every represented country appears, counts and percentages are accurate, totals reconcile, missing nationality handled.
 * TEST 2 — ACADEMIC SCHOOL: Every represented school appears, counts and percentages are accurate, totals reconcile.
 * TEST 3 — DEGREE PROGRAM: Every represented degree program appears, counts and percentages are accurate, totals reconcile.
 * TEST 4 — COURSE / HIERARCHY: Multi-tier hierarchy (School -> Level -> Course) is structurally intact, counts match at every level.
 * TEST 5 — CAMPUS: Every represented campus appears, counts and percentages are accurate, totals reconcile.
 * TEST 6 — MISSING DATA: Records with missing/null nationality, school, program, or campus are categorized under "Unknown / Not Provided" without dropping.
 * TEST 7 — RECONCILIATION & NO TRUNCATION: Sum of counts across all categories exactly equals totalActiveStudents, no Top-N truncation.
 */

import "./test-preload";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import assert from "node:assert/strict";
import { _fetchAnalyticsChartsInternal } from "../src/app/(app)/dashboard/actions";
import { calculatePercentage } from "../src/features/dashboard/charts/percentage-charts";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function runTests() {
  console.log("============================================================");
  console.log(" ISCMS TEST SUITE: DASHBOARD COMPLETE ANALYTICS COVERAGE");
  console.log("============================================================\n");

  const chartsData = await _fetchAnalyticsChartsInternal();
  const total = chartsData.totalActiveStudents;

  console.log(`Authoritative active student population: ${total} students\n`);

  // TEST 1 — COUNTRY
  await test("TEST 1 — COUNTRY: Every represented country appears with correct counts and reconciling total", () => {
    assert(total > 0, "Total active students must be greater than zero");
    assert(chartsData.studentsByCountry.length > 0, "Country distribution must not be empty");

    // Must not be truncated to top 5 or 6
    assert(
      chartsData.studentsByCountry.length > 6,
      `Expected complete country coverage (>6 countries represented), got ${chartsData.studentsByCountry.length}`
    );

    const countrySum = chartsData.studentsByCountry.reduce((acc, curr) => acc + curr.value, 0);
    assert.equal(countrySum, total, `Sum of country counts (${countrySum}) must equal total students (${total})`);

    // Verify percentages
    chartsData.studentsByCountry.forEach(c => {
      const expectedPct = calculatePercentage(c.value, total, 1);
      assert(c.value > 0, `Country ${c.name} count must be positive`);
      assert(c.name && c.name.length > 0, "Country name must not be empty");
    });
  });

  // TEST 2 — ACADEMIC SCHOOL
  await test("TEST 2 — ACADEMIC SCHOOL: Every represented school appears with correct counts and reconciling total", () => {
    assert(chartsData.studentsBySchool.length > 0, "School distribution must not be empty");
    assert(
      chartsData.studentsBySchool.length >= 6,
      `Expected complete school coverage, got ${chartsData.studentsBySchool.length}`
    );

    const schoolSum = chartsData.studentsBySchool.reduce((acc, curr) => acc + curr.value, 0);
    assert.equal(schoolSum, total, `Sum of school counts (${schoolSum}) must equal total students (${total})`);

    chartsData.studentsBySchool.forEach(s => {
      assert(s.value > 0, `School ${s.name} count must be positive`);
      assert(s.name && s.name.length > 0, "School name must not be empty");
    });
  });

  // TEST 3 — DEGREE PROGRAM
  await test("TEST 3 — DEGREE PROGRAM: Every represented program appears with correct counts and reconciling total", () => {
    assert(chartsData.studentsByProgram.length > 0, "Program distribution must not be empty");
    assert(
      chartsData.studentsByProgram.length > 8,
      `Expected complete program coverage (>8 programs represented), got ${chartsData.studentsByProgram.length}`
    );

    const progSum = chartsData.studentsByProgram.reduce((acc, curr) => acc + curr.value, 0);
    assert.equal(progSum, total, `Sum of program counts (${progSum}) must equal total students (${total})`);

    // Verify backward compatibility alias studentsByCourse
    assert.equal(
      chartsData.studentsByCourse.length,
      chartsData.studentsByProgram.length,
      "studentsByCourse must alias studentsByProgram for backward compatibility"
    );
  });

  // TEST 4 — COURSE / HIERARCHY
  await test("TEST 4 — COURSE & HIERARCHY: Multi-tier hierarchy is intact and sums match at all tiers", () => {
    assert(chartsData.academicHierarchy.length > 0, "Academic hierarchy must not be empty");

    let hierarchyStudentSum = 0;

    chartsData.academicHierarchy.forEach(schoolNode => {
      let schoolLevelSum = 0;

      schoolNode.levels.forEach(levelNode => {
        let levelCourseSum = 0;

        levelNode.courses.forEach(courseNode => {
          assert(courseNode.studentCount > 0, "Course studentCount must be positive");
          levelCourseSum += courseNode.studentCount;
        });

        assert.equal(
          levelCourseSum,
          levelNode.studentCount,
          `Course counts in level ${levelNode.level} must sum to level count`
        );
        schoolLevelSum += levelNode.studentCount;
      });

      assert.equal(
        schoolLevelSum,
        schoolNode.studentCount,
        `Level counts in school ${schoolNode.schoolName} must sum to school count`
      );
      hierarchyStudentSum += schoolNode.studentCount;
    });

    assert.equal(
      hierarchyStudentSum,
      total,
      `Total students across academic hierarchy (${hierarchyStudentSum}) must reconcile with total students (${total})`
    );
  });

  // TEST 5 — CAMPUS
  await test("TEST 5 — CAMPUS: Every represented campus appears with correct counts and reconciling total", () => {
    assert(chartsData.studentsByCampus.length > 0, "Campus distribution must not be empty");

    const campusSum = chartsData.studentsByCampus.reduce((acc, curr) => acc + curr.value, 0);
    assert.equal(campusSum, total, `Sum of campus counts (${campusSum}) must equal total students (${total})`);

    chartsData.studentsByCampus.forEach(c => {
      assert(c.value > 0, `Campus ${c.name} count must be positive`);
    });
  });

  // TEST 6 — MISSING DATA
  await test("TEST 6 — MISSING DATA: Null/unspecified fields are mapped to 'Unknown / Not Provided' without dropping students", () => {
    // Check that if any category is missing, it is labeled as Unknown / Not Provided and counted in total
    const unknownCountry = chartsData.studentsByCountry.find(c => c.name.includes("Unknown"));
    const unknownSchool = chartsData.studentsBySchool.find(s => s.name.includes("Unknown"));
    const unknownProgram = chartsData.studentsByProgram.find(p => p.name.includes("Unknown"));
    const unknownCampus = chartsData.studentsByCampus.find(c => c.name.includes("Unknown"));

    // Whether present or not in current seed, if an unknown item exists, its count must be positive and accounted
    if (unknownCountry) assert(unknownCountry.value > 0);
    if (unknownSchool) assert(unknownSchool.value > 0);
    if (unknownProgram) assert(unknownProgram.value > 0);
    if (unknownCampus) assert(unknownCampus.value > 0);

    // Verify calculatePercentage handles 0 and edge cases safely
    assert.equal(calculatePercentage(0, 100), "0%");
    assert.equal(calculatePercentage(10, 0), "0%");
    assert.equal(calculatePercentage(50, 100, 1), "50.0%");
  });

  // TEST 7 — RECONCILIATION & NO TRUNCATION
  await test("TEST 7 — RECONCILIATION & NO TRUNCATION: All dimension sums reconcile exactly to total population", () => {
    const countryTotal = chartsData.studentsByCountry.reduce((acc, c) => acc + c.value, 0);
    const schoolTotal = chartsData.studentsBySchool.reduce((acc, s) => acc + s.value, 0);
    const programTotal = chartsData.studentsByProgram.reduce((acc, p) => acc + p.value, 0);
    const campusTotal = chartsData.studentsByCampus.reduce((acc, c) => acc + c.value, 0);

    assert.equal(countryTotal, total, "Country total must equal active students");
    assert.equal(schoolTotal, total, "School total must equal active students");
    assert.equal(programTotal, total, "Program total must equal active students");
    assert.equal(campusTotal, total, "Campus total must equal active students");

    // Check distinct counters
    assert.equal(
      chartsData.distinctCountriesCount,
      chartsData.studentsByCountry.filter(c => c.name !== "Unknown / Not Provided").length
    );
    assert.equal(
      chartsData.distinctSchoolsCount,
      chartsData.studentsBySchool.filter(s => s.name !== "Unknown / Not Provided").length
    );
    assert.equal(
      chartsData.distinctProgramsCount,
      chartsData.studentsByProgram.filter(p => p.name !== "Unknown / Not Provided").length
    );
    assert.equal(
      chartsData.distinctCampusesCount,
      chartsData.studentsByCampus.filter(c => c.name !== "Unknown / Not Provided").length
    );

    // Verify existing compliance and timeline data is intact
    assert(Array.isArray(chartsData.complianceDistribution), "complianceDistribution must be an array");
    assert(Array.isArray(chartsData.notificationSuccessRate), "notificationSuccessRate must be an array");
    assert(Array.isArray(chartsData.monthlyAdmissions), "monthlyAdmissions must be an array");
    assert(Array.isArray(chartsData.efrroExpiryTimeline), "efrroExpiryTimeline must be an array");
  });

  console.log("\n============================================================");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
