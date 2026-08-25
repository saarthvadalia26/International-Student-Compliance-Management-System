/**
 * Profile Completion Engine
 *
 * Authoritative domain service for calculating international student profile
 * completion percentages, status classifications, and structured missing section summaries.
 *
 * Implements real-world progressive completion without penalizing students
 * for compliance stages not yet reached.
 */

export interface ProfileSectionEvaluation {
  id: "identity" | "academic" | "contact" | "family" | "emergency" | "immigration";
  title: string;
  weight: number;
  completedFieldsCount: number;
  totalFieldsCount: number;
  percentage: number;
  missingFields: string[];
}

export interface StudentProfileCompletionResult {
  overallPercentage: number;
  percentage: number;
  status: "complete" | "incomplete" | "minimal";
  statusLabel: string;
  statusColor: string;
  sections: ProfileSectionEvaluation[];
  missingSummary: string[];
  missingItems: string[];
  isReadyForComplianceReview: boolean;
}

export type ProfileCompletionResult = StudentProfileCompletionResult;

export interface StudentProfileEvaluationData {
  // Identity
  fullName?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  nationalityCode?: string | null;
  maritalStatus?: string | null;
  bloodGroup?: string | null;
  physicalDisability?: boolean | null;

  // Academic
  registrationNumber?: string | null;
  programCode?: string | null;
  admissionDate?: string | Date | null;
  expectedGraduation?: string | Date | null;
  admissionCategory?: string | null;
  admissionCategoryOther?: string | null;
  siiApplicationNumber?: string | null;

  // Contact
  email?: string | null;
  phoneHome?: string | null;
  phoneLocal?: string | null;
  permanentAddress?: string | null;
  localAddress?: string | null;

  // Family
  fatherName?: string | null;
  motherName?: string | null;

  // Emergency / Relationships
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;

  // Immigration & Compliance Metadata
  passportNumber?: string | null;
  passportExpiry?: string | Date | null;
  visaNumber?: string | null;
  visaExpiry?: string | Date | null;
  efrroNumber?: string | null;
  efrroExpiry?: string | Date | null;
}

export class ProfileCompletionEngine {
  private static isPresent(val: unknown): boolean {
    if (val === undefined || val === null) return false;
    if (typeof val === "boolean") return true; // explicitly answered true or false
    if (typeof val === "string") {
      const trimmed = val.trim();
      return trimmed !== "" && trimmed !== "Not provided" && trimmed !== "Not assigned yet" && trimmed !== "Pending" && trimmed !== "undefined";
    }
    if (val instanceof Date) {
      return !isNaN(val.getTime());
    }
    return true;
  }

