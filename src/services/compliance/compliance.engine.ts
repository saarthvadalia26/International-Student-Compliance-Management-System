export type ComplianceStatus = "compliant" | "warning" | "non_compliant" | "expired";

export interface DocumentInfo {
  type: "passport" | "visa" | "efrro";
  number: string;
  issueDate: Date;
  expiryDate: Date;
  verificationStatus: "pending" | "verified" | "rejected";
}

export interface StudentComplianceSnapshot {
  studentId: string;
  complianceStatus: ComplianceStatus;
  daysToPassportExpiry?: number;
  daysToVisaExpiry?: number;
  daysToEfrroExpiry?: number;
  lastCalculatedAt: Date;
}

export interface IComplianceEngine {
  /**
   * Calculate overall student compliance status using the Precedence of Severity logic
   * (Section 6 of DDS)
   */
  calculateCompliance(
    studentId: string,
    passport: DocumentInfo,
    visa: DocumentInfo,
    efrro?: DocumentInfo
  ): StudentComplianceSnapshot;
}

export class ComplianceEngine implements IComplianceEngine {
  calculateCompliance(
    studentId: string,
    passport: DocumentInfo,
    visa: DocumentInfo,
    efrro?: DocumentInfo
  ): StudentComplianceSnapshot {
    const now = new Date();

    // Helper: calculate days remaining (integer)
    const getDaysRemaining = (expiry: Date): number => {
      const diffTime = expiry.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const daysToPassportExpiry = getDaysRemaining(passport.expiryDate);
    const daysToVisaExpiry = getDaysRemaining(visa.expiryDate);
    const daysToEfrroExpiry = efrro ? getDaysRemaining(efrro.expiryDate) : undefined;

    // 1. Missing Required Document Check: Passport, Visa, and eFRRO are mandatory.
    // Invariant: Missing or failed compliance data can NEVER evaluate to compliant.
    const isPassportMissing = !passport || !passport.number || !passport.expiryDate;
    const isVisaMissing = !visa || !visa.number || !visa.expiryDate;
    const isEfrroMissing = !efrro || !efrro.number || !efrro.expiryDate;

    if (isPassportMissing || isVisaMissing || isEfrroMissing) {
      return {
        studentId,
        complianceStatus: "non_compliant",
        daysToPassportExpiry,
        daysToVisaExpiry,
        daysToEfrroExpiry,
        lastCalculatedAt: now
      };
    }

    // 2. Critical: Any document is expired or rejected
    const hasExpiredDocument = 
      daysToPassportExpiry < 0 || 
      daysToVisaExpiry < 0 || 
      (daysToEfrroExpiry !== undefined && daysToEfrroExpiry < 0);

    const hasRejectedDocument =
      passport.verificationStatus === "rejected" ||
      visa.verificationStatus === "rejected" ||
      (efrro !== undefined && efrro.verificationStatus === "rejected");

    if (hasExpiredDocument || hasRejectedDocument) {
      return {
        studentId,
        complianceStatus: "non_compliant",
        daysToPassportExpiry,
        daysToVisaExpiry,
        daysToEfrroExpiry,
        lastCalculatedAt: now
      };
    }

    // 3. Warning: Any document is near expiry (<= 30 days) OR pending verification
    const hasUrgentExpiry =
      daysToPassportExpiry <= 30 ||
      daysToVisaExpiry <= 30 ||
      (daysToEfrroExpiry !== undefined && daysToEfrroExpiry <= 30);

    const hasPendingVerification =
      passport.verificationStatus === "pending" ||
      visa.verificationStatus === "pending" ||
      (efrro !== undefined && efrro.verificationStatus === "pending");

    if (hasUrgentExpiry || hasPendingVerification) {
      return {
        studentId,
        complianceStatus: "warning",
        daysToPassportExpiry,
        daysToVisaExpiry,
        daysToEfrroExpiry,
        lastCalculatedAt: now
      };
    }

    // 4. Healthy: All valid, verified, and > 30 days remaining
    return {
      studentId,
      complianceStatus: "compliant",
      daysToPassportExpiry,
      daysToVisaExpiry,
      daysToEfrroExpiry,
      lastCalculatedAt: now
    };
  }
}
