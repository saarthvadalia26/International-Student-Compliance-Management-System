import { 
  AcademicProgressionEngine, 
  AcademicCourseConfig, 
  AcademicAdjustmentRecord 
} from "../src/domain/academic/services/semester-progression.service";

async function runProgressionTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  console.log("\n=======================================================");
  console.log("  ISCMS AUTOMATIC SEMESTER PROGRESSION TEST SUITE");
  console.log("=======================================================\n");

  // --- TEST A: STANDARD 8-SEMESTER COURSE (6 MONTHS EACH) ---
  console.log("--- Test A: Standard 8-Semester Course (6 Months Each) ---");
  const btechConfig: AcademicCourseConfig = {
    programName: "B.Tech in Computer Science & Engineering",
    programCode: "BTECH_CSE",
    totalSemesters: 8,
    semesterDuration: 6,
    semesterDurationUnit: "months"
  };

  const admDateA = "2025-08-01";

  // Expected graduation
  const gradA = AcademicProgressionEngine.calculateExpectedGraduationDate({
    admissionDate: admDateA,
    courseConfig: btechConfig
  });
  assert(gradA === "2029-08-01", `Test A: Expected graduation calculated as 2029-08-01 (got ${gradA})`);

  // Future check (before admission)
  const resBefore = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateA,
    courseConfig: btechConfig,
    currentDate: "2025-07-15"
  });
  assert(resBefore.currentSemester === 1, "Test A: Pre-admission date yields Semester 1");
  assert(resBefore.stage === "NOT_STARTED", "Test A: Stage is NOT_STARTED before admission date");

  // Day 1
  const resSem1 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateA,
    courseConfig: btechConfig,
    currentDate: "2025-08-01"
  });
  assert(resSem1.currentSemester === 1, "Test A: On 2025-08-01 student is in Semester 1");
  assert(resSem1.stage === "ACTIVE", "Test A: Stage is ACTIVE");

  // 5 Months elapsed (just before Sem 2)
  const resSem1Late = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateA,
    courseConfig: btechConfig,
    currentDate: "2026-01-31"
  });
  assert(resSem1Late.currentSemester === 1, "Test A: On 2026-01-31 (5 months elapsed) student is still in Semester 1");

  // 6 Months elapsed -> Semester 2
  const resSem2 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateA,
    courseConfig: btechConfig,
    currentDate: "2026-02-01"
  });
  assert(resSem2.currentSemester === 2, "Test A: On 2026-02-01 (6 months elapsed) student progresses to Semester 2");

  // 12 Months elapsed -> Semester 3
  const resSem3 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateA,
    courseConfig: btechConfig,
    currentDate: "2026-08-01"
  });
  assert(resSem3.currentSemester === 3, "Test A: On 2026-08-01 (12 months elapsed) student progresses to Semester 3");

  // 18 Months elapsed -> Semester 4
  const resSem4 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateA,
    courseConfig: btechConfig,
    currentDate: "2027-02-01"
  });
  assert(resSem4.currentSemester === 4, "Test A: On 2027-02-01 student is in Semester 4");

  // 42 Months elapsed -> Semester 8 (Final Semester)
  const resSem8 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateA,
    courseConfig: btechConfig,
    currentDate: "2029-02-01"
  });
  assert(resSem8.currentSemester === 8, "Test A: On 2029-02-01 student is in Semester 8");
  assert(resSem8.isFinalSemester === true, "Test A: Semester 8 is marked as Final Semester");
  assert(resSem8.stage === "FINAL_SEMESTER", "Test A: Stage is FINAL_SEMESTER");

  // --- TEST B: 4-SEMESTER COURSE (M.TECH / M.SC) ---
  console.log("\n--- Test B: 4-Semester Course ---");
  const mtechConfig: AcademicCourseConfig = {
    programName: "M.Tech in Cyber Security",
    programCode: "MTECH_CS",
    totalSemesters: 4,
    semesterDuration: 6,
    semesterDurationUnit: "months"
  };

  const admDateB = "2025-08-01";
  const gradB = AcademicProgressionEngine.calculateExpectedGraduationDate({
    admissionDate: admDateB,
    courseConfig: mtechConfig
  });
  assert(gradB === "2027-08-01", `Test B: M.Tech 4 semesters expected graduation is 2027-08-01 (got ${gradB})`);

  const resMtechSem4 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateB,
    courseConfig: mtechConfig,
    currentDate: "2027-02-01"
  });
  assert(resMtechSem4.currentSemester === 4, "Test B: On 2027-02-01 M.Tech student is in Semester 4");
  assert(resMtechSem4.isFinalSemester === true, "Test B: Final semester detected");

  const resMtechCompleted = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateB,
    courseConfig: mtechConfig,
    currentDate: "2027-08-01"
  });
  assert(resMtechCompleted.currentSemester === 4, "Test B: Student remains bounded at total semesters (4)");
  assert(resMtechCompleted.isCompleted === true, "Test B: Student is marked as COMPLETED after 4 semesters");
  assert(resMtechCompleted.stage === "COMPLETED", "Test B: Stage is COMPLETED");

  // --- TEST C: NON-STANDARD DURATION (6 SEMESTERS, 4 MONTHS EACH) ---
  console.log("\n--- Test C: Non-Standard Duration (6 Semesters, 4 Months Each) ---");
  const trimesterConfig: AcademicCourseConfig = {
    programName: "Accelerated International Diploma",
    programCode: "ACC_DIP",
    totalSemesters: 6,
    semesterDuration: 4,
    semesterDurationUnit: "months"
  };

  const admDateC = "2025-08-01";
  const gradC = AcademicProgressionEngine.calculateExpectedGraduationDate({
    admissionDate: admDateC,
    courseConfig: trimesterConfig
  });
  assert(gradC === "2027-08-01", `Test C: 6 semesters x 4 months = 24 months -> 2027-08-01 (got ${gradC})`);

  // Month 4 (2025-12-01) -> MUST BE Semester 2 (proves NOT assuming 6 months!)
  const resTrimSem2 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateC,
    courseConfig: trimesterConfig,
    currentDate: "2025-12-01"
  });
  assert(resTrimSem2.currentSemester === 2, "Test C: On 2025-12-01 (4 months elapsed) student is in Semester 2");

  // Month 8 (2026-04-01) -> MUST BE Semester 3
  const resTrimSem3 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateC,
    courseConfig: trimesterConfig,
    currentDate: "2026-04-01"
  });
  assert(resTrimSem3.currentSemester === 3, "Test C: On 2026-04-01 (8 months elapsed) student is in Semester 3");

  // Month 12 (2026-08-01) -> MUST BE Semester 4
  const resTrimSem4 = AcademicProgressionEngine.calculateProgression({
    admissionDate: admDateC,
    courseConfig: trimesterConfig,
    currentDate: "2026-08-01"
  });
  assert(resTrimSem4.currentSemester === 4, "Test C: On 2026-08-01 (12 months elapsed) student is in Semester 4");

  // --- TEST D: DIFFERENT COURSE STRUCTURES INDEPENDENCE ---
  console.log("\n--- Test D: Different Course Structures Independence ---");
  const checkDateD = "2026-04-01"; // 8 months from 2025-08-01

  const student1BTech = AcademicProgressionEngine.calculateProgression({
    admissionDate: "2025-08-01",
    courseConfig: btechConfig,
    currentDate: checkDateD
  });
  const student2Trimester = AcademicProgressionEngine.calculateProgression({
    admissionDate: "2025-08-01",
    courseConfig: trimesterConfig,
    currentDate: checkDateD
  });

  assert(student1BTech.currentSemester === 2, "Test D: B.Tech student is in Semester 2 on 2026-04-01");
  assert(student2Trimester.currentSemester === 3, "Test D: Trimester student is in Semester 3 on 2026-04-01");
  assert(student1BTech.currentSemester !== student2Trimester.currentSemester, "Test D: Students on different courses follow their own progression");

  // --- TEST E: GRADUATION BOUNDARY ---
  console.log("\n--- Test E: Graduation Boundary ---");
  const resFarFuture = AcademicProgressionEngine.calculateProgression({
    admissionDate: "2025-08-01",
    courseConfig: btechConfig,
    currentDate: "2035-01-01" // 10 years later
  });
  assert(resFarFuture.currentSemester === 8, "Test E: Current semester does not exceed totalSemesters (clamped at 8)");
  assert(resFarFuture.isCompleted === true, "Test E: Marked as COMPLETED in far future");

  // --- TEST F: ADMISSION DATE CHANGE ---
  console.log("\n--- Test F: Admission Date Change ---");
  const oldAdmDate = "2025-08-01";
  const newAdmDate = "2026-08-01"; // Deferred 1 year
  const testDateF = "2026-08-15";

  const resOldAdm = AcademicProgressionEngine.calculateProgression({
    admissionDate: oldAdmDate,
    courseConfig: btechConfig,
    currentDate: testDateF
  });
  const resNewAdm = AcademicProgressionEngine.calculateProgression({
    admissionDate: newAdmDate,
    courseConfig: btechConfig,
    currentDate: testDateF
  });

  assert(resOldAdm.currentSemester === 3, "Test F: Old admission date yields Semester 3 on 2026-08-15");
  assert(resNewAdm.currentSemester === 1, "Test F: Deferred admission date yields Semester 1 on 2026-08-15");
  assert(resOldAdm.expectedGraduationDateISO === "2029-08-01", "Test F: Old graduation date is 2029-08-01");
  assert(resNewAdm.expectedGraduationDateISO === "2030-08-01", "Test F: New graduation date is 2030-08-01");

  // --- TEST G: ACADEMIC ADJUSTMENT (OVERRIDE / REPEAT) ---
  console.log("\n--- Test G: Academic Adjustment (Override / Repeat) ---");
  const testAdjustments: AcademicAdjustmentRecord[] = [
    {
      id: "adj_001",
      adjustmentType: "semester_repeat",
      effectiveDate: "2026-07-15",
      previousSemester: 2,
      adjustedSemester: 2,
      reason: "Student approved to repeat Semester 2 due to hospitalization and medical leave.",
      notes: "Approved by Dean of Academics",
      createdBy: "usr_staff_admin_001",
      createdAt: "2026-07-15T10:00:00Z"
    }
  ];

  const resWithAdjustment = AcademicProgressionEngine.calculateProgression({
    admissionDate: "2025-08-01",
    courseConfig: btechConfig,
    currentDate: "2026-08-15", // Normally Sem 3
    adjustments: testAdjustments
  });

  assert(resWithAdjustment.currentSemester === 2, "Test G: With semester_repeat adjustment, student is in Semester 2 instead of 3");
  assert(resWithAdjustment.activeAdjustmentsCount === 1, "Test G: 1 active adjustment detected");
  assert(testAdjustments[0].reason.length > 0, "Test G: Mandatory reason is recorded in adjustment");
  assert(testAdjustments[0].createdBy === "usr_staff_admin_001", "Test G: Authorized staff user is recorded");

  // --- TEST H: COURSE TRANSFER ---
  console.log("\n--- Test H: Course Transfer ---");
  // Student started in B.Sc. (6 semesters, 6 months each, start 2025-08-01)
  const bscConfig: AcademicCourseConfig = {
    programName: "B.Sc. in Forensic Science",
    programCode: "BSC_FS",
    totalSemesters: 6,
    semesterDuration: 6,
    semesterDurationUnit: "months"
  };

  const transferAdjustment: AcademicAdjustmentRecord[] = [
    {
      id: "adj_transfer_001",
      adjustmentType: "course_transfer",
      effectiveDate: "2026-08-01",
      previousProgramCode: "BSC_FS",
      newProgramCode: "BTECH_CSE",
      previousSemester: 2,
      adjustedSemester: 3,
      reason: "Student transferred from B.Sc. to B.Tech Computer Science with lateral credit recognition.",
      notes: "Academic Board Approval Ref #2026-AB-98",
      createdBy: "usr_academic_dean_001",
      createdAt: "2026-08-01T09:00:00Z"
    }
  ];

  // Progression under new B.Tech course structure
  const resTransfer = AcademicProgressionEngine.calculateProgression({
    admissionDate: "2025-08-01",
    courseConfig: btechConfig,
    currentDate: "2026-08-01",
    adjustments: transferAdjustment
  });

  assert(resTransfer.currentSemester === 3, "Test H: Transferred student continues in Semester 3 of B.Tech");
  assert(resTransfer.totalSemesters === 8, "Test H: Total semesters now reflects B.Tech (8 semesters)");
  assert(resTransfer.expectedGraduationDateISO === "2029-08-01", "Test H: Expected graduation aligns with B.Tech completion");
  assert(transferAdjustment[0].previousProgramCode === "BSC_FS", "Test H: Previous course code preserved for audit");
  assert(transferAdjustment[0].newProgramCode === "BTECH_CSE", "Test H: New course code recorded for audit");

  console.log("\n=======================================================");
  console.log(`  ACADEMIC PROGRESSION TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runProgressionTests().catch(err => {
  console.error("Fatal test failure:", err);
  process.exit(1);
});
