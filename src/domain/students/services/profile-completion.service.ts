/**
 * Profile Completion Engine
 *
 * Authoritative domain service for calculating international student profile
 * completion percentages, status classifications, and structured missing section summaries.
 *
 * Implements a dynamic, schema-aware evaluation derived from centralized field metadata.
 * Evaluates all relational entities (personal, academic, contact, family, emergency, bank, documents)
 * without hardcoded lists or penalizing non-applicable conditional tracks.
 */

export type ProfileSectionId = "identity" | "academic" | "contact" | "family" | "emergency" | "bank" | "immigration" | "consular";

export interface ProfileSectionEvaluation {
  id: ProfileSectionId;
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
  programId?: string | null;
  admissionDate?: string | Date | null;
  expectedGraduation?: string | Date | null;
  admissionCategory?: string | null;
  admissionCategoryOther?: string | null;
  siiApplicationNumber?: string | null;
  iccrApplicationNumber?: string | null;
  iccrScholarshipSchemeName?: string | null;
  scholarshipSchemeName?: string | null;
  admissionAcademicYear?: string | null;
  lastEducationalQualification?: string | null;
  lastEducationalInstitution?: string | null;
  feePaymentCategory?: string | null;
  tuitionFeeAmount?: number | string | null;
  tuitionFeeCurrency?: string | null;
  hostelFeeAmount?: number | string | null;
  hostelFeeCurrency?: string | null;
  nfsuCampus?: string | null;

  // Contact & Address
  email?: string | null;
  phoneHome?: string | null;
  phoneLocal?: string | null;
  permanentAddress?: string | null;
  presentAddress?: string | null;
  localAddress?: string | null;

  // Family
  fatherName?: string | null;
  fatherEmail?: string | null;
  fatherMobile?: string | null;
  motherName?: string | null;
  motherEmail?: string | null;
  motherMobile?: string | null;

  // Emergency / Relationships
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;

  // Bank Details
  bankDetails?: {
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    branchAddress?: string | null;
  } | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branchAddress?: string | null;

  // Immigration & Compliance Metadata
  passportNumber?: string | null;
  passportExpiry?: string | Date | null;
  passportStatus?: string | null;
  visaNumber?: string | null;
  visaExpiry?: string | Date | null;
  visaStatus?: string | null;
  efrroNumber?: string | null;
  efrroExpiry?: string | Date | null;
  efrroStatus?: string | null;

  // Consular & Embassy Information
  embassy?: {
    name?: string | null;
    embassy_name?: string | null;
    embassyName?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    contactPerson?: string | null;
    contact_person?: string | null;
  } | null;
  embassyName?: string | null;
  embassyAddress?: string | null;
  embassyCity?: string | null;
  embassyCountry?: string | null;
  embassyPhone?: string | null;
  embassyEmail?: string | null;
  embassyWebsite?: string | null;
  embassyContactPerson?: string | null;
}

/**
 * Metadata definition for a tracked profile field
 */
export interface CompletenessFieldMetadata {
  key: string;
  label: string;
  sectionId: ProfileSectionId;
  sectionTitle: string;
  isApplicable?: (data: StudentProfileEvaluationData) => boolean;
  getValue: (data: StudentProfileEvaluationData) => unknown;
}

/**
 * Section metadata definition
 */
export interface CompletenessSectionMetadata {
  id: ProfileSectionId;
  title: string;
  weight: number;
}

export const PROFILE_SECTIONS_CONFIG: CompletenessSectionMetadata[] = [
  { id: "identity", title: "Personal Identity", weight: 15 },
  { id: "academic", title: "Academic & Admission", weight: 15 },
  { id: "contact", title: "Contact Coordinates", weight: 15 },
  { id: "family", title: "Family Coordinates", weight: 10 },
  { id: "emergency", title: "Emergency Contact", weight: 10 },
  { id: "bank", title: "Bank Details", weight: 10 },
  { id: "immigration", title: "Legal & Immigration", weight: 15 },
  { id: "consular", title: "Consular & Embassy Information", weight: 10 }
];

