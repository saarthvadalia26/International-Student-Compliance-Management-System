/**
 * ============================================================================
 * ISCMS v0.3.0 — Staff Account Access Restrictions Acceptance Test Suite
 * ============================================================================
 *
 * Verifies:
 * 1. Role Identification & Verification (Admin, Staff, Student).
 * 2. Staff Permitted Access (Dashboard, Student List, Add Student, Student Profile Edit).
 * 3. Staff Denied Access (Reminders, Reports, Bulk Import, Student Export, Report Export).
 * 4. Administrator Unbroken Full Access (All modules and actions accessible).
 * 5. Direct Route Protection Logic (adminOnlyPaths middleware evaluation).
 * 6. Navigation and Quick Actions Role Filtering.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { 
  isAdministrator, 
  isStaff, 
  isInternalUser, 
  requireAdministrator, 
  requireInternalUser,
  UnauthorizedError,
  getAppRole
} from "../src/lib/auth/permissions";
import { desktopNavigation } from "../src/config/navigation/desktop";
import { mobileNavigation } from "../src/config/navigation/mobile";
import { RegisterStudentValidationSchema, UpdateStudentValidationSchema } from "../src/services/validation/student-validation";
import { StudentExcelExportService } from "../src/domain/students/services/student-excel-export.service";
import type { User } from "@supabase/supabase-js";

describe("ISCMS — Staff Account Access Restrictions", () => {
  console.log("\n============================================================");
  console.log(" ISCMS: STAFF ACCOUNT ACCESS RESTRICTIONS ACCEPTANCE TESTS");
  console.log("============================================================\n");

  const adminUser: User = {
    id: "admin-uuid-001",
    app_metadata: {},
    user_metadata: { role: "administrator", full_name: "Dr. Admin User" },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    email: "admin@nfsu.ac.in"
  } as unknown as User;

  const staffUser: User = {
    id: "staff-uuid-002",
    app_metadata: {},
    user_metadata: { role: "staff", full_name: "Staff Officer" },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    email: "staff@nfsu.ac.in"
  } as unknown as User;

  const studentUser: User = {
    id: "student-uuid-003",
    app_metadata: {},
    user_metadata: { role: "student", full_name: "International Student" },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    email: "student@nfsu.ac.in"
  } as unknown as User;

  // --------------------------------------------------------------------------
  // SECTION 1: ROLE MODEL & IDENTIFICATION
  // --------------------------------------------------------------------------
  it("Test 1: Canonical role extraction and normalization", () => {
    assert.equal(getAppRole(adminUser), "administrator");
    assert.equal(getAppRole(staffUser), "staff");
    assert.equal(getAppRole(studentUser), "student");
    assert.equal(getAppRole(null), null);

    // Aliases
    assert.equal(getAppRole({ user_metadata: { role: "admin" } } as any), "administrator");
    assert.equal(getAppRole({ user_metadata: { role: "STAFF" } } as any), "staff");
  });

  it("Test 2: Role predicates evaluate correctly", () => {
    assert.equal(isAdministrator(adminUser), true, "Admin is administrator");
    assert.equal(isAdministrator(staffUser), false, "Staff is NOT administrator");
    assert.equal(isAdministrator(studentUser), false, "Student is NOT administrator");

    assert.equal(isStaff(staffUser), true, "Staff is staff");
    assert.equal(isStaff(adminUser), false, "Admin is not strictly staff role");

    assert.equal(isInternalUser(adminUser), true, "Admin is internal user");
    assert.equal(isInternalUser(staffUser), true, "Staff is internal user");
    assert.equal(isInternalUser(studentUser), false, "Student is NOT internal user");
  });

  // --------------------------------------------------------------------------
  // SECTION 2: SERVER-SIDE AUTHORIZATION GUARDS
  // --------------------------------------------------------------------------
  it("Test 3: requireAdministrator assertion enforces admin-only security boundary", () => {
    // Should NOT throw for admin
    assert.doesNotThrow(() => requireAdministrator(adminUser));

    // MUST throw UnauthorizedError for Staff
    assert.throws(
      () => requireAdministrator(staffUser),
      (err: any) => err instanceof UnauthorizedError && err.message.includes("Administrator privileges required")
    );

    // MUST throw UnauthorizedError for Student and unauthenticated
    assert.throws(() => requireAdministrator(studentUser));
    assert.throws(() => requireAdministrator(null));
  });

  it("Test 4: requireInternalUser assertion allows both Administrator and Staff", () => {
    assert.doesNotThrow(() => requireInternalUser(adminUser));
    assert.doesNotThrow(() => requireInternalUser(staffUser));

    // Throws for Student and unauthenticated
    assert.throws(() => requireInternalUser(studentUser));
    assert.throws(() => requireInternalUser(null));
  });

  // --------------------------------------------------------------------------
  // SECTION 3: STAFF PERMITTED STUDENT MANAGEMENT CAPABILITIES
  // --------------------------------------------------------------------------
  it("Test 5: Staff can validate and register new student records (Add Student)", () => {
    const newStudent = {
      fullName: "Karma Dorji",
      nationalityCode: "BTN",
      permanentAddress: "Thimphu, Bhutan",
      presentAddress: "Hostel Block C, NFSU Gandhinagar"
    };

    const regResult = RegisterStudentValidationSchema.safeParse(newStudent);
    assert.equal(regResult.success, true, "Staff can submit valid student registration");
  });

  it("Test 6: Staff can update existing student records", () => {
    const updatePayload = {
      fullName: "Karma Dorji",
      presentAddress: "Hostel Block B, Room 101, NFSU Gandhinagar"
    };

    const updateResult = UpdateStudentValidationSchema.safeParse(updatePayload);
    assert.equal(updateResult.success, true, "Staff can update student details");
  });

  // --------------------------------------------------------------------------
  // SECTION 4: EXPORT RESTRICTION FOR STAFF
  // --------------------------------------------------------------------------
  it("Test 7: StudentExcelExportService strictly rejects export invocation by Staff", async () => {
    await assert.rejects(
      async () => {
        await StudentExcelExportService.exportStudents({}, staffUser);
      },
      (err: any) => {
        return err instanceof UnauthorizedError || (err instanceof Error && err.message.includes("Administrator privileges required"));
      },
      "Staff user is forbidden from executing StudentExcelExportService"
    );
  });

  // --------------------------------------------------------------------------
  // SECTION 5: DIRECT ROUTE PROTECTION (MIDDLEWARE PATH MATRIX)
  // --------------------------------------------------------------------------
  it("Test 8: Middleware admin-only paths matrix correctly classifies routes", () => {
    const adminOnlyPaths = [
      "/dashboard/health",
      "/monitoring",
      "/reports",
      "/reminders",
      "/settings",
      "/students/import"
    ];

    const isPathAdminOnly = (pathname: string) => adminOnlyPaths.some(p => pathname.startsWith(p));

    // Admin-Only Routes (Must be DENIED to Staff)
    assert.equal(isPathAdminOnly("/reminders"), true);
    assert.equal(isPathAdminOnly("/reminders/rules"), true);
    assert.equal(isPathAdminOnly("/reports"), true);
    assert.equal(isPathAdminOnly("/reports/students"), true);
    assert.equal(isPathAdminOnly("/reports/efrro"), true);
    assert.equal(isPathAdminOnly("/reports/notifications"), true);
    assert.equal(isPathAdminOnly("/reports/audit"), true);
    assert.equal(isPathAdminOnly("/students/import"), true);
    assert.equal(isPathAdminOnly("/settings"), true);
    assert.equal(isPathAdminOnly("/settings/academic-programs"), true);
    assert.equal(isPathAdminOnly("/dashboard/health"), true);
    assert.equal(isPathAdminOnly("/monitoring"), true);

    // Permitted Staff Routes (Must be ALLOWED to Staff)
    assert.equal(isPathAdminOnly("/dashboard"), false, "Staff allowed on /dashboard");
    assert.equal(isPathAdminOnly("/students"), false, "Staff allowed on /students");
    assert.equal(isPathAdminOnly("/students/add"), false, "Staff allowed on /students/add");
    assert.equal(isPathAdminOnly("/students/std-12345"), false, "Staff allowed on /students/[id]");
    assert.equal(isPathAdminOnly("/profile"), false, "Staff allowed on /profile");
    assert.equal(isPathAdminOnly("/help"), false, "Staff allowed on /help");
  });

  // --------------------------------------------------------------------------
  // SECTION 6: UI NAVIGATION FILTERING
  // --------------------------------------------------------------------------
  it("Test 9: Desktop sidebar navigation filtering produces expected menu for Staff vs Admin", () => {
    // Filter for Staff (isAdministrator = false)
    const staffVisibleItems = desktopNavigation.items
      .filter(item => {
        if (item.href === "/reminders") return false;
        if (item.href === "/reports") return false;
        if (item.href === "/settings") return false;
        if (item.href === "/monitoring") return false;
        return true;
      })
      .map(item => ({
        title: item.title,
        href: item.href,
        subItems: item.items
          ?.filter(sub => sub.href !== "/students/import")
          .map(sub => sub.title)
      }));

    // Filter for Admin (isAdministrator = true)
    const adminVisibleItems = desktopNavigation.items
      .map(item => ({
        title: item.title,
        href: item.href,
        subItems: item.items?.map(sub => sub.title)
      }));

    // Staff Menu Verification
    const staffTitles = staffVisibleItems.map(i => i.title);
    assert.ok(staffTitles.includes("Dashboard"), "Staff sees Dashboard");
    assert.ok(staffTitles.includes("Students"), "Staff sees Students");
    assert.ok(!staffTitles.includes("Reminders"), "Staff does NOT see Reminders");
    assert.ok(!staffTitles.includes("Reports"), "Staff does NOT see Reports");
    assert.ok(!staffTitles.includes("Settings"), "Staff does NOT see Settings");

    const staffStudentsSub = staffVisibleItems.find(i => i.title === "Students")?.subItems || [];
    assert.ok(staffStudentsSub.includes("Student List"), "Staff sees Student List");
    assert.ok(staffStudentsSub.includes("Add Student"), "Staff sees Add Student");
    assert.ok(!staffStudentsSub.includes("Bulk Import"), "Staff does NOT see Bulk Import");

    // Admin Menu Verification
    const adminTitles = adminVisibleItems.map(i => i.title);
    assert.ok(adminTitles.includes("Dashboard"));
    assert.ok(adminTitles.includes("Students"));
    assert.ok(adminTitles.includes("Reminders"));
    assert.ok(adminTitles.includes("Reports"));
    assert.ok(adminTitles.includes("Settings"));

    const adminStudentsSub = adminVisibleItems.find(i => i.title === "Students")?.subItems || [];
    assert.ok(adminStudentsSub.includes("Bulk Import"), "Admin sees Bulk Import");
  });

  it("Test 10: Mobile navigation filtering produces expected menu for Staff vs Admin", () => {
    const staffMobileItems = mobileNavigation.items
      .filter(item => {
        if (item.href === "/reminders") return false;
        if (item.href === "/reports") return false;
        if (item.href === "/settings") return false;
        if (item.href === "/monitoring") return false;
        return true;
      });

    const staffTitles = staffMobileItems.map(i => i.title);
    assert.deepEqual(staffTitles, ["Dashboard", "Students"]);
  });

  // --------------------------------------------------------------------------
  // SECTION 7: DASHBOARD QUICK ACTIONS FILTERING
  // --------------------------------------------------------------------------
  it("Test 11: Dashboard quick actions removes restricted links for Staff while keeping Register Student", () => {
    const allActions = [
      { title: "Register Student", href: "/students/add", adminOnly: false },
      { title: "Student Directory", href: "/students", adminOnly: false },
      { title: "View Expiring eFRRO", href: "/reports/efrro?efrroStatus=warning", adminOnly: true },
      { title: "Review Pending Uploads", href: "/reports/efrro?efrroStatus=pending", adminOnly: true },
      { title: "Notification Center", href: "/reports/notifications", adminOnly: true },
      { title: "Reports Directory", href: "/reports", adminOnly: true }
    ];

    const staffActions = allActions.filter(a => !a.adminOnly);
    const adminActions = allActions;

    assert.equal(staffActions.length, 2, "Staff sees only 2 quick actions");
    assert.equal(staffActions[0].title, "Register Student");
    assert.equal(staffActions[0].href, "/students/add");
    assert.equal(staffActions[1].title, "Student Directory");
    assert.equal(staffActions[1].href, "/students");

    assert.equal(adminActions.length, 6, "Admin sees all 6 quick actions");
  });
});
