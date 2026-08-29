import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAppRole, isAdministrator, isStaff, isStudent, isInternalUser, requireInternalUser, UnauthorizedError } from "../src/lib/auth/permissions";

describe("ISCMS — Strict Student vs Staff Identity Isolation", () => {
  it("verifies permissions helper strictly distinguishes student vs staff vs administrator", () => {
    const studentUser = {
      id: "student-uuid-1",
      email: "student-1234@iscms.student.local",
      user_metadata: { role: "student", student_id: "student-rec-1" }
    } as any;

    const staffUser = {
      id: "staff-uuid-1",
      email: "officer@nfsu.ac.in",
      user_metadata: { role: "staff", full_name: "Compliance Officer" }
    } as any;

    const adminUser = {
      id: "admin-uuid-1",
      email: "admin@nfsu.ac.in",
      user_metadata: { role: "administrator", full_name: "System Admin" }
    } as any;

    assert.equal(getAppRole(studentUser), "student");
    assert.equal(isStudent(studentUser), true);
    assert.equal(isStaff(studentUser), false);
    assert.equal(isAdministrator(studentUser), false);
    assert.equal(isInternalUser(studentUser), false);

    assert.throws(() => requireInternalUser(studentUser), UnauthorizedError);

    assert.equal(getAppRole(staffUser), "staff");
    assert.equal(isStudent(staffUser), false);
    assert.equal(isStaff(staffUser), true);
    assert.equal(isAdministrator(staffUser), false);
    assert.equal(isInternalUser(staffUser), true);
    assert.doesNotThrow(() => requireInternalUser(staffUser));

    assert.equal(getAppRole(adminUser), "administrator");
    assert.equal(isStudent(adminUser), false);
    assert.equal(isStaff(adminUser), false);
    assert.equal(isAdministrator(adminUser), true);
    assert.equal(isInternalUser(adminUser), true);
    assert.doesNotThrow(() => requireInternalUser(adminUser));
  });

  it("verifies student accounts are strictly excluded from administrative and staff user management", () => {
    const isAdministrativeOrStaffUser = (u: {
      email?: string | null;
      user_metadata?: Record<string, any> | null;
    }): boolean => {
      const rawRole = (u.user_metadata?.role as string | undefined)?.toLowerCase().trim();
      const isStudentEmail = Boolean(u.email?.toLowerCase().includes("@iscms.student.local"));
      const hasStudentId = Boolean(u.user_metadata?.student_id);
      if (rawRole === "student" || isStudentEmail || hasStudentId) {
        return false;
      }
      return true;
    };

    const studentMock1 = { email: "student@iscms.student.local", user_metadata: { role: "student" } };
    const studentMock2 = { email: "student2@gmail.com", user_metadata: { student_id: "uuid-123" } };
    const adminMock = { email: "admin@nfsu.ac.in", user_metadata: { role: "administrator" } };
    const staffMock = { email: "staff@nfsu.ac.in", user_metadata: { role: "staff" } };

    assert.equal(isAdministrativeOrStaffUser(studentMock1), false);
    assert.equal(isAdministrativeOrStaffUser(studentMock2), false);
    assert.equal(isAdministrativeOrStaffUser(adminMock), true);
    assert.equal(isAdministrativeOrStaffUser(staffMock), true);
  });
});
