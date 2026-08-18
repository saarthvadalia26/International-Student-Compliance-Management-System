/**
 * Canonical Academic Level Domain Module
 * Single authoritative source of truth for Academic Level classifications in ISCMS.
 */

export type CanonicalAcademicLevel = 
  | "UNDERGRADUATE"
  | "POSTGRADUATE"
  | "DOCTORATE"
  | "DIPLOMA_CERTIFICATE"
  | "INTEGRATED";

export type AcademicLevel = 
  | CanonicalAcademicLevel
  | "UG"
  | "PG"
  | "PhD"
  | "Diploma"
  | string;

export interface AcademicLevelOption {
  code: string;
  canonicalCode: CanonicalAcademicLevel;
  label: string;
  displayOrder: number;
  description: string;
}

export const ACADEMIC_LEVEL_OPTIONS: readonly AcademicLevelOption[] = [
  {
    code: "UG",
    canonicalCode: "UNDERGRADUATE",
    label: "Undergraduate (UG)",
    displayOrder: 1,
    description: "Undergraduate bachelor degree program (e.g. B.Tech, B.Sc)"
  },
  {
    code: "PG",
    canonicalCode: "POSTGRADUATE",
    label: "Postgraduate (PG)",
    displayOrder: 2,
    description: "Postgraduate master degree program (e.g. M.Tech, M.Sc, MBA)"
  },
  {
    code: "PhD",
    canonicalCode: "DOCTORATE",
    label: "Doctorate (PhD)",
    displayOrder: 3,
    description: "Doctor of Philosophy doctoral research program"
  },
  {
    code: "Diploma",
    canonicalCode: "DIPLOMA_CERTIFICATE",
    label: "Diploma / Cert",
    displayOrder: 4,
    description: "Diploma or specialized certification course"
  },
  {
    code: "INTEGRATED",
    canonicalCode: "INTEGRATED",
    label: "Integrated (UG + PG)",
    displayOrder: 5,
    description: "Integrated combined undergraduate and postgraduate program (e.g. B.Tech + M.Tech, B.Sc + M.Sc)"
  }
] as const;

/**
 * Normalizes any recognized academic level variant to its canonical database representation.
 * Returns null if the input is empty or invalid.
 */
export function normalizeAcademicLevel(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const cleaned = raw.toLowerCase().replace(/[\s\-_/()+,.]+/g, " ").trim();

  // 1. Integrated (UG + PG) variations
  if (
    cleaned === "integrated" ||
    cleaned === "integrated ug pg" ||
    cleaned === "integrated ugpg" ||
    cleaned === "integrated ug + pg" ||
    cleaned === "ug pg" ||
    cleaned === "ugpg" ||
    cleaned === "ug + pg" ||
    cleaned === "ug+pg" ||
    cleaned === "integrated course" ||
    cleaned === "integrated program" ||
    cleaned === "integrated programme" ||
    raw.toUpperCase() === "INTEGRATED"
  ) {
    return "INTEGRATED";
  }

  // 2. Undergraduate (UG) variations
  if (
    cleaned === "ug" ||
    cleaned === "undergraduate" ||
    cleaned === "under graduate" ||
    cleaned === "undergraduate ug" ||
    cleaned === "bachelor" ||
    cleaned === "bachelors" ||
    cleaned === "undergrad" ||
    raw.toUpperCase() === "UNDERGRADUATE" ||
    raw === "UG"
  ) {
    return "UG";
  }

  // 3. Postgraduate (PG) variations
  if (
    cleaned === "pg" ||
    cleaned === "postgraduate" ||
    cleaned === "post graduate" ||
    cleaned === "postgraduate pg" ||
    cleaned === "master" ||
    cleaned === "masters" ||
    cleaned === "postgrad" ||
    raw.toUpperCase() === "POSTGRADUATE" ||
    raw === "PG"
  ) {
    return "PG";
  }

  // 4. Doctorate (PhD) variations
  if (
    cleaned === "phd" ||
    cleaned === "ph d" ||
    cleaned === "doctorate" ||
    cleaned === "doctorate phd" ||
    cleaned === "doctoral" ||
    cleaned === "doctor of philosophy" ||
    raw.toUpperCase() === "DOCTORATE" ||
    raw.toUpperCase() === "PHD" ||
    raw === "PhD"
  ) {
    return "PhD";
  }

  // 5. Diploma / Certificate variations
  if (
    cleaned === "diploma" ||
    cleaned === "diploma cert" ||
    cleaned === "diploma certificate" ||
    cleaned === "certificate" ||
    cleaned === "cert" ||
    cleaned === "diploma / cert" ||
    cleaned === "diploma/cert" ||
    raw.toUpperCase() === "DIPLOMA_CERTIFICATE" ||
    raw.toUpperCase() === "DIPLOMA" ||
    raw === "Diploma"
  ) {
    return "Diploma";
  }

  return null;
}

/**
 * Returns the friendly human-readable display label for any academic level code.
 */
export function getAcademicLevelLabel(level: string | null | undefined): string {
  if (!level) return "Not Specified";
  const norm = normalizeAcademicLevel(level);
  if (!norm) return String(level);

  switch (norm) {
    case "INTEGRATED":
      return "Integrated (UG + PG)";
    case "UG":
      return "Undergraduate (UG)";
    case "PG":
      return "Postgraduate (PG)";
    case "PhD":
      return "Doctorate (PhD)";
    case "Diploma":
      return "Diploma / Cert";
    default:
      return String(level);
  }
}

/**
 * Validates whether an input represents an accepted academic level.
 */
export function isValidAcademicLevel(input: string | null | undefined): boolean {
  if (!input) return false;
  return normalizeAcademicLevel(input) !== null;
}