  /**
   * Calculates comprehensive profile completion metrics for a student
   */
  static evaluate(data: StudentProfileEvaluationData): StudentProfileCompletionResult {
    const sections: ProfileSectionEvaluation[] = [];
    const missingSummary: string[] = [];

    // 1. Basic Identity (Weight: 20%)
    const identityFields = [
      { name: "Full Name", present: this.isPresent(data.fullName) },
      { name: "Date of Birth", present: this.isPresent(data.dateOfBirth) },
      { name: "Gender", present: this.isPresent(data.gender) },
      { name: "Nationality", present: this.isPresent(data.nationalityCode) },
      { name: "Marital Status", present: this.isPresent(data.maritalStatus) },
      { name: "Blood Group", present: this.isPresent(data.bloodGroup) }
    ];
    const identityMissing = identityFields.filter(f => !f.present).map(f => f.name);
    const identityCompleted = identityFields.filter(f => f.present).length;
    const identityPct = Math.round((identityCompleted / identityFields.length) * 100);
    sections.push({
      id: "identity",
      title: "Personal Identity",
      weight: 20,
      completedFieldsCount: identityCompleted,
      totalFieldsCount: identityFields.length,
      percentage: identityPct,
      missingFields: identityMissing
    });
    if (identityMissing.length > 0) {
      missingSummary.push(...identityMissing.map(f => `Personal: ${f}`));
    }

    // 2. Academic Enrollment & Admission Track (Weight: 20%)
    const academicFields = [
      { name: "University Enrollment Number", present: this.isPresent(data.registrationNumber) },
      { name: "Academic Program", present: this.isPresent(data.programCode) },
      { name: "Admission Date", present: this.isPresent(data.admissionDate) },
      { name: "Expected Graduation Date", present: this.isPresent(data.expectedGraduation) },
      { name: "Admission Category", present: this.isPresent(data.admissionCategory) }
    ];

    // Conditional evaluation: If category is Other, require Please Specify
    if (data.admissionCategory === "other") {
      academicFields.push({
        name: "Admission Track Specification",
        present: this.isPresent(data.admissionCategoryOther)
      });
    }

    const academicMissing = academicFields.filter(f => !f.present).map(f => f.name);
    const academicCompleted = academicFields.filter(f => f.present).length;
    const academicPct = Math.round((academicCompleted / academicFields.length) * 100);
    sections.push({
      id: "academic",
      title: "Academic & Admission",
      weight: 20,
      completedFieldsCount: academicCompleted,
      totalFieldsCount: academicFields.length,
      percentage: academicPct,
      missingFields: academicMissing
    });
    if (academicMissing.length > 0) {
      missingSummary.push(...academicMissing.map(f => `Academic: ${f}`));
    }

    // 3. Contact Coordinates (Weight: 20%)
    const contactFields = [
      { name: "Student Email", present: this.isPresent(data.email) },
      { name: "Home Phone", present: this.isPresent(data.phoneHome) },
      { name: "Permanent Address", present: this.isPresent(data.permanentAddress) }
    ];
    const contactMissing = contactFields.filter(f => !f.present).map(f => f.name);
    const contactCompleted = contactFields.filter(f => f.present).length;
    const contactPct = Math.round((contactCompleted / contactFields.length) * 100);
    sections.push({
      id: "contact",
      title: "Contact Coordinates",
      weight: 20,
      completedFieldsCount: contactCompleted,
      totalFieldsCount: contactFields.length,
      percentage: contactPct,
      missingFields: contactMissing
    });
    if (contactMissing.length > 0) {
      missingSummary.push(...contactMissing.map(f => `Contact: ${f}`));
    }

    // 4. Family Information (Weight: 10%)
    const familyFields = [
      { name: "Father Name", present: this.isPresent(data.fatherName) },
      { name: "Mother Name", present: this.isPresent(data.motherName) }
    ];
    const familyMissing = familyFields.filter(f => !f.present).map(f => f.name);
    const familyCompleted = familyFields.filter(f => f.present).length;
    const familyPct = Math.round((familyCompleted / familyFields.length) * 100);
    sections.push({
      id: "family",
      title: "Family Coordinates",
      weight: 10,
      completedFieldsCount: familyCompleted,
      totalFieldsCount: familyFields.length,
      percentage: familyPct,
      missingFields: familyMissing
    });
    if (familyMissing.length > 0) {
      missingSummary.push(...familyMissing.map(f => `Family: ${f}`));
    }

    // 5. Emergency / Guardian (Weight: 15%)
    const emergencyFields = [
      { name: "Emergency Contact Name", present: this.isPresent(data.emergencyContactName) },
      { name: "Emergency Contact Phone", present: this.isPresent(data.emergencyContactPhone) }
    ];
    const emergencyMissing = emergencyFields.filter(f => !f.present).map(f => f.name);
    const emergencyCompleted = emergencyFields.filter(f => f.present).length;
    const emergencyPct = Math.round((emergencyCompleted / emergencyFields.length) * 100);
    sections.push({
      id: "emergency",
      title: "Emergency Contact",
      weight: 15,
      completedFieldsCount: emergencyCompleted,
      totalFieldsCount: emergencyFields.length,
      percentage: emergencyPct,
      missingFields: emergencyMissing
    });
    if (emergencyMissing.length > 0) {
      missingSummary.push(...emergencyMissing.map(f => `Emergency: ${f}`));
    }

    // 6. Immigration & Compliance Metadata (Weight: 15%)
    const immigrationFields = [
      { name: "Passport Number", present: this.isPresent(data.passportNumber) },
      { name: "Passport Expiry Date", present: this.isPresent(data.passportExpiry) },
      { name: "Visa Number", present: this.isPresent(data.visaNumber) },
      { name: "Visa Expiry Date", present: this.isPresent(data.visaExpiry) }
    ];
    const immigrationMissing = immigrationFields.filter(f => !f.present).map(f => f.name);
    const immigrationCompleted = immigrationFields.filter(f => f.present).length;
    const immigrationPct = Math.round((immigrationCompleted / immigrationFields.length) * 100);
    sections.push({
      id: "immigration",
      title: "Legal & Immigration",
      weight: 15,
      completedFieldsCount: immigrationCompleted,
      totalFieldsCount: immigrationFields.length,
      percentage: immigrationPct,
      missingFields: immigrationMissing
    });
    if (immigrationMissing.length > 0) {
      missingSummary.push(...immigrationMissing.map(f => `Immigration: ${f}`));
    }

    const missingItems = [
      ...identityMissing,
      ...academicMissing,
      ...contactMissing,
      ...familyMissing,
      ...emergencyMissing,
      ...immigrationMissing
    ];

    // Compute weighted total
    const weightedScore = (
      (identityPct * 0.20) +
      (academicPct * 0.20) +
      (contactPct * 0.20) +
      (familyPct * 0.10) +
      (emergencyPct * 0.15) +
      (immigrationPct * 0.15)
    );
    const overallPercentage = Math.round(weightedScore);

    let status: StudentProfileCompletionResult["status"] = "complete";
    let statusLabel = "Complete Profile";
    let statusColor = "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";

    if (overallPercentage < 35) {
      status = "minimal";
      statusLabel = "Minimal Identity Profile";
      statusColor = "text-amber-600 bg-amber-500/10 border-amber-500/30";
    } else if (overallPercentage < 90) {
      status = "incomplete";
      statusLabel = "Incomplete Profile";
      statusColor = "text-blue-600 bg-blue-500/10 border-blue-500/30";
    }

    const isReadyForComplianceReview = (
      this.isPresent(data.fullName) &&
      this.isPresent(data.nationalityCode) &&
      this.isPresent(data.passportNumber) &&
      this.isPresent(data.visaNumber)
    );

    return {
      overallPercentage,
      percentage: overallPercentage,
      status,
      statusLabel,
      statusColor,
      sections,
      missingSummary,
      missingItems,
      isReadyForComplianceReview
    };
  }
}
