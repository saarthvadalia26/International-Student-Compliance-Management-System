/**
 * Dedicated Maximum Bulk Import File Size Limit (100 MB)
 * Separate from normal student document upload limits
 */
export const MAX_BULK_IMPORT_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_BULK_IMPORT_FILE_SIZE_MB = 100;

export type ISCMSImportField =
  // Student Identity
  | "registration_number"
  | "full_name"
  | "nationality"
  | "gender"
  | "date_of_birth"
  | "blood_group"
  // Contact Info
  | "email"
  | "phone_home"
  | "phone_home_country_code"
  | "phone_home_number"
  | "phone_local"
  | "phone_local_country_code"
  | "phone_local_number"
  | "permanent_address"
  | "local_address"
  // Academic
  | "academic_program"
  | "academic_level"
  | "admission_date"
  | "current_semester"
  | "expected_graduation"
  // Emergency Contact
  | "emergency_contact_name"
  | "emergency_contact_relationship"
  | "emergency_contact_phone"
  | "emergency_contact_email"
  // Passport Metadata
  | "passport_number"
  | "passport_issue_date"
  | "passport_expiry"
  | "passport_place_of_issue"
  // Visa Metadata
  | "visa_number"
  | "visa_issue_date"
  | "visa_expiry"
  | "visa_type"
  // eFRRO Metadata
  | "efrro_number"
  | "efrro_issue_date"
  | "efrro_expiry"
  // Embassy / Consulate Info
  | "embassy_name"
  | "embassy_address"
  | "embassy_city"
  | "embassy_country"
  | "embassy_phone"
  | "embassy_email";

export interface FieldDefinition {
  field: ISCMSImportField;
  label: string;
  category: "Identity" | "Contact" | "Academic" | "Emergency" | "Passport" | "Visa" | "eFRRO" | "Embassy";
  required: boolean;
  description: string;
  sample: string;
  aliases: string[];
}