export const PROFILE_FIELDS_CONFIG: CompletenessFieldMetadata[] = [
  // 1. Personal Identity (Weight: 15%)
  {
    key: "fullName",
    label: "Full Name",
    sectionId: "identity",
    sectionTitle: "Personal Identity",
    getValue: (d) => d.fullName
  },
  {
    key: "dateOfBirth",
    label: "Date of Birth",
    sectionId: "identity",
    sectionTitle: "Personal Identity",
    getValue: (d) => d.dateOfBirth
  },
  {
    key: "gender",
    label: "Gender",
    sectionId: "identity",
    sectionTitle: "Personal Identity",
    getValue: (d) => d.gender
  },
  {
    key: "nationalityCode",
    label: "Nationality",
    sectionId: "identity",
    sectionTitle: "Personal Identity",
    getValue: (d) => d.nationalityCode
  },
  {
    key: "maritalStatus",
    label: "Marital Status",
    sectionId: "identity",
    sectionTitle: "Personal Identity",
    getValue: (d) => d.maritalStatus
  },
  {
    key: "bloodGroup",
    label: "Blood Group",
    sectionId: "identity",
    sectionTitle: "Personal Identity",
    getValue: (d) => d.bloodGroup
  },

  // 2. Academic & Admission (Weight: 20%)
  {
    key: "registrationNumber",
    label: "University Enrollment Number",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    getValue: (d) => d.registrationNumber
  },
  {
    key: "programCode",
    label: "Academic Program",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    getValue: (d) => d.programCode || d.programId
  },
  {
    key: "admissionDate",
    label: "Admission Date",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    getValue: (d) => d.admissionDate
  },
  {
    key: "expectedGraduation",
    label: "Expected Graduation Date",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    getValue: (d) => d.expectedGraduation
  },
  {
    key: "admissionCategory",
    label: "Admission Category",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    getValue: (d) => d.admissionCategory
  },
  {
    key: "admissionAcademicYear",
    label: "Admission Academic Year",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    getValue: (d) => d.admissionAcademicYear
  },
  {
    key: "lastEducationalQualification",
    label: "Last Educational Qualification",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    getValue: (d) => d.lastEducationalQualification
  },
  {
    key: "lastEducationalInstitution",
    label: "University/Institute/School Name",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    getValue: (d) => d.lastEducationalInstitution
  },
  {
    key: "admissionCategoryOther",
    label: "Admission Track Specification",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    isApplicable: (d) => d.admissionCategory === "other",
    getValue: (d) => d.admissionCategoryOther
  },
  {
    key: "iccrScholarshipSchemeName",
    label: "ICCR Scholarship Scheme",
    sectionId: "academic",
    sectionTitle: "Academic & Admission",
    isApplicable: (d) => d.admissionCategory === "iccr",
    getValue: (d) => d.iccrScholarshipSchemeName || d.scholarshipSchemeName
  },

  // 3. Contact Coordinates (Weight: 15%)
  {
    key: "email",
    label: "Student Email",
    sectionId: "contact",
    sectionTitle: "Contact Coordinates",
    getValue: (d) => d.email
  },
  {
    key: "phoneHome",
    label: "Home Phone",
    sectionId: "contact",
    sectionTitle: "Contact Coordinates",
    getValue: (d) => d.phoneHome
  },
  {
    key: "permanentAddress",
    label: "Permanent Address",
    sectionId: "contact",
    sectionTitle: "Contact Coordinates",
    getValue: (d) => d.permanentAddress
  },
  {
    key: "presentAddress",
    label: "Present/Current Address",
    sectionId: "contact",
    sectionTitle: "Contact Coordinates",
    getValue: (d) => d.presentAddress || d.localAddress
  },

  // 4. Family Coordinates (Weight: 10%)
  {
    key: "fatherName",
    label: "Father Name",
    sectionId: "family",
    sectionTitle: "Family Coordinates",
    getValue: (d) => d.fatherName
  },
  {
    key: "motherName",
    label: "Mother Name",
    sectionId: "family",
    sectionTitle: "Family Coordinates",
    getValue: (d) => d.motherName
  },

  // 5. Emergency Contact (Weight: 10%)
  {
    key: "emergencyContactName",
    label: "Emergency Contact Name",
    sectionId: "emergency",
    sectionTitle: "Emergency Contact",
    getValue: (d) => d.emergencyContactName
  },
  {
    key: "emergencyContactPhone",
    label: "Emergency Contact Phone",
    sectionId: "emergency",
    sectionTitle: "Emergency Contact",
    getValue: (d) => d.emergencyContactPhone
  },

  // 6. Bank Details (Weight: 15%)
  {
    key: "bankDetails",
    label: "Bank Details",
    sectionId: "bank",
    sectionTitle: "Bank Details",
    getValue: (d) => {
      const b = d.bankDetails;
      if (b && (ProfileCompletionEngine.isPresent(b.accountNumber) || ProfileCompletionEngine.isPresent(b.bankName))) {
        return b.accountNumber || b.bankName;
      }
      return d.accountNumber || d.bankName;
    }
  },

  // 7. Legal & Immigration (Weight: 15%)
  {
    key: "passportNumber",
    label: "Passport Number",
    sectionId: "immigration",
    sectionTitle: "Legal & Immigration",
    getValue: (d) => d.passportNumber
  },
  {
    key: "passportExpiry",
    label: "Passport Expiry Date",
    sectionId: "immigration",
    sectionTitle: "Legal & Immigration",
    getValue: (d) => d.passportExpiry
  },
  {
    key: "visaNumber",
    label: "Visa Number",
    sectionId: "immigration",
    sectionTitle: "Legal & Immigration",
    getValue: (d) => d.visaNumber
  },
  {
    key: "visaExpiry",
    label: "Visa Expiry Date",
    sectionId: "immigration",
    sectionTitle: "Legal & Immigration",
    getValue: (d) => d.visaExpiry
  },
  {
    key: "efrroNumber",
    label: "eFRRO Number",
    sectionId: "immigration",
    sectionTitle: "Legal & Immigration",
    getValue: (d) => d.efrroNumber
  },
  {
    key: "efrroExpiry",
    label: "eFRRO Expiry Date",
    sectionId: "immigration",
    sectionTitle: "Legal & Immigration",
    getValue: (d) => d.efrroExpiry
  },

  // 8. Consular & Embassy Information (Weight: 10%)
  {
    key: "consularInfo",
    label: "Consular & Embassy Information",
    sectionId: "consular",
    sectionTitle: "Consular & Embassy Information",
    getValue: (d) => {
      const emb = d.embassy;
      const candidates = [
        emb?.name,
        (emb as Record<string, unknown> | undefined)?.embassy_name,
        (emb as Record<string, unknown> | undefined)?.embassyName,
        d.embassyName,
        emb?.address,
        d.embassyAddress,
        emb?.city,
        d.embassyCity,
        emb?.country,
        d.embassyCountry,
        emb?.phone,
        d.embassyPhone,
        emb?.email,
        d.embassyEmail,
        emb?.website,
        d.embassyWebsite,
        emb?.contactPerson,
        (emb as Record<string, unknown> | undefined)?.contact_person,
        d.embassyContactPerson
      ];
      for (const val of candidates) {
        if (ProfileCompletionEngine.isPresent(val)) {
          return val;
        }
      }
      return null;
    }
  }
];

