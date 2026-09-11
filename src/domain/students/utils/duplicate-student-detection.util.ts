/**
 * ISCMS Duplicate Student Detection Utility
 * 
 * Identifies active student records that appear to represent the same individual,
 * such as identical names, or name variations sharing the same date of birth and nationality.
 */

export interface CandidateStudent {
  id: string;
  fullName: string;
  nationalityCode?: string | null;
  dateOfBirth?: string | null;
  passportNumber?: string | null;
  registrationNumber?: string | null;
  programCode?: string | null;
  programName?: string | null;
  createdAt?: string | null;
}

export interface DuplicateStudentGroup {
  groupKey: string;
  primaryName: string;
  reason: string;
  searchTerm: string;
  studentIds: string[];
  students: CandidateStudent[];
}

export function normalizeNameForComparison(name?: string | null): string {
  if (!name) return "";
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNameTokens(name?: string | null): string[] {
  const norm = normalizeNameForComparison(name);
  if (!norm) return [];
  return norm.split(" ").filter(t => t.length > 1);
}

function isInvalidPassportNumber(passport?: string | null): boolean {
  if (!passport) return true;
  const clean = passport.trim().toUpperCase();
  return (
    clean.length < 5 ||
    clean === "NOT PROVIDED" ||
    clean === "NOT_PROVIDED" ||
    clean === "NA" ||
    clean === "N/A" ||
    clean === "NONE" ||
    clean === "UNKNOWN"
  );
}

/**
 * Generates a canonical sorted pair key for two student IDs (e.g. "uuidA::uuidB")
 */
export function generatePairKey(id1: string, id2: string): string {
  return [id1, id2].sort().join("::");
}

/**
 * Computes all canonical pairwise combinations from a list of student IDs
 */
export function getAllPairKeys(ids: string[]): string[] {
  const pairKeys: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairKeys.push(generatePairKey(ids[i], ids[j]));
    }
  }
  return pairKeys;
}

/**
 * Evaluates whether two student candidates constitute duplicate profiles.
 */
export function areStudentsPotentialDuplicates(
  a: CandidateStudent, 
  b: CandidateStudent,
  dismissedPairKeys?: Set<string>
): {
  isDuplicate: boolean;
  reason?: string;
  commonSearchTerm?: string;
} {
  if (a.id === b.id) return { isDuplicate: false };

  // Check if this pair has been explicitly confirmed as different individuals
  const pairKey = generatePairKey(a.id, b.id);
  if (dismissedPairKeys && dismissedPairKeys.has(pairKey)) {
    return { isDuplicate: false };
  }

  const normA = normalizeNameForComparison(a.fullName);
  const normB = normalizeNameForComparison(b.fullName);

  if (!normA || !normB) return { isDuplicate: false };

  // Rule 1: Exact Name Match
  if (normA === normB) {
    return {
      isDuplicate: true,
      reason: `Identical full name: "${a.fullName}"`,
      commonSearchTerm: a.fullName
    };
  }

  // Check DOB and Nationality alignment
  const sameDOB = Boolean(a.dateOfBirth && b.dateOfBirth && a.dateOfBirth.trim() === b.dateOfBirth.trim());
  const sameNat = Boolean(
    a.nationalityCode &&
    b.nationalityCode &&
    a.nationalityCode.trim().toUpperCase() === b.nationalityCode.trim().toUpperCase()
  );

  // Rule 2: Substring Name Containment with same DOB and Nationality
  // E.g. "KOSIMOV DONIYORJON" and "KOSIMOV DONIYORJON BAKHTIYOR UGLI" (DOB: 2000-06-06, UZB)
  if (sameDOB && sameNat) {
    const tokensA = extractNameTokens(a.fullName);
    const tokensB = extractNameTokens(b.fullName);
    const sharedTokens = tokensA.filter(t => tokensB.includes(t));

    if (normA.includes(normB) || normB.includes(normA) || sharedTokens.length >= 2) {
      const searchTerm = sharedTokens.length > 0 ? sharedTokens[0] : (tokensA[0] || a.fullName);
      return {
        isDuplicate: true,
        reason: `Matching Date of Birth (${a.dateOfBirth}), Nationality (${a.nationalityCode}), and name variation`,
        commonSearchTerm: searchTerm
      };
    }
  }

  // Rule 3: Distinct Passport Number Collision
  if (!isInvalidPassportNumber(a.passportNumber) && !isInvalidPassportNumber(b.passportNumber)) {
    if (a.passportNumber!.trim().toUpperCase() === b.passportNumber!.trim().toUpperCase()) {
      return {
        isDuplicate: true,
        reason: `Shared passport number: "${a.passportNumber}"`,
        commonSearchTerm: a.passportNumber!.trim()
      };
    }
  }

  // Rule 4: Substring containment with same Nationality even if DOB is missing on one profile
  // (e.g. one profile was partially registered without DOB)
  if (sameNat) {
    const tokensA = extractNameTokens(a.fullName);
    const tokensB = extractNameTokens(b.fullName);
    const sharedTokens = tokensA.filter(t => tokensB.includes(t));

    if ((normA.includes(normB) || normB.includes(normA)) && sharedTokens.length >= 2) {
      const searchTerm = sharedTokens[0];
      return {
        isDuplicate: true,
        reason: `Matching Nationality (${a.nationalityCode}) and overlapping name tokens (${sharedTokens.join(" ")})`,
        commonSearchTerm: searchTerm
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Discovers and groups all duplicate student profiles from a candidate list.
 * Any pairs in `dismissedPairKeys` or groups in `dismissedGroupKeys` are excluded.
 */
export function findDuplicateStudentGroups(
  candidates: CandidateStudent[],
  dismissedPairKeys?: Set<string>,
  dismissedGroupKeys?: Set<string>
): DuplicateStudentGroup[] {
  const groups: DuplicateStudentGroup[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    if (assigned.has(a.id)) continue;

    const matchingGroupMembers: CandidateStudent[] = [a];
    let groupReason = "";
    let searchTerm = a.fullName.split(" ")[0] || a.fullName;

    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      if (assigned.has(b.id)) continue;

      const evalResult = areStudentsPotentialDuplicates(a, b, dismissedPairKeys);
      if (evalResult.isDuplicate) {
        matchingGroupMembers.push(b);
        assigned.add(b.id);
        if (!groupReason && evalResult.reason) {
          groupReason = evalResult.reason;
        }
        if (evalResult.commonSearchTerm) {
          searchTerm = evalResult.commonSearchTerm;
        }
      }
    }

    if (matchingGroupMembers.length > 1) {
      assigned.add(a.id);
      
      // Choose primary name as the longest or most descriptive name
      const sortedByLength = [...matchingGroupMembers].sort(
        (m1, m2) => m2.fullName.length - m1.fullName.length
      );
      const primaryName = sortedByLength[0].fullName;

      const groupKey = normalizeNameForComparison(primaryName)
        .toLowerCase()
        .replace(/\s+/g, "-");

      if (dismissedGroupKeys && dismissedGroupKeys.has(groupKey)) {
        continue;
      }

      groups.push({
        groupKey,
        primaryName,
        reason: groupReason || `Multiple active records found for "${primaryName}"`,
        searchTerm,
        studentIds: matchingGroupMembers.map(m => m.id),
        students: matchingGroupMembers
      });
    }
  }

  return groups;
}