export const ISCMS_FIELD_DEFINITIONS: FieldDefinition[] = [
  // Identity
  {
    field: "registration_number",
    label: "Registration / Enrollment Number",
    category: "Identity",
    required: true,
    description: "University-assigned registration / enrollment number (mandatory; must be provided by the university).",
    sample: "NFSU2026CS101",
    aliases: ["registration_number", "registration number", "reg no", "reg_no", "enrollment number", "enrollment no", "enrollment_no", "student id", "student_id", "roll no", "roll_number", "id"]
  },
  {
    field: "full_name",
    label: "Full Name",
    category: "Identity",
    required: true,
    description: "Full legal name of the student as printed on official records.",
    sample: "John Michael Doe",
    aliases: ["full_name", "full name", "student name", "name", "candidate name", "student_name", "first name", "first_name"]
  },
  {
    field: "nationality",
    label: "Nationality",
    category: "Identity",
    required: false,
    description: "Country of citizenship (e.g. Nepal, Bhutan, USA, NPL, BHT). Defaults to NULL if omitted.",
    sample: "Nepal",
    aliases: ["nationality", "country", "citizenship", "country of origin", "nationality_code", "country of citizenship"]
  },
  {
    field: "gender",
    label: "Gender",
    category: "Identity",
    required: false,
    description: "Male, Female, Other, or Prefer not to say. Defaults to NULL if omitted.",
    sample: "Male",
    aliases: ["gender", "sex"]
  },
  {
    field: "date_of_birth",
    label: "Date of Birth",
    category: "Identity",
    required: false,
    description: "Date of birth (YYYY-MM-DD or DD/MM/YYYY). Defaults to NULL if omitted; validated if provided.",
    sample: "2002-05-14",
    aliases: ["date_of_birth", "date of birth", "dob", "birth date", "birth_date", "d.o.b"]
  },
  {
    field: "blood_group",
    label: "Blood Group",
    category: "Identity",
    required: false,
    description: "A+, B+, O+, AB+, etc. Defaults to NULL if omitted.",
    sample: "O+",
    aliases: ["blood_group", "blood group", "blood type", "blood_type"]
  },

  // Contact
  {
    field: "email",
    label: "Email Address",
    category: "Contact",
    required: false,
    description: "Student's primary email address (optional, validated if provided). Defaults to NULL if omitted.",
    sample: "john.doe@example.com",
    aliases: ["email", "email address", "student email", "email_address", "student_email", "mail", "contact email"]
  },
  {
    field: "phone_home",
    label: "Home / Primary Phone",
    category: "Contact",
    required: false,
    description: "Primary international phone number with country code (e.g. +679 1234567, +91 9876543210). Defaults to NULL if omitted.",
    sample: "+977-9812345678",
    aliases: ["phone_home", "phone", "phone number", "mobile", "mobile number", "contact number", "primary phone", "home phone", "phone_number"]
  },
  {
    field: "phone_home_country_code",
    label: "Home Phone Country Code",
    category: "Contact",
    required: false,
    description: "Calling country dial code for primary phone (e.g. +91, +679, 91, 679).",
    sample: "+679",
    aliases: ["phone_home_country_code", "home country code", "primary country code", "country dial code", "phone country code", "country code", "dial code"]
  },
  {
    field: "phone_home_number",
    label: "Home Phone Number",
    category: "Contact",
    required: false,
    description: "Phone number digits excluding the country dial code.",
    sample: "9812345678",
    aliases: ["phone_home_number", "home phone number", "primary number", "phone digits"]
  },
  {
    field: "phone_local",
    label: "Local Phone (India)",
    category: "Contact",
    required: false,
    description: "Local Indian SIM contact number if available. Defaults to NULL if omitted.",
    sample: "+91-9876543210",
    aliases: ["phone_local", "local phone", "local mobile", "indian phone", "local_mobile"]
  },
  {
    field: "phone_local_country_code",
    label: "Local Phone Country Code",
    category: "Contact",
    required: false,
    description: "Local phone dial code (defaults to +91).",
    sample: "+91",
    aliases: ["phone_local_country_code", "local phone country code", "local country code"]
  },
  {
    field: "phone_local_number",
    label: "Local Phone Number",
    category: "Contact",
    required: false,
    description: "Local phone digits excluding country code.",
    sample: "9876543210",
    aliases: ["phone_local_number", "local phone number", "local number"]
  },
  {
    field: "permanent_address",
    label: "Permanent Address (Home Country)",
    category: "Contact",
    required: false,
    description: "Complete permanent address in home country. Defaults to NULL if omitted.",
    sample: "123 Ring Road, Kathmandu, Nepal",
    aliases: ["permanent_address", "permanent address", "home address", "address in home country", "permanent_addr"]
  },
  {
    field: "local_address",
    label: "Local Address (Campus / City)",
    category: "Contact",
    required: false,
    description: "Hostel room or local residence address. Defaults to NULL if omitted.",
    sample: "Hostel Block B, Room 302, NFSU Campus, Gandhinagar",
    aliases: ["local_address", "local address", "campus address", "hostel address", "hostel", "current address"]
  },

  // Academic
  {
    field: "academic_program",
    label: "Academic Program / Course",
    category: "Academic",
    required: true,
    description: "Course name or program code (e.g. B.Tech CSE, BTECH_CSE).",
    sample: "B.Tech in Computer Science & Engineering",
    aliases: ["academic_program", "program", "program_name", "program name", "course", "course_name", "course name", "degree", "programme", "branch", "discipline"]
  },
  {
    field: "academic_level",
    label: "Academic Level",
    category: "Academic",
    required: false,
    description: "Academic level classification: Integrated (UG + PG), Undergraduate (UG), Postgraduate (PG), Doctorate (PhD), Diploma / Cert.",
    sample: "Integrated (UG + PG)",
    aliases: [
      "academic_level",
      "academic level",
      "degree_level",
      "degree level",
      "program_level",
      "program level",
      "level",
      "course_level"
    ]
  },
  {
    field: "admission_date",
    label: "Admission / Start Date",
    category: "Academic",
    required: false,
    description: "Date student commenced studies (YYYY-MM-DD or DD/MM/YYYY). Defaults to NULL if omitted; validated if provided.",
    sample: "2024-08-01",
    aliases: ["admission_date", "admission date", "joining date", "commencement date", "enrollment date", "start date", "academic_start_date"]
  },
  {
    field: "current_semester",
    label: "Current Semester (Optional Override/Reference)",
    category: "Academic",
    required: false,
    description: "Recorded semester in spreadsheet. Auto-calculated if admission date is available; otherwise stored as NULL.",
    sample: "Semester 3",
    aliases: ["current_semester", "current semester", "semester", "sem", "current sem"]
  },
  {
    field: "expected_graduation",
    label: "Expected Graduation Date",
    category: "Academic",
    required: false,
    description: "Expected completion date (auto-calculated from program duration if omitted).",
    sample: "2028-06-30",
    aliases: ["expected_graduation", "expected graduation", "graduation date", "completion date", "expected_completion"]
  },

  // Emergency Contact
  {
    field: "emergency_contact_name",
    label: "Emergency Contact Name",
    category: "Emergency",
    required: false,
    description: "Parent, guardian, or next of kin full name. Defaults to NULL if omitted.",
    sample: "Robert Doe",
    aliases: ["emergency_contact_name", "emergency contact name", "emergency contact", "emergency_contact", "parent name", "guardian name", "next of kin", "emergency_name", "emergency name", "father name", "mother name"]
  },
  {
    field: "emergency_contact_relationship",
    label: "Emergency Relationship",
    category: "Emergency",
    required: false,
    description: "Parent, Guardian, Sibling, Spouse, Other. Defaults to NULL if omitted.",
    sample: "Parent",
    aliases: ["emergency_contact_relationship", "relationship", "emergency relationship", "relation", "emergency_relation"]
  },
  {
    field: "emergency_contact_phone",
    label: "Emergency Contact Phone",
    category: "Emergency",
    required: false,
    description: "Emergency phone number with international country code. Defaults to NULL if omitted.",
    sample: "+977-9800000000",
    aliases: ["emergency_contact_phone", "emergency contact phone", "emergency phone", "parent phone", "guardian phone", "emergency_phone", "parent mobile"]
  },
  {
    field: "emergency_contact_email",
    label: "Emergency Contact Email",
    category: "Emergency",
    required: false,
    description: "Emergency contact email address. Defaults to NULL if omitted.",
    sample: "robert.doe@example.com",
    aliases: ["emergency_contact_email", "emergency email", "parent email", "guardian email", "emergency_email"]
  },

  // Passport Metadata
  {
    field: "passport_number",
    label: "Passport Number",
    category: "Passport",
    required: false,
    description: "Passport document number (metadata only). Defaults to NULL if omitted.",
    sample: "P12345678",
    aliases: ["passport_number", "passport no", "passport_no", "passport number", "passport", "pp no", "pp_no"]
  },
  {
    field: "passport_issue_date",
    label: "Passport Issue Date",
    category: "Passport",
    required: false,
    description: "Date of passport issuance (YYYY-MM-DD or DD/MM/YYYY). Defaults to NULL if omitted.",
    sample: "2020-01-15",
    aliases: ["passport_issue_date", "passport issue date", "pp issue date", "passport_issue", "passport issued"]
  },
  {
    field: "passport_expiry",
    label: "Passport Expiry Date",
    category: "Passport",
    required: false,
    description: "Passport expiration date (YYYY-MM-DD or DD/MM/YYYY). Used by reminder engine. Defaults to NULL if omitted.",
    sample: "2030-01-14",
    aliases: ["passport_expiry", "passport expiry date", "passport expiry", "passport expiration", "pp expiry", "passport_expiry_date", "pp expiry date"]
  },
  {
    field: "passport_place_of_issue",
    label: "Passport Place of Issue",
    category: "Passport",
    required: false,
    description: "Issuing city or country. Defaults to NULL if omitted.",
    sample: "Kathmandu",
    aliases: ["passport_place_of_issue", "passport place of issue", "pp place of issue", "passport issuing authority"]
  },

  // Visa Metadata
  {
    field: "visa_number",
    label: "Visa Number",
    category: "Visa",
    required: false,
    description: "Indian Visa document identifier (metadata only). Defaults to NULL if omitted.",
    sample: "V98765432",
    aliases: ["visa_number", "visa no", "visa_no", "visa number", "visa", "visa id"]
  },
  {
    field: "visa_issue_date",
    label: "Visa Issue Date",
    category: "Visa",
    required: false,
    description: "Date of visa issuance (YYYY-MM-DD or DD/MM/YYYY). Defaults to NULL if omitted.",
    sample: "2024-07-01",
    aliases: ["visa_issue_date", "visa issue date", "visa_issue", "visa issued"]
  },
  {
    field: "visa_expiry",
    label: "Visa Expiry Date",
    category: "Visa",
    required: false,
    description: "Visa validity expiration date (YYYY-MM-DD or DD/MM/YYYY). Used by reminder engine. Defaults to NULL if omitted.",
    sample: "2025-06-30",
    aliases: ["visa_expiry", "visa expiry date", "visa expiry", "visa expiration", "visa_expiry_date"]
  },
  {
    field: "visa_type",
    label: "Visa Classification",
    category: "Visa",
    required: false,
    description: "Visa category (e.g. Student (S-1), Research, Tourist). Defaults to Student (S-1) if omitted.",
    sample: "Student (S-1)",
    aliases: ["visa_type", "visa classification", "visa category", "visa type"]
  },

  // eFRRO Metadata
  {
    field: "efrro_number",
    label: "eFRRO Registration Number",
    category: "eFRRO",
    required: false,
    description: "eFRRO / BoI Registration certificate number (metadata only). Defaults to NULL if omitted.",
    sample: "FRRO/AHM/2024/00123",
    aliases: ["efrro_number", "efrro no", "efrro_no", "efrro number", "efrro", "frro number", "frro no", "frro_number", "residential permit no", "rp no", "rc no", "registration certificate no"]
  },
  {
    field: "efrro_issue_date",
    label: "eFRRO Issue Date",
    category: "eFRRO",
    required: false,
    description: "Date of eFRRO certificate issuance (YYYY-MM-DD or DD/MM/YYYY). Defaults to NULL if omitted.",
    sample: "2024-07-15",
    aliases: ["efrro_issue_date", "efrro issue date", "frro issue date", "efrro_issue"]
  },
  {
    field: "efrro_expiry",
    label: "eFRRO Expiry Date",
    category: "eFRRO",
    required: false,
    description: "eFRRO registration certificate validity expiration date (YYYY-MM-DD or DD/MM/YYYY). Used by reminder engine. Defaults to NULL if omitted.",
    sample: "2025-07-14",
    aliases: ["efrro_expiry", "efrro expiry date", "efrro expiry", "frro expiry date", "efrro_expiry_date", "rc expiry date", "rp expiry"]
  },

  // Embassy
  {
    field: "embassy_name",
    label: "Embassy / Consulate Name",
    category: "Embassy",
    required: false,
    description: "Embassy or diplomatic mission in India. Defaults to NULL if omitted.",
    sample: "Embassy of Nepal, New Delhi",
    aliases: ["embassy_name", "embassy", "embassy name", "consulate name", "consulate"]
  },
  {
    field: "embassy_address",
    label: "Embassy Address",
    category: "Embassy",
    required: false,
    description: "Street address of the embassy. Defaults to NULL if omitted.",
    sample: "Barakhamba Road, New Delhi",
    aliases: ["embassy_address", "embassy address"]
  },
  {
    field: "embassy_city",
    label: "Embassy City",
    category: "Embassy",
    required: false,
    description: "City of the embassy (e.g. New Delhi, Mumbai). Defaults to NULL if omitted.",
    sample: "New Delhi",
    aliases: ["embassy_city", "embassy city"]
  },
  {
    field: "embassy_country",
    label: "Embassy Country",
    category: "Embassy",
    required: false,
    description: "Country represented by embassy. Defaults to NULL if omitted.",
    sample: "Nepal",
    aliases: ["embassy_country", "embassy country"]
  },
  {
    field: "embassy_phone",
    label: "Embassy Phone",
    category: "Embassy",
    required: false,
    description: "Embassy contact phone number. Defaults to NULL if omitted.",
    sample: "+91-11-23329969",
    aliases: ["embassy_phone", "embassy phone"]
  },
  {
    field: "embassy_email",
    label: "Embassy Email",
    category: "Embassy",
    required: false,
    description: "Embassy consular contact email. Defaults to NULL if omitted.",
    sample: "eonnewdelhi@mofa.gov.np",
    aliases: ["embassy_email", "embassy email"]
  }
];

