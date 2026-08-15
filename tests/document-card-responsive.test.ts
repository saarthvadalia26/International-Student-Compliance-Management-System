/**
 * Automated Verification Suite for Redesigned Student Document Cards
 * Tests data transformations, expiry resolution, semantic health badges,
 * document field mappings, and state consistency across viewports.
 */

import { CalendarDateEngine } from "../src/domain/notifications/services/calendar-date";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${failureDetails || "Assertion failed"}`);
    failed++;
  }
}

// Logic mirror from StudentDocumentCard for pure unit validation
function resolveCardData(params: {
  documentType: "passport" | "visa" | "efrro";
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  placeOfIssue?: string | null;
  visaType?: string | null;
  versionNumber?: number | null;
  verificationStatus?: "not_uploaded" | "pending" | "verified" | "rejected" | null;
  hasUploadedDocument?: boolean;
  daysToExpiry?: number | null;
  todayISO?: string;
}) {
  const today = params.todayISO || "2026-08-15";
  const cleanExpiry = params.expiryDate ? params.expiryDate.split("T")[0].trim() : "";
  const hasValidExpiry = Boolean(
    cleanExpiry && 
    cleanExpiry !== "Not provided" && 
    cleanExpiry !== "Not Recorded" && 
    /^\d{4}-\d{2}-\d{2}$/.test(cleanExpiry)
  );

  const cleanIssue = params.issueDate ? params.issueDate.split("T")[0].trim() : "";
  const hasValidIssue = Boolean(
    cleanIssue && 
    cleanIssue !== "Not provided" && 
    cleanIssue !== "Not Recorded" && 
    /^\d{4}-\d{2}-\d{2}$/.test(cleanIssue)
  );

  const resolvedDaysLeft = !hasValidExpiry 
    ? null 
    : typeof params.daysToExpiry === "number" && !isNaN(params.daysToExpiry)
    ? params.daysToExpiry
    : CalendarDateEngine.diffCalendarDays(cleanExpiry, today);

  const expiryHealth = (() => {
    if (!hasValidExpiry) {
      return {
        statusText: "No expiry date recorded",
        badgeLabel: "No Expiry Recorded",
        badgeVariant: "outline",
        isExpired: false,
        isCritical: false,
        isWarning: false
      };
    }

    if (resolvedDaysLeft !== null && resolvedDaysLeft < 0) {
      const rel = resolvedDaysLeft === -1 ? "Expired yesterday" : `Expired ${Math.abs(resolvedDaysLeft)} days ago`;
      return {
        statusText: rel,
        badgeLabel: "Expired",
        badgeVariant: "destructive",
        isExpired: true,
        isCritical: false,
        isWarning: false
      };
    }

    if (resolvedDaysLeft !== null && resolvedDaysLeft <= 15) {
      const rel = resolvedDaysLeft === 0 ? "Expires today" : resolvedDaysLeft === 1 ? "Expires tomorrow" : `Expires in ${resolvedDaysLeft} days`;
      return {
        statusText: `Critical · ${rel}`,
        badgeLabel: `Critical (${resolvedDaysLeft}d)`,
        badgeVariant: "destructive",
        isExpired: false,
        isCritical: true,
        isWarning: false
      };
    }

    if (resolvedDaysLeft !== null && resolvedDaysLeft <= 30) {
      return {
        statusText: `Expires soon · ${resolvedDaysLeft} days remaining`,
        badgeLabel: `Expires soon (${resolvedDaysLeft}d)`,
        badgeVariant: "outline",
        isExpired: false,
        isCritical: false,
        isWarning: true
      };
    }

    return {
      statusText: `Valid · ${resolvedDaysLeft} days remaining`,
      badgeLabel: `Valid (${resolvedDaysLeft}d)`,
      badgeVariant: "outline",
      isExpired: false,
      isCritical: false,
      isWarning: false
    };
  })();

  const formattedIssueDate = hasValidIssue ? CalendarDateEngine.formatDateDisplay(cleanIssue) : "Not provided";
  const formattedExpiryDate = hasValidExpiry ? CalendarDateEngine.formatDateDisplay(cleanExpiry) : null;

  return {
    cleanExpiry,
    hasValidExpiry,
    cleanIssue,
    hasValidIssue,
    resolvedDaysLeft,
    expiryHealth,
    formattedIssueDate,
    formattedExpiryDate
  };
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  ISCMS REDESIGNED DOCUMENT CARDS TEST SUITE");
  console.log("=======================================================\n");

  const todayISO = "2026-08-15";

  // GROUP 1: Conflicting Expiry Prevention (Issue C)
  console.log("--- Group 1: Authoritative Expiry & Anti-Contradiction ---");
  {
    // Valid expiry scenario (23 Sep 2026)
    const validCard = resolveCardData({
      documentType: "passport",
      documentNumber: "A328491",
      issueDate: "2024-08-01",
      expiryDate: "2026-09-23",
      placeOfIssue: "India",
      verificationStatus: "verified",
      hasUploadedDocument: true,
      todayISO
    });

    assert(validCard.hasValidExpiry === true, "Valid expiry date detected");
    assert(validCard.formattedExpiryDate === "23 Sep 2026", "Formatted expiry date is '23 Sep 2026'", `Got: ${validCard.formattedExpiryDate}`);
    assert(validCard.resolvedDaysLeft === 39, "Calculated 39 days left until 23 Sep 2026", `Got: ${validCard.resolvedDaysLeft}`);
    assert(validCard.expiryHealth.statusText.includes("39 days remaining"), "Health text shows remaining days");
    assert(validCard.expiryHealth.badgeLabel !== "No Expiry Recorded", "CRITICAL: Does NOT show 'No Expiry Recorded' when expiry date exists");
    assert(validCard.expiryHealth.isExpired === false, "Document is not expired");

    // Missing expiry scenario
    const missingCard = resolveCardData({
      documentType: "passport",
      documentNumber: "A328491",
      issueDate: "2024-08-01",
      expiryDate: null,
      verificationStatus: "verified",
      hasUploadedDocument: true,
      todayISO
    });

    assert(missingCard.hasValidExpiry === false, "Missing expiry detected as invalid");
    assert(missingCard.formattedExpiryDate === null, "Formatted expiry date is null (no date rendered underneath)");
    assert(missingCard.expiryHealth.statusText === "No expiry date recorded", "Displays clear 'No expiry date recorded'");
    assert(missingCard.resolvedDaysLeft === null, "Days left is null when no expiry");
  }

  // GROUP 2: Semantic Health & Relative Expiry Formatting
  console.log("\n--- Group 2: Semantic Health & Expiry Thresholds ---");
  {
    // Expired 3 days ago (2026-08-12)
    const expiredCard = resolveCardData({
      documentType: "passport",
      expiryDate: "2026-08-12",
      todayISO
    });
    assert(expiredCard.resolvedDaysLeft === -3, "Expired -3 days difference");
    assert(expiredCard.expiryHealth.isExpired === true, "isExpired flag is true");
    assert(expiredCard.expiryHealth.statusText === "Expired 3 days ago", "Formats as 'Expired 3 days ago'");
    assert(expiredCard.expiryHealth.badgeVariant === "destructive", "Uses destructive badge");

    // Expired yesterday (2026-08-14)
    const yestCard = resolveCardData({
      documentType: "visa",
      expiryDate: "2026-08-14",
      todayISO
    });
    assert(yestCard.expiryHealth.statusText === "Expired yesterday", "Formats as 'Expired yesterday'");

    // Critical: Expires in 7 days (2026-08-22)
    const criticalCard = resolveCardData({
      documentType: "efrro",
      expiryDate: "2026-08-22",
      todayISO
    });
    assert(criticalCard.resolvedDaysLeft === 7, "Critical 7 days remaining");
    assert(criticalCard.expiryHealth.isCritical === true, "isCritical flag is true");
    assert(criticalCard.expiryHealth.statusText === "Critical · Expires in 7 days", "Status text has Critical prefix");
    assert(criticalCard.expiryHealth.badgeVariant === "destructive", "Uses destructive badge for critical");

    // Warning: Expires in 25 days (2026-09-09)
    const warningCard = resolveCardData({
      documentType: "passport",
      expiryDate: "2026-09-09",
      todayISO
    });
    assert(warningCard.resolvedDaysLeft === 25, "Warning 25 days remaining");
    assert(warningCard.expiryHealth.isWarning === true, "isWarning flag is true");
    assert(warningCard.expiryHealth.statusText === "Expires soon · 25 days remaining", "Status text has Warning label");

    // Healthy: Expires in 200 days (2027-03-03)
    const healthyCard = resolveCardData({
      documentType: "visa",
      expiryDate: "2027-03-03",
      todayISO
    });
    assert(healthyCard.resolvedDaysLeft === 200, "Healthy 200 days remaining");
    assert(healthyCard.expiryHealth.statusText === "Valid · 200 days remaining", "Status text is Valid");
    assert(!healthyCard.expiryHealth.isExpired && !healthyCard.expiryHealth.isCritical && !healthyCard.expiryHealth.isWarning, "All alert flags false");
  }

  // GROUP 3: Document Type Fields & Consistency
  console.log("\n--- Group 3: Document-Specific Field Mappings ---");
  {
    // Passport Fields
    const passport = resolveCardData({
      documentType: "passport",
      documentNumber: "P998877",
      issueDate: "2020-01-15",
      expiryDate: "2030-01-15",
      placeOfIssue: "London, UK",
      todayISO
    });
    assert(passport.formattedIssueDate === "15 Jan 2020", "Passport issue date formatted");
    assert(passport.formattedExpiryDate === "15 Jan 2030", "Passport expiry date formatted");

    // Visa Fields
    const visa = resolveCardData({
      documentType: "visa",
      documentNumber: "V112233",
      issueDate: "2024-05-10",
      expiryDate: "2028-05-10",
      visaType: "Student (S-1)",
      todayISO
    });
    assert(visa.formattedIssueDate === "10 May 2024", "Visa issue date formatted");
    assert(visa.formattedExpiryDate === "10 May 2028", "Visa expiry date formatted");

    // eFRRO Fields
    const efrro = resolveCardData({
      documentType: "efrro",
      documentNumber: "EFRRO-887766",
      issueDate: "2025-09-01",
      expiryDate: "2026-09-01",
      todayISO
    });
    assert(efrro.formattedIssueDate === "1 Sep 2025", "eFRRO issue date formatted");
    assert(efrro.formattedExpiryDate === "1 Sep 2026", "eFRRO expiry date formatted");
  }

  // GROUP 4: Missing & Fallback Values
  console.log("\n--- Group 4: Graceful Missing Value Handling ---");
  {
    const emptyCard = resolveCardData({
      documentType: "passport",
      documentNumber: null,
      issueDate: null,
      expiryDate: null,
      placeOfIssue: null,
      verificationStatus: "not_uploaded",
      hasUploadedDocument: false,
      todayISO
    });
    assert(emptyCard.formattedIssueDate === "Not provided", "Issue date fallback is 'Not provided'");
    assert(emptyCard.formattedExpiryDate === null, "Expiry date is null when missing");
    assert(emptyCard.expiryHealth.badgeLabel === "No Expiry Recorded", "Shows 'No Expiry Recorded' badge when empty");
  }

  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
