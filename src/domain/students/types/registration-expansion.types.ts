/**
 * Domain Types, Enums, and Utility Functions for Expanded Student Registration
 */

export type MaritalStatus = 
  | "single" 
  | "married" 
  | "divorced" 
  | "widowed" 
  | "separated" 
  | "other" 
  | "prefer_not_to_say";

export type BloodGroup = 
  | "A+" 
  | "A-" 
  | "B+" 
  | "B-" 
  | "AB+" 
  | "AB-" 
  | "O+" 
  | "O-";

export type RelationshipType = 
  | "father" 
  | "mother" 
  | "brother" 
  | "sister" 
  | "guardian" 
  | "husband" 
  | "wife" 
  | "spouse" 
  | "parent" 
  | "local_sponsor" 
  | "other";

export type AdmissionCategory = 
  | "iccr" 
  | "sii" 
  | "direct" 
  | "foreign_govt_sponsored" 
  | "other";

export const MARITAL_STATUS_OPTIONS: Array<{ value: MaritalStatus; label: string }> = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }
];

export const BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-"
];

export const BLOOD_GROUP_OPTIONS: Array<{ value: BloodGroup; label: string }> = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" }
];

export const RELATIONSHIP_TYPE_OPTIONS: Array<{ value: RelationshipType; label: string }> = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "husband", label: "Husband" },
  { value: "wife", label: "Wife" },
  { value: "spouse", label: "Spouse" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "guardian", label: "Guardian" },
  { value: "parent", label: "Parent" },
  { value: "local_sponsor", label: "Local Sponsor" },
  { value: "other", label: "Other" }
];

export const ADMISSION_CATEGORY_OPTIONS: Array<{ value: AdmissionCategory; label: string; requiresSii: boolean; description?: string }> = [
  { 
    value: "iccr", 
    label: "Indian Council for Cultural Relations (ICCR)", 
    requiresSii: true,
    description: "Requires mandatory Study in India (SII) Application Number."
  },
  { 
    value: "sii", 
    label: "Study in India (SII)", 
    requiresSii: false,
    description: "Direct Study in India portal admission track."
  },
  { 
    value: "direct", 
    label: "Direct admission", 
    requiresSii: false,
    description: "Self-financed or direct university admission."
  },
  { 
    value: "foreign_govt_sponsored", 
    label: "Foreign Govt. Sponsored", 
    requiresSii: false,
    description: "Sponsored through international government or embassy scholarship."
  },
  { 
    value: "other", 
    label: "Other", 
    requiresSii: false,
    description: "Custom institutional or bilateral program track."
  }
];

/**
 * Normalizes any incoming date value (string or Date) into a valid Date object.
 */
function parseDateInput(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  const str = String(val).trim();
  if (!str) return null;
  
  // Try direct YYYY-MM-DD parse
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // Try DD/MM/YYYY or MM/DD/YYYY
  if (str.includes("/")) {
    const parts = str.split("/").map(Number);
    if (parts.length === 3) {
      if (parts[2] > 1900) {
        // DD/MM/YYYY
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
  }

  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Calculates accurate chronological age from Date of Birth and a reference date (defaults to today).
 * Properly accounts for leap years and whether the birthday has occurred in the reference year.
 * 
 * Example:
 * DOB = 24 Aug 2002, Reference = 23 Aug 2026 -> Age = 23
 * DOB = 24 Aug 2002, Reference = 24 Aug 2026 -> Age = 24
 */
export function calculateAge(dob: string | Date | null | undefined, asOfDate: Date = new Date()): number | null {
  const birth = parseDateInput(dob);
  if (!birth) return null;

  const asOfYear = asOfDate.getFullYear();
  const asOfMonth = asOfDate.getMonth();
  const asOfDay = asOfDate.getDate();

  const birthYear = birth.getFullYear();
  const birthMonth = birth.getMonth();
  const birthDay = birth.getDate();

  let age = asOfYear - birthYear;

  // If birth month hasn't occurred yet in the current year, or it's the birth month but birth day hasn't occurred yet
  if (asOfMonth < birthMonth || (asOfMonth === birthMonth && asOfDay < birthDay)) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Formats full age calculation with an explicit "As of [date]" explanation for UI presentation.
 */
export function formatAgeDisplay(
  dob: string | Date | null | undefined, 
  asOfDate: Date = new Date()
): { age: number | null; ageText: string; asOfText: string; fullText: string } | null {
  const age = calculateAge(dob, asOfDate);
  if (age === null) return null;

  const day = String(asOfDate.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[asOfDate.getMonth()];
  const year = asOfDate.getFullYear();
  const formattedAsOf = `${day} ${month} ${year}`;

  const ageText = `${age} year${age === 1 ? "" : "s"}`;
  const asOfText = `As of ${formattedAsOf}`;
  const fullText = `${ageText} (${asOfText})`;

  return {
    age,
    ageText,
    asOfText,
    fullText
  };
}
