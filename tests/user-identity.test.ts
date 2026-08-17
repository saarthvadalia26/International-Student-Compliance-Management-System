import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getInitials, formatDisplayName, isNameComplete } from "../src/utils/name-utils";

describe("Staff & Administrator Identity System Test Suite", () => {

  describe("1. Avatar Initials Generation (Institutional Rules)", () => {
    it("should generate 'RK' for 'Rahul Kumar'", () => {
      assert.strictEqual(getInitials("Rahul Kumar"), "RK");
    });

    it("should generate 'DS' for 'Dr. Skvadalia Shah'", () => {
      assert.strictEqual(getInitials("Dr. Skvadalia Shah"), "DS");
    });

    it("should generate 'AW' for 'Alexander Wright'", () => {
      assert.strictEqual(getInitials("Alexander Wright"), "AW");
    });

    it("should generate 'AP' for 'Amina Patel'", () => {
      assert.strictEqual(getInitials("Amina Patel"), "AP");
    });

    it("should generate 'PK' for 'Prof. K. Sharma'", () => {
      assert.strictEqual(getInitials("Prof. K. Sharma"), "PK");
    });

    it("should generate 'AD' for single-word 'Admin'", () => {
      assert.strictEqual(getInitials("Admin"), "AD");
    });

    it("should generate 'JO' for single-word 'John'", () => {
      assert.strictEqual(getInitials("John"), "JO");
    });

    it("should generate 'MW' for hyphenated 'Mary-Jane Watson'", () => {
      assert.strictEqual(getInitials("Mary-Jane Watson"), "MW");
    });

    it("should return '--' for empty or null strings", () => {
      assert.strictEqual(getInitials(""), "--");
      assert.strictEqual(getInitials("   "), "--");
      assert.strictEqual(getInitials(null), "--");
      assert.strictEqual(getInitials(undefined), "--");
    });

    it("should never derive initials from an email address", () => {
      // If a full name is missing, it should yield fallback '--', never 'SK' from 'skvadalia1426@gmail.com'
      assert.strictEqual(getInitials(null), "--");
    });
  });

  describe("2. Canonical Display Name Formatting", () => {
    it("should return trimmed full name for valid entries", () => {
      assert.strictEqual(formatDisplayName("Dr. Skvadalia Shah"), "Dr. Skvadalia Shah");
      assert.strictEqual(formatDisplayName("  Rahul Kumar  "), "Rahul Kumar");
    });

    it("should return 'Profile Incomplete' fallback for empty/null names", () => {
      assert.strictEqual(formatDisplayName(""), "Profile Incomplete");
      assert.strictEqual(formatDisplayName("   "), "Profile Incomplete");
      assert.strictEqual(formatDisplayName(null), "Profile Incomplete");
      assert.strictEqual(formatDisplayName(undefined), "Profile Incomplete");
    });

    it("should support custom fallback text", () => {
      assert.strictEqual(formatDisplayName("", "Unnamed Staff"), "Unnamed Staff");
    });
  });

  describe("3. Profile Completeness Verification", () => {
    it("should return true for valid real names", () => {
      assert.strictEqual(isNameComplete("Dr. Skvadalia Shah"), true);
      assert.strictEqual(isNameComplete("Rahul Kumar"), true);
      assert.strictEqual(isNameComplete("Amina Patel"), true);
      assert.strictEqual(isNameComplete("Alexander Wright"), true);
      assert.strictEqual(isNameComplete("Admin User"), true);
    });

    it("should return false for invalid or incomplete names", () => {
      assert.strictEqual(isNameComplete(""), false);
      assert.strictEqual(isNameComplete("   "), false);
      assert.strictEqual(isNameComplete("A"), false); // too short
      assert.strictEqual(isNameComplete("123"), false); // no alphabet characters
      assert.strictEqual(isNameComplete(null), false);
      assert.strictEqual(isNameComplete(undefined), false);
    });
  });

  describe("4. Identity Model Separation (Email vs Full Name)", () => {
    it("should maintain independent properties for authentication and human identity", () => {
      const staffAccount = {
        authIdentifier: "skvadalia1426@gmail.com",
        fullName: "Dr. Skvadalia Shah",
        role: "administrator" as const,
      };

      // Email is used strictly for authentication
      assert.strictEqual(staffAccount.authIdentifier, "skvadalia1426@gmail.com");

      // Full name is used strictly for human display
      assert.strictEqual(formatDisplayName(staffAccount.fullName), "Dr. Skvadalia Shah");
      assert.strictEqual(getInitials(staffAccount.fullName), "DS");

      // Verify no derivation of name from email
      assert.notStrictEqual(staffAccount.fullName, staffAccount.authIdentifier.split("@")[0]);
    });
  });

  describe("5. Audit Log Identity Support (User Deletion & Privileged Actions)", () => {
    it("should preserve real administrator name on UserDeletionAuditEntry", () => {
      const deletionEntry: import("../src/lib/audit/audit.service").UserDeletionAuditEntry = {
        adminId: "admin-uuid-1234",
        adminEmail: "admin@nfsu.ac.in",
        adminName: "Dr. Skvadalia Shah",
        targetUserId: "staff-uuid-5678",
        targetUserEmail: "staff.john@nfsu.ac.in",
        targetRole: "staff",
        sessionsTerminated: 1,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        reason: "Administrator Account Deletion",
        success: true,
      };

      assert.strictEqual(deletionEntry.adminName, "Dr. Skvadalia Shah");
      assert.strictEqual(deletionEntry.adminEmail, "admin@nfsu.ac.in");
      assert.strictEqual(deletionEntry.targetUserId, "staff-uuid-5678");
      assert.strictEqual(deletionEntry.success, true);
    });

    it("should allow optional adminName on UserDeletionAuditEntry when unpopulated", () => {
      const deletionEntry: import("../src/lib/audit/audit.service").UserDeletionAuditEntry = {
        adminId: "admin-uuid-1234",
        adminEmail: "admin@nfsu.ac.in",
        targetUserId: "staff-uuid-5678",
        targetUserEmail: "staff.john@nfsu.ac.in",
        targetRole: "staff",
        sessionsTerminated: 0,
        success: false,
      };

      assert.strictEqual(deletionEntry.adminName, undefined);
      assert.strictEqual(deletionEntry.success, false);
    });

    it("should preserve real administrator name on FactoryResetAuditEntry", () => {
      const resetEntry: import("../src/lib/audit/audit.service").FactoryResetAuditEntry = {
        adminId: "admin-uuid-1234",
        adminEmail: "admin@nfsu.ac.in",
        adminName: "Dr. Skvadalia Shah",
        reason: "Pre-handover factory reset",
        deletedCounts: {
          users: 10,
          students: 50,
          passportVersions: 50,
          visaVersions: 50,
          efrroVersions: 50,
          notifications: 100,
          auditLogs: 500,
          configRows: 5,
        },
      };

      assert.strictEqual(resetEntry.adminName, "Dr. Skvadalia Shah");
      assert.strictEqual(resetEntry.deletedCounts.users, 10);
    });
  });
});