export type ColumnMapping = Record<string, ISCMSImportField | "ignore">;

export interface ValidationErrorItem {
  field: ISCMSImportField | string;
  fieldLabel: string;
  value: string;
  problem: string;
  suggestion: string;
}

export interface ValidationWarningItem {
  field: ISCMSImportField | string;
  fieldLabel: string;
  value: string;
  warning: string;
  impact?: string;
  actionTaken?: string;
}

export interface ValidationRowResult {
  rowNumber: number;
  status: "valid" | "error" | "duplicate";
  rawRow: Record<string, string>;
  mappedData: Partial<Record<ISCMSImportField, string>>;
  errors: ValidationErrorItem[];
  warnings: ValidationWarningItem[];
  calculatedProgression?: {
    currentSemester: number;
    expectedGraduation: string;
    stage: string;
  };
}

export interface WarningsBreakdown {
  passportExpiryMissing: number;
  visaExpiryMissing: number;
  efrroExpiryMissing: number;
  emailMissing: number;
  phoneMissing: number;
  dobMissing: number;
  addressMissing: number;
  emergencyMissing: number;
  otherWarnings: number;
}

export interface ValidationReport {
  totalRows: number;
  validCount: number;
  cleanValidCount: number;
  warningRowsCount: number;
  errorCount: number;
  duplicateCount: number;
  warningCount: number;
  warningsBreakdown: WarningsBreakdown;
  rows: ValidationRowResult[];
  detectedColumns: string[];
  mapping: ColumnMapping;
}

export interface ImportBatchRecord {
  id: string;
  batchNumber: string;
  fileName: string;
  fileSizeBytes: number;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  status: "processing" | "completed" | "failed" | "rolled_back";
  errorSummary: any[];
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
  rolledBackAt: string | null;
  rolledBackBy: string | null;
}

export interface ImportExecutionResult {
  success: boolean;
  batchNumber: string;
  batchId: string;
  totalRows: number;
  importedCount: number;
  cleanImportedCount: number;
  warningImportedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ rowNumber: number; registrationNumber: string; error: string }>;
}