export class ProfileCompletionEngine {
  /**
   * Evaluates whether a profile field contains a valid, meaningful value.
   * Handles booleans (false is valid), numbers (0 is valid), dates, and strings.
   * Treats null, undefined, empty strings, and standard unassigned placeholders as empty.
   */
  public static isPresent(val: unknown): boolean {
    if (val === undefined || val === null) return false;
    if (typeof val === "boolean") return true; // explicitly answered true or false
    if (typeof val === "number") return !isNaN(val);
    if (typeof val === "string") {
      const trimmed = val.trim();
      return (
        trimmed !== "" &&
        trimmed !== "Not provided" &&
        trimmed !== "Not assigned yet" &&
        trimmed !== "Not Specified" &&
        trimmed !== "Pending" &&
        trimmed !== "undefined" &&
        trimmed !== "null"
      );
    }
    if (val instanceof Date) {
      return !isNaN(val.getTime());
    }
    if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      return Object.values(obj).some(v => this.isPresent(v));
    }
    return true;
  }

  /**
   * Calculates comprehensive profile completion metrics dynamically from schema configuration.
   */
  static evaluate(data: StudentProfileEvaluationData): StudentProfileCompletionResult {
    const sections: ProfileSectionEvaluation[] = [];
    const missingSummary: string[] = [];
    const missingItems: string[] = [];

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Evaluate each section based on configured fields
    PROFILE_SECTIONS_CONFIG.forEach(sec => {
      const sectionFields = PROFILE_FIELDS_CONFIG.filter(f => f.sectionId === sec.id);
      
      // Determine which fields are applicable to this student
      const applicableFields = sectionFields.filter(f => {
        if (!f.isApplicable) return true;
        return f.isApplicable(data);
      });

      const sectionMissing: string[] = [];
      let completedCount = 0;

      applicableFields.forEach(f => {
        const val = f.getValue(data);
        const present = this.isPresent(val);
        if (present) {
          completedCount += 1;
        } else {
          sectionMissing.push(f.label);
          missingItems.push(f.label);
        }
      });

      const totalCount = applicableFields.length;
      const sectionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

      sections.push({
        id: sec.id,
        title: sec.title,
        weight: sec.weight,
        completedFieldsCount: completedCount,
        totalFieldsCount: totalCount,
        percentage: sectionPct,
        missingFields: sectionMissing
      });

      if (sectionMissing.length > 0) {
        missingSummary.push(...sectionMissing.map(f => `${sec.title}: ${f}`));
      }

      totalWeightedScore += sectionPct * sec.weight;
      totalWeight += sec.weight;
    });

    const overallPercentage = totalWeight > 0 
      ? Math.min(100, Math.round(totalWeightedScore / totalWeight)) 
      : 0;

    let status: StudentProfileCompletionResult["status"] = "complete";
    let statusLabel = "Complete Profile";
    let statusColor = "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";

    if (overallPercentage < 35) {
      status = "minimal";
      statusLabel = "Minimal Identity Profile";
      statusColor = "text-amber-600 bg-amber-500/10 border-amber-500/30";
    } else if (overallPercentage < 100) {
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
