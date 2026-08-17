/**
 * Name & Identity Utility Functions
 * 
 * Standardized institutional display name formatting, initials generation,
 * and completion status verification across the ISCMS platform.
 */

/**
 * Generates clean uppercase avatar initials from a real full name.
 * 
 * Institutional Rules:
 * - Multi-word names: Extracts the first letter of the first two words.
 *   - "Rahul Kumar" -> "RK"
 *   - "Dr. Skvadalia Shah" -> "DS"
 *   - "Alexander Wright" -> "AW"
 *   - "Prof. K. Sharma" -> "PK"
 * - Single-word names: Extracts the first two characters.
 *   - "Admin" -> "AD"
 *   - "John" -> "JO"
 * - Missing or empty names: Returns fallback "--".
 * 
 * NOTE: Never generates initials from email addresses.
 */
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return "--";

  const clean = fullName.trim();
  if (!clean) return "--";

  // Split by whitespace and remove empty elements
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "--";
  }

  if (words.length === 1) {
    const single = words[0].replace(/[^a-zA-Z0-9]/g, "");
    if (single.length >= 2) {
      return single.substring(0, 2).toUpperCase();
    }
    return (single.charAt(0) || clean.charAt(0) || "-").toUpperCase();
  }

  // Multi-word name: take the first alphanumeric character of the first word and second word
  const char1 = words[0].replace(/[^a-zA-Z0-9]/g, "").charAt(0) || words[0].charAt(0);
  const char2 = words[1].replace(/[^a-zA-Z0-9]/g, "").charAt(0) || words[1].charAt(0);

  const combined = (char1 + char2).trim().toUpperCase();
  return combined.length > 0 ? combined : "--";
}

/**
 * Formats a canonical display name safely.
 * Returns the trimmed full name if valid (>= 2 characters), otherwise returns the fallback.
 * Never performs email-derived fallbacks.
 */
export function formatDisplayName(
  fullName: string | null | undefined,
  fallback = "Profile Incomplete"
): string {
  if (!fullName || typeof fullName !== "string") {
    return fallback;
  }
  const trimmed = fullName.trim();
  if (trimmed.length < 2) {
    return fallback;
  }
  return trimmed;
}

/**
 * Checks if a real full name is complete and valid for institutional records.
 */
export function isNameComplete(fullName: string | null | undefined): boolean {
  if (!fullName || typeof fullName !== "string") return false;
  const trimmed = fullName.trim();
  // Name must be at least 2 characters and contain at least one alphabet character
  return trimmed.length >= 2 && /[a-zA-Z]/.test(trimmed);
}
