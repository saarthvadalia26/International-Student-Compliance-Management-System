/**
 * Type definitions and field metadata for Bulk Student Import from Excel/CSV
 */

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
  | "phone_local"
  | "permanent_address"
  | "local_address"
  // Academic
  | "academic_program"
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
    description: "Unique university registration number or student ID.",
    sample: "NFSU2026CS101",
    aliases: ["registration_number", "registration number", "reg no", "reg_no", "enrollment number", "enrollment no", "enrollment_no", "student id", "student_id", "roll no", "roll_number", "id"]
  },
  {
    field: "full_name",
    label: "Full Name",
    category: "Identity",
    required: true,
    description: "Full name as printed on passport.",
    sample: "John Michael Doe",
    aliases: ["full_name", "full name", "student name", "name", "candidate name", "student_name", "first name", "first_name"]
  },
  {
    field: "nationality",
    label: "Nationality",
    category: "Identity",
    required: true,
    description: "Country of citizenship (e.g. Nepal, Bhutan, USA, NPL, BHT).",
    sample: "Nepal",
    aliases: ["nationality", "country", "citizenship", "country of origin", "nationality_code", "country of citizenship"]
  },
  {
    field: "gender",
    label: "Gender",
    category: "Identity",
    required: false,
    description: "Male, Female, Other, or Prefer not to say.",
    sample: "Male",
    aliases: ["gender", "sex"]
  },
  {
    field: "date_of_birth",
    label: "Date of Birth",
    category: "Identity",
    required: true,
    description: "Date of birth (YYYY-MM-DD or DD/MM/YYYY).",
    sample: "2002-05-14",
    aliases: ["date_of_birth", "date of birth", "dob", "birth date", "birth_date", "d.o.b"]
  },
  {
    field: "blood_group",
    label: "Blood Group",
    category: "Identity",
    required: false,
    description: "A+, B+, O+, AB+, etc.",
    sample: "O+",
    aliases: ["blood_group", "blood group", "blood type", "blood_type"]
  },

  // Contact
  {
    field: "email",
    label: "Email Address",
    category: "Contact",
    required: true,
    description: "Student's primary personal or university email address.",
    sample: "john.doe@example.com",
    aliases: ["email", "email address", "student email", "email_address", "student_email", "mail", "contact email"]
  },
  {
    field: "phone_home",
    label: "Home / Primary Phone",
    category: "Contact",
    required: true,
    description: "Primary international phone number with country code.",
    sample: "+977-9812345678",
    aliases: ["phone_home", "phone", "phone number", "mobile", "mobile number", "contact number", "primary phone", "home phone", "phone_number"]
  },
  {
    field: "phone_local",
    label: "Local Phone (India)",
    category: "Contact",
    required: false,
    description: "Local Indian SIM contact number if available.",
    sample: "+91-9876543210",
    aliases: ["phone_local", "local phone", "local mobile", "indian phone", "local_mobile"]
  },
  {
    field: "permanent_address",
    label: "Permanent Address (Home Country)",
    category: "Contact",
    required: true,
    description: "Complete permanent address in home country.",
    sample: "123 Ring Road, Kathmandu, Nepal",
    aliases: ["permanent_address", "permanent address", "home address", "address in home country", "permanent_addr"]
  },
  {
    field: "local_address",
    label: "Local Address (Campus / City)",
    category: "Contact",
    required: false,
    description: "Hostel room or local residence address.",
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
    field: "admission_date",
    label: "Admission / Start Date",
    category: "Academic",
    required: true,
    description: "Date student commenced studies (YYYY-MM-DD or DD/MM/YYYY).",
    sample: "2024-08-01",
    aliases: ["admission_date", "admission date", "joining date", "commencement date", "enrollment date", "start date", "academic_start_date"]
  },
  {
    field: "current_semester",
    label: "Current Semester (Optional Override/Reference)",
    category: "Academic",
    required: false,
    description: "Recorded semester in spreadsheet (system verifies against admission date calculation).",
    sample: "Semester 3",
    aliases: ["current_semester", "current semester", "semester", "sem", "current sem"]
  },
  {
    field: "expected_graduation",
    label: "Expected Graduation Date",
    category: "Academic",
    required: false,
    description: "Expected completion date (auto-calculated if omitted).",
    sample: "2028-06-30",
    aliases: ["expected_graduation", "expected graduation", "graduation date", "completion date", "expected_completion"]
  },

  // Emergency Contact
  {
    field: "emergency_contact_name",
    label: "Emergency Contact Name",
    category: "Emergency",
    required: true,
    description: "Parent, guardian, or next of kin full name.",
    sample: "Robert Doe",
    aliases: ["emergency_contact_name", "emergency contact name", "emergency contact", "emergency_contact", "parent name", "guardian name", "next of kin", "emergency_name", "emergency name", "father name", "mother name"]
  },
  {
    field: "emergency_contact_relationship",
    label: "Emergency Relationship",
    category: "Emergency",
    required: false,
    description: "Parent, Guardian, Sibling, Spouse, Other.",
    sample: "Parent",
    aliases: ["emergency_contact_relationship", "relationship", "emergency relationship", "relation", "emergency_relation"]
  },
  {
    field: "emergency_contact_phone",
    label: "Emergency Contact Phone",
    category: "Emergency",
    required: true,
    description: "Emergency phone number with international country code.",
    sample: "+977-9800000000",
    aliases: ["emergency_contact_phone", "emergency contact phone", "emergency phone", "parent phone", "guardian phone", "emergency_phone", "parent mobile"]
  },
  {
    field: "emergency_contact_email",
    label: "Emergency Contact Email",
    category: "Emergency",
    required: false,
    description: "Emergency contact email address.",
    sample: "robert.doe@example.com",
    aliases: ["emergency_contact_email", "emergency email", "parent email", "guardian email", "emergency_email"]
  },

  // Passport Metadata
  {
    field: "passport_number",
    label: "Passport Number",
    category: "Passport",
    required: false,
    description: "Passport document number.",
    sample: "N12345678",
    aliases: ["passport_number", "passport number", "passport no", "passport_no", "passport"]
  },
  {
    field: "passport_issue_date",
    label: "Passport Issue Date",
    category: "Passport",
    required: false,
    description: "Date of passport issuance.",
    sample: "2020-01-15",
    aliases: ["passport_issue_date", "passport issue date", "passport issue", "passport_issue"]
  },
  {
    field: "passport_expiry",
    label: "Passport Expiry Date",
    category: "Passport",
    required: false,
    description: "Date of passport expiration.",
    sample: "2030-01-14",
    aliases: ["passport_expiry", "passport expiry", "passport expiry date", "passport_expiry_date", "passport expiration", "passport valid until"]
  },
  {
    field: "passport_place_of_issue",
    label: "Passport Place of Issue",
    category: "Passport",
    required: false,
    description: "City or issuing authority of passport.",
    sample: "Kathmandu",
    aliases: ["passport_place_of_issue", "passport place of issue", "passport place", "passport_place"]
  },

  // Visa Metadata
  {
    field: "visa_number",
    label: "Visa Number",
    category: "Visa",
    required: false,
    description: "Indian visa / sticker number.",
    sample: "VZ98765432",
    aliases: ["visa_number", "visa number", "visa no", "visa_no", "visa"]
  },
  {
    field: "visa_issue_date",
    label: "Visa Issue Date",
    category: "Visa",
    required: false,
    description: "Date of visa issuance.",
    sample: "2024-07-01",
    aliases: ["visa_issue_date", "visa issue date", "visa issue", "visa_issue"]
  },
  {
    field: "visa_expiry",
    label: "Visa Expiry Date",
    category: "Visa",
    required: false,
    description: "Date of visa expiration.",
    sample: "2026-06-30",
    aliases: ["visa_expiry", "visa expiry", "visa expiry date", "visa_expiry_date", "visa expiration", "visa valid until"]
  },
  {
    field: "visa_type",
    label: "Visa Type",
    category: "Visa",
    required: false,
    description: "Student (S-1), Research (R-1), etc.",
    sample: "Student (S-1)",
    aliases: ["visa_type", "visa type", "visa category"]
  },

  // eFRRO Metadata
  {
    field: "efrro_number",
    label: "eFRRO Registration Number",
    category: "eFRRO",
    required: false,
    description: "FRRO / FRO registration certificate number.",
    sample: "FRRO/GN/2024/00123",
    aliases: ["efrro_number", "efrro number", "efrro no", "efrro_no", "frro number", "frro no", "efrro", "frro"]
  },
  {
    field: "efrro_issue_date",
    label: "eFRRO Issue Date",
    category: "eFRRO",
    required: false,
    description: "Date of eFRRO registration.",
    sample: "2024-08-10",
    aliases: ["efrro_issue_date", "efrro issue date", "frro issue date", "efrro_issue"]
  },
  {
    field: "efrro_expiry",
    label: "eFRRO Expiry Date",
    category: "eFRRO",
    required: false,
    description: "Date of eFRRO certificate expiration.",
    sample: "2025-08-09",
    aliases: ["efrro_expiry", "efrro expiry", "efrro expiry date", "frro expiry", "efrro_expiry_date", "frro valid until"]
  },

  // Embassy
  {
    field: "embassy_name",
    label: "Embassy / Consulate Name",
    category: "Embassy",
    required: false,
    description: "Embassy or diplomatic mission in India.",
    sample: "Embassy of Nepal, New Delhi",
    aliases: ["embassy_name", "embassy", "embassy name", "consulate name", "consulate"]
  },
  {
    field: "embassy_address",
    label: "Embassy Address",
    category: "Embassy",
    required: false,
    description: "Street address of the embassy.",
    sample: "Barakhamba Road, New Delhi",
    aliases: ["embassy_address", "embassy address"]
  },
  {
    field: "embassy_city",
    label: "Embassy City",
    category: "Embassy",
    required: false,
    description: "City of the embassy (e.g. New Delhi, Mumbai).",
    sample: "New Delhi",
    aliases: ["embassy_city", "embassy city"]
  },
  {
    field: "embassy_country",
    label: "Embassy Country",
    category: "Embassy",
    required: false,
    description: "Country represented by embassy.",
    sample: "Nepal",
    aliases: ["embassy_country", "embassy country"]
  },
  {
    field: "embassy_phone",
    label: "Embassy Phone",
    category: "Embassy",
    required: false,
    description: "Embassy contact phone number.",
    sample: "+91-11-23329969",
    aliases: ["embassy_phone", "embassy phone"]
  },
  {
    field: "embassy_email",
    label: "Embassy Email",
    category: "Embassy",
    required: false,
    description: "Embassy consular contact email.",
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

export interface ValidationReport {
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  warningCount: number;
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
  skippedCount: number;
  failedCount: number;
  errors: Array<{ rowNumber: number; registrationNumber: string; error: string }>;
}
