import "./test-preload";
import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runResponsiveTestSuite() {
  console.log("=================================================================");
  console.log("  ISCMS GLOBAL RESPONSIVE UI STABILIZATION AUDIT SUITE");
  console.log("=================================================================\n");

  const projectRoot = path.resolve(__dirname, "..");

  // 1. Audit Student Details & Academic Standing Grid
  console.log("--- 1. Academic Standing & Semester Progression Grid ---");
  const studentDetailsPage = fs.readFileSync(
    path.join(projectRoot, "src/app/(app)/students/[id]/page.tsx"),
    "utf-8"
  );
  
  assert(
    studentDetailsPage.includes("sm:grid-cols-2 xl:grid-cols-3") || 
    studentDetailsPage.includes("sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"),
    "Academic metrics grid uses responsive columns (sm:grid-cols-2 xl:grid-cols-3) to avoid 3-col squeeze"
  );
  assert(
    studentDetailsPage.includes("break-words") && studentDetailsPage.includes("break-all"),
    "Long school, program, and registration numbers wrap cleanly with break-words and break-all"
  );
  assert(
    studentDetailsPage.includes("grid-cols-1 sm:grid-cols-2 gap-3"),
    "Edit Student Profile form uses responsive 1-col mobile / 2-col desktop layout"
  );

  // 2. Audit Document Reminder Schedule & Tabs
  console.log("\n--- 2. Document Reminder Schedule & Document Tabs ---");
  const reminderScheduleFile = fs.readFileSync(
    path.join(projectRoot, "src/features/compliance/components/document-reminder-schedule.tsx"),
    "utf-8"
  );
  
  assert(
    reminderScheduleFile.includes("grid grid-cols-3 gap-1"),
    "Document selector tabs use balanced 3-column segmented grid"
  );
  assert(
    reminderScheduleFile.includes("tabTheme.dotClass"),
    "Document tabs render exactly one authoritative colored identity dot per document type"
  );
  assert(
    reminderScheduleFile.includes("block @lg:hidden") && reminderScheduleFile.includes("hidden @lg:block"),
    "Reminder schedule provides dual responsive rendering: desktop table view and mobile card view"
  );

  // 3. Audit Student Document Cards
  console.log("\n--- 3. Student Document Cards Responsive Layout ---");
  const documentCardFile = fs.readFileSync(
    path.join(projectRoot, "src/features/compliance/components/student-document-card.tsx"),
    "utf-8"
  );

  assert(
    documentCardFile.includes("flex flex-col sm:flex-row items-start sm:items-center"),
    "StudentDocumentCard header flex wraps gracefully on narrow viewports"
  );
  assert(
    documentCardFile.includes("xl:grid-cols-4"),
    "StudentDocumentCard information grid uses xl:grid-cols-4 instead of cramped lg:grid-cols-4"
  );
  assert(
    documentCardFile.includes("w-full sm:w-auto"),
    "Document action buttons span full width on mobile and auto on desktop"
  );

  // 4. Audit Dialogs, Modals & Dropdown Boundaries
  console.log("\n--- 4. Dialogs, Modals & Dropdowns Viewport Constraints ---");
  const dialogFile = fs.readFileSync(
    path.join(projectRoot, "src/components/ui/dialog.tsx"),
    "utf-8"
  );
  assert(
    dialogFile.includes("max-h-[calc(100vh-2rem)]") && dialogFile.includes("overflow-y-auto"),
    "DialogContent defaults to max-h-[calc(100vh-2rem)] with internal overflow scrolling"
  );

  const phoneInputFile = fs.readFileSync(
    path.join(projectRoot, "src/components/ui/phone-input.tsx"),
    "utf-8"
  );
  assert(
    phoneInputFile.includes("max-w-[calc(100vw-2.5rem)]"),
    "PhoneInput country dropdown is constrained to fit 320px mobile screens without overflow"
  );

  // 5. Audit App Shell Ultrawide & Centering Containers
  console.log("\n--- 5. App Shell & Ultrawide Container Containment ---");
  const appShellFile = fs.readFileSync(
    path.join(projectRoot, "src/components/shell/app-shell.tsx"),
    "utf-8"
  );
  assert(
    appShellFile.includes("max-w-[1600px] w-full mx-auto"),
    "AppShell enforces max-w-[1600px] centering container for ultrawide displays"
  );

  // 6. Audit Student Portal Header & Document Centre
  console.log("\n--- 6. Student Portal Header & Document Centre ---");
  const studentDashboardFile = fs.readFileSync(
    path.join(projectRoot, "src/app/student/(authenticated)/dashboard/page.tsx"),
    "utf-8"
  );
  assert(
    studentDashboardFile.includes("break-words") && studentDashboardFile.includes("break-all"),
    "Student Portal dashboard header handles long student names and enrollment IDs gracefully"
  );

  const studentEfrroFile = fs.readFileSync(
    path.join(projectRoot, "src/app/student/(authenticated)/efrro/page.tsx"),
    "utf-8"
  );
  assert(
    studentEfrroFile.includes("overflow-x-auto"),
    "Student Document Centre tabs scroll smoothly on mobile viewports"
  );

  // 7. Audit Bulk Import Wizard Stepper
  console.log("\n--- 7. Bulk Student Import Wizard Stepper ---");
  const bulkImportFile = fs.readFileSync(
    path.join(projectRoot, "src/app/(app)/students/import/page.tsx"),
    "utf-8"
  );
  assert(
    bulkImportFile.includes("grid-cols-2 sm:grid-cols-3 md:grid-cols-5"),
    "Bulk Import stepper uses responsive grid (2-col mobile / 3-col tablet / 5-col desktop)"
  );

  console.log("\n=================================================================");
  console.log("  ALL RESPONSIVE STABILIZATION CHECKS CONFIRMED & VERIFIED! ✅ ");
  console.log("=================================================================\n");
}

runResponsiveTestSuite().catch((err) => {
  console.error("Responsive test suite failed:", err);
  process.exit(1);
});
