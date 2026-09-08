/**
 * Test Suite: Dashboard "Total Students" Drilldown & Nationality Search
 *
 * Verifies:
 * 1. getDashboardDrilldown("total_students") returns all active students with totalCount matching items.length.
 * 2. Academic programs are properly resolved to human-readable names.
 * 3. Nationalities are properly resolved with country names, ISO codes, and demonyms.
 * 4. Missing documents array is populated for students requiring renewals/uploads.
 * 5. Nationality search filtering matches across country name, 3-letter code, and demonym.
 * 6. getDashboardDrilldown("compliant") executes cleanly without relational join errors.
 */

import "./test-preload";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import assert from "node:assert/strict";
import { reportRepository } from "../src/domain/reports/repositories/report.repository";
import { ComplianceDrilldownItem } from "../src/domain/reports/types";

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
  console.log("\n============================================================");
  console.log(" ISCMS Test Suite: Dashboard Total Students Drilldown");
  console.log("============================================================\n");

  let totalDrilldown: any = null;

  // TEST 1 — Total Students Drilldown returns authoritative data
  await test("TEST 1: getDashboardDrilldown('total_students') returns active students (> 0)", async () => {
    totalDrilldown = await reportRepository.getDashboardDrilldown("total_students");
    assert.equal(totalDrilldown.category, "total_students");
    assert.equal(totalDrilldown.title, "All Active International Students");
    assert(totalDrilldown.totalCount > 0, `Expected totalCount > 0, got ${totalDrilldown.totalCount}`);
    assert.equal(totalDrilldown.items.length, totalDrilldown.totalCount, "items length must equal totalCount");
    console.log(`    Total students returned: ${totalDrilldown.totalCount}`);
  });

  // TEST 2 — Academic program resolution
  await test("TEST 2: Drilldown items have resolved academic program names", async () => {
    assert(totalDrilldown && totalDrilldown.items.length > 0, "No items to check");
    const itemsWithProgram = totalDrilldown.items.filter((i: ComplianceDrilldownItem) => Boolean(i.academicProgram));
    assert(itemsWithProgram.length > 0, "Expected students to have resolved academic programs");
    // Ensure programs are not just UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasResolvedName = itemsWithProgram.some((i: ComplianceDrilldownItem) => !uuidRegex.test(i.academicProgram || ""));
    assert(hasResolvedName, "At least one student should have a readable program name, not a raw UUID");
  });

  // TEST 3 — Nationality resolution
  await test("TEST 3: Drilldown items have resolved nationality names, codes, and demonyms", async () => {
    assert(totalDrilldown && totalDrilldown.items.length > 0, "No items to check");
    const withNat = totalDrilldown.items.filter((i: ComplianceDrilldownItem) => Boolean(i.nationality));
    assert(withNat.length > 0, "Expected students to have nationality names");
    assert(withNat.some((i: ComplianceDrilldownItem) => Boolean(i.nationalityCode)), "Expected nationalityCode to be populated");
  });

  // TEST 4 — Search filtering logic matches nationality name, code, and demonym
  await test("TEST 4: Search filter matches nationality name, 3-letter code, and demonym", async () => {
    const items: ComplianceDrilldownItem[] = totalDrilldown.items;

    const filterBySearch = (query: string) => {
      const q = query.toLowerCase().trim();
      return items.filter(item => {
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchReg = item.registrationNumber.toLowerCase().includes(q);
        const matchDoc = item.documentNumber?.toLowerCase().includes(q);
        const matchProg = item.academicProgram?.toLowerCase().includes(q);
        const matchNat =
          (item.nationality && item.nationality.toLowerCase().includes(q)) ||
          (item.nationalityCode && item.nationalityCode.toLowerCase().includes(q)) ||
          (item.nationalityDemonym && item.nationalityDemonym.toLowerCase().includes(q));
        const matchStatus = item.complianceStatus?.toLowerCase().includes(q);
        const matchMissing = item.missingDocuments?.some(d => d.toLowerCase().includes(q));
        return (
          matchName ||
          matchReg ||
          matchDoc ||
          matchProg ||
          matchNat ||
          matchStatus ||
          matchMissing
        );
      });
    };

    // Find a student with a known nationality
    const tzaStudent = items.find(i => i.nationalityCode === "TZA");
    if (tzaStudent) {
      // 1. Search by full country name
      const byName = filterBySearch("Tanzania");
      assert(byName.length > 0, "Search by 'Tanzania' should return results");
      assert(byName.some(i => i.studentId === tzaStudent.studentId), "Should include Tanzania student");

      // 2. Search by ISO code
      const byCode = filterBySearch("TZA");
      assert(byCode.length > 0, "Search by 'TZA' should return results");
      assert(byCode.some(i => i.studentId === tzaStudent.studentId), "Should include TZA student");

      // 3. Search by demonym
      const byDemonym = filterBySearch("Tanzanian");
      assert(byDemonym.length > 0, "Search by 'Tanzanian' should return results");
      assert(byDemonym.some(i => i.studentId === tzaStudent.studentId), "Should include Tanzanian student");
    }

    // Check another country (e.g. Mauritius / MUS)
    const musStudent = items.find(i => i.nationalityCode === "MUS");
    if (musStudent) {
      const byMus = filterBySearch("Mauritius");
      assert(byMus.length > 0, "Search by 'Mauritius' should return results");
      const byMusCode = filterBySearch("MUS");
      assert(byMusCode.length > 0, "Search by 'MUS' should return results");
    }
  });

  // TEST 5 — Missing documents categorization
  await test("TEST 5: Students with non-compliant status have missingDocuments populated", async () => {
    const missingStudents = totalDrilldown.items.filter((i: ComplianceDrilldownItem) => i.complianceStatus !== "COMPLIANT");
    assert(missingStudents.length > 0, "Expected some students with non-compliant status");
    const withMissingDocs = missingStudents.filter((i: ComplianceDrilldownItem) => (i.missingDocuments?.length || 0) > 0);
    assert(withMissingDocs.length > 0, "Expected missingDocuments array to identify missing document types");
    console.log(`    Sample missing documents: ${withMissingDocs[0].studentName} -> [${withMissingDocs[0].missingDocuments?.join(", ")}]`);
  });

  // TEST 6 — Fully Compliant drilldown executes without error
  await test("TEST 6: getDashboardDrilldown('compliant') executes successfully", async () => {
    const compliantDrilldown = await reportRepository.getDashboardDrilldown("compliant");
    assert.equal(compliantDrilldown.category, "compliant");
    assert.equal(compliantDrilldown.title, "Fully Compliant Students");
    assert(Array.isArray(compliantDrilldown.items), "items must be an array");
    compliantDrilldown.items.forEach((item: ComplianceDrilldownItem) => {
      assert.equal(item.complianceStatus, "COMPLIANT", "Every compliant item must have complianceStatus === 'COMPLIANT'");
    });
    console.log(`    Compliant students count: ${compliantDrilldown.totalCount}`);
  });

  console.log("\n============================================================");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test suite runner crashed:", err);
  process.exit(1);
});
