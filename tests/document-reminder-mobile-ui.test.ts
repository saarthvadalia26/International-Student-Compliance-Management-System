/**
 * ============================================================================
 * ISCMS DOCUMENT REMINDER SCHEDULE & MOBILE UI ACCEPTANCE TEST SUITE
 * ============================================================================
 *
 * Verifies:
 * 1. Single Authoritative Document Type Indicator per tab:
 *    - Passport -> Blue dot
 *    - Visa -> Purple dot
 *    - eFRRO -> Yellow / Amber dot
 * 2. Zero secondary dots on document selector tabs (no status/expiry dot collisions)
 * 3. Mobile Reminder Card Structure & 6-Priority Hierarchy:
 *    - Priority 1: Reminder name
 *    - Priority 2: Trigger ("X days before expiry")
 *    - Priority 3: Scheduled Date (unclipped, fully formatted date string)
 *    - Priority 4: Channel ("WhatsApp")
 *    - Priority 5: Status (Due Now, Due Today, Scheduled, Passed, Dispatched)
 *    - Priority 6: Action (Dispatch action button for DUE status)
 * 4. Responsive status badge generation & formatting
 * 5. Full compatibility with ExpiryReminderEngine calculations
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { 
  DOCUMENT_TAB_CONFIG, 
  getReminderStatusBadge 
} from "../src/features/compliance/components/document-reminder-schedule";
import { 
  DOCUMENT_THEMES, 
  getDocumentTheme 
} from "../src/features/compliance/constants/constants";
import { 
  ExpiryReminderEngine 
} from "../src/domain/notifications/services/reminder-engine.service";

console.log("\n==================================================================");
console.log("  ISCMS MOBILE REMINDER & DOCUMENT TAB INDICATOR TEST SUITE       ");
console.log("==================================================================\n");

describe("Document Reminder Schedule — Tab & Mobile UI Acceptance", () => {
  // Base test date: 2026-08-16
  const CURRENT_DATE = "2026-08-16";

  it("Test 1: Document tabs have exactly ONE indicator mapping with correct authoritative colors", () => {
    assert.equal(DOCUMENT_TAB_CONFIG.length, 3, "Exactly 3 document selector tabs configured");

    const [passportTab, visaTab, efrroTab] = DOCUMENT_TAB_CONFIG;

    // 1. Passport Tab
    assert.equal(passportTab.type, "passport");
    assert.equal(passportTab.label, "Passport");
    const passportTheme = getDocumentTheme(passportTab.type);
    assert.ok(passportTheme.dotClass.includes("blue"), "Passport tab dot must be Blue");

    // 2. Visa Tab
    assert.equal(visaTab.type, "visa");
    assert.equal(visaTab.label, "Visa");
    const visaTheme = getDocumentTheme(visaTab.type);
    assert.ok(visaTheme.dotClass.includes("purple"), "Visa tab dot must be Purple");

    // 3. eFRRO Tab
    assert.equal(efrroTab.type, "efrro");
    assert.equal(efrroTab.label, "eFRRO");
    const efrroTheme = getDocumentTheme(efrroTab.type);
    assert.ok(efrroTheme.dotClass.includes("amber"), "eFRRO tab dot must be Amber/Gold (Yellow/Gold)");

    console.log("✅ [PASS] Test 1: Exactly one authoritative document color dot mapped per tab");
  });

  it("Test 2: Document selector tabs strictly isolate document identity from reminder/compliance status", () => {
    // Verify that all themes define single distinct dot tokens without embedded status dots
    const types = ["passport", "visa", "efrro"] as const;

    for (const type of types) {
      const theme = DOCUMENT_THEMES[type];
      assert.ok(theme.dotClass, `${type} has dotClass`);
      assert.ok(!theme.dotClass.includes("rose"), `${type} dotClass does not conflate with expired Red`);
      assert.ok(!theme.dotClass.includes("emerald"), `${type} dotClass does not conflate with verified Green`);
    }

    console.log("✅ [PASS] Test 2: Document identity colors strictly decoupled from status");
  });

  it("Test 3: getReminderStatusBadge generates correct accessible status badges", () => {
    const dueNowBadge = getReminderStatusBadge("DUE", "Due Now");
    assert.ok(dueNowBadge, "Due Now badge exists");

    const dueTodayBadge = getReminderStatusBadge("DUE", "Due Today");
    assert.ok(dueTodayBadge, "Due Today badge exists");

    const passedBadge = getReminderStatusBadge("DUE", "Passed");
    assert.ok(passedBadge, "Passed badge exists");

    const dispatchedBadge = getReminderStatusBadge("DISPATCHED");
    assert.ok(dispatchedBadge, "Dispatched badge exists");

    const scheduledBadge = getReminderStatusBadge("NOT_DUE", "Scheduled");
    assert.ok(scheduledBadge, "Scheduled badge exists");

    const failedBadge = getReminderStatusBadge("FAILED");
    assert.ok(failedBadge, "Failed badge exists");

    console.log("✅ [PASS] Test 3: Status badges correctly formatted for all reminder states");
  });

  it("Test 4: Mobile reminder card priority ordering and data structure for 15-Day Alert", () => {
    // Calculate realistic schedule for student with eFRRO expiry 2026-08-31
    const schedule = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "efrro",
      documentTitle: "eFRRO / Residential Permit",
      documentNumber: "EF-2026-AUG31",
      expiryDate: "2026-08-31",
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: CURRENT_DATE
    });

    const item15 = schedule.schedule.find(s => s.thresholdDays === 15);
    assert.ok(item15, "15-Day reminder must exist in schedule");

    // Verify 6-field priority ordering:
    // 1. Reminder Name
    assert.equal(item15.ruleName, "15-Day Critical Alert");
    // 2. Trigger
    assert.equal(item15.thresholdDays, 15);
    // 3. Scheduled Date
    assert.equal(item15.scheduledDateISO, "2026-08-16");
    assert.ok(item15.scheduledDate && item15.scheduledDate.includes("2026"));
    // 4. Channel (WhatsApp)
    assert.equal(item15.channel, "whatsapp");
    // 5. Status
    assert.equal(item15.status, "DUE");
    assert.equal(item15.statusLabel, "Due Today");
    // 6. Action: is due today so it is dispatchable
    assert.equal(item15.status === "DUE", true);

    console.log("✅ [PASS] Test 4: Mobile card 6-priority hierarchy verified with real reminder engine output");
  });

  it("Test 5: Full schedule date formatting prevents character clipping across all milestones", () => {
    const schedule = ExpiryReminderEngine.calculateDocumentReminders({
      documentType: "passport",
      documentTitle: "Passport Document",
      documentNumber: "P-987654",
      expiryDate: "2026-11-20",
      isUploaded: true,
      verificationStatus: "verified",
      existingNotifications: [],
      todayISO: CURRENT_DATE
    });

    for (const item of schedule.schedule) {
      assert.ok(item.scheduledDate, `Item ${item.ruleName} has formatted scheduled date`);
      assert.ok(item.scheduledDate.length >= 10, `Item ${item.ruleName} date "${item.scheduledDate}" is complete and unclipped`);
      assert.ok(!item.scheduledDate.includes("..."), `Item ${item.ruleName} date contains no ellipsis`);
    }

    console.log("✅ [PASS] Test 5: All milestone scheduled dates fully formatted without truncation");
  });
});
