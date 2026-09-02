import { z } from "zod";
import { parseDateToISO } from "@/lib/utils/date";

// 1. Core Student Schema
export const StudentSchema = z.object({
  registrationNumber: z.string().optional().nullable().refine(val => !val || val.trim().length >= 3, { message: "Enrollment number must contain at least 3 characters" }).refine(val => !val || val.trim().length <= 50, { message: "Enrollment number cannot exceed 50 characters" }),
  status: z.enum(["active", "suspended", "graduated", "withdrawn"]).default("active"),
});

// 2. Personal Info Schema
export const StudentPersonalSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
  nationalityCode: z.string().optional().nullable().or(z.literal("")),
  gender: z.enum(["male", "female", "other", "transgender", "prefer_not_to_say"]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable().refine((dob) => {
    if (!dob || !dob.trim()) return true;
    const iso = parseDateToISO(dob);
    if (!iso) return false;
    const today = new Date().toISOString().split("T")[0];
    return iso <= today;
  }, { message: "Date of birth must be in the past (DD/MM/YYYY)" }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "separated", "other", "prefer_not_to_say"]).optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  physicalDisability: z.boolean().optional().nullable(),
  fatherName: z.string().max(255).optional().nullable(),
  fatherMobile: z.string().optional().nullable(),
  fatherMobileCountryCode: z.string().optional().nullable(),
  fatherMobileNumber: z.string().optional().nullable(),
  fatherWhatsapp: z.string().optional().nullable(),
  fatherWhatsappCountryCode: z.string().optional().nullable(),
  fatherWhatsappNumber: z.string().optional().nullable(),
  fatherEmail: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return z.string().email().safeParse(val.trim()).success;
  }, { message: "Invalid Father email address format" }),
  motherName: z.string().max(255).optional().nullable(),
  motherMobile: z.string().optional().nullable(),
  motherMobileCountryCode: z.string().optional().nullable(),
  motherMobileNumber: z.string().optional().nullable(),
  motherWhatsapp: z.string().optional().nullable(),
  motherWhatsappCountryCode: z.string().optional().nullable(),
  motherWhatsappNumber: z.string().optional().nullable(),
  motherEmail: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return z.string().email().safeParse(val.trim()).success;
  }, { message: "Invalid Mother email address format" }),
  religion: z.string().max(50).optional().nullable(),
});

// 3. Contact Coordinates Schema
export const StudentContactSchema = z.object({
  email: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return z.string().email().safeParse(val.trim()).success;
  }, { message: "Invalid email address format" }),
  phoneHome: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return val.trim().length >= 7 && val.trim().length <= 20;
  }, { message: "Home phone number must be between 7 and 20 digits" }),
  phoneLocal: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 7, { message: "Local phone must contain at least 7 digits" }),
  phoneLocalCountryCode: z.string().optional().nullable(),
  phoneLocalNumber: z.string().optional().nullable(),
  phoneHomeCountryCode: z.string().optional().nullable(),
  phoneHomeNumber: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable(),
  presentAddress: z.string().optional().nullable(),
  localAddress: z.string().optional().nullable(),
});

// 4. Academic Details Schema
export const StudentAcademicSchema = z.object({
  programCode: z.string().optional().nullable().or(z.literal("")),
  admissionDate: z.string().optional().nullable().or(z.literal("")),
  joiningDate: z.string().optional().nullable().or(z.literal("")),
  expectedGraduation: z.string().optional().nullable().or(z.literal("")),
  currentSemester: z.number().int().min(1).max(20).optional().nullable(),
  academicStatus: z.enum(["good_standing", "probation", "suspended"]).default("good_standing"),
  admissionCategory: z.enum(["iccr", "sii", "direct", "foreign_govt_sponsored", "other"]).optional().nullable(),
  admissionCategoryOther: z.string().optional().nullable(),
  siiApplicationNumber: z.string().optional().nullable(),
  iccrApplicationNumber: z.string().optional().nullable(),
  iccrScholarshipSchemeName: z.string().max(255).optional().nullable(),
  scholarshipSchemeName: z.string().max(255).optional().nullable(),
  nfsuCampus: z.string().max(255).optional().nullable(),
}).refine((data) => {
  if (data.admissionDate && data.expectedGraduation && data.admissionDate.trim() && data.expectedGraduation.trim()) {
    const ad = parseDateToISO(data.admissionDate);
    const eg = parseDateToISO(data.expectedGraduation);
    if (ad && eg) {
      return eg > ad;
    }
  }
  return true;
}, {
  message: "Expected graduation must be after admission date",
  path: ["expectedGraduation"]
}).refine((data) => {
  if (data.admissionCategory === "other") {
    return Boolean(data.admissionCategoryOther && data.admissionCategoryOther.trim().length > 0);
  }
  return true;
}, {
  message: "Please specify the custom admission category",
  path: ["admissionCategoryOther"]
});

// 5. Sensitive Bank Details Schema
export const StudentBankDetailsSchema = z.object({
  bankName: z.string().max(255).optional().nullable(),
  accountNumber: z.string().max(100).optional().nullable(),
  ifscCode: z.string().max(50).optional().nullable(),
  branchAddress: z.string().max(1000).optional().nullable(),
});

// 5. Passport Document Schema (matching BR-003)
export const PassportSchema = z.object({
  passportNumber: z.string().min(5).max(50),
  issueDate: z.string(),
  expiryDate: z.string(),
  issuePlace: z.string().min(2).max(100),
  isCurrent: z.boolean().default(true),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).default("pending"),
}).refine((data) => {
  const issue = parseDateToISO(data.issueDate);
  const expiry = parseDateToISO(data.expiryDate);
  if (issue && expiry) {
    return expiry > issue;
  }
  return true;
}, {
  message: "Passport expiry date must be after issue date",
  path: ["expiryDate"]
});

// 6. Visa Document Schema
export const VisaSchema = z.object({
  visaNumber: z.string().min(5).max(50),
  issueDate: z.string(),
  expiryDate: z.string(),
  visaTypeCode: z.string().max(20),
  isCurrent: z.boolean().default(true),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).default("pending"),
}).refine((data) => {
  const issue = parseDateToISO(data.issueDate);
  const expiry = parseDateToISO(data.expiryDate);
  if (issue && expiry) {
    return expiry > issue;
  }
  return true;
}, {
  message: "Visa expiry date must be after issue date",
  path: ["expiryDate"]
});

// 7. eFRRO Document Schema
export const EfrroSchema = z.object({
  certificateNumber: z.string().min(5).max(50),
  issueDate: z.string(),
  expiryDate: z.string(),
  filePath: z.string(),
  isCurrent: z.boolean().default(true),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).default("pending"),
}).refine((data) => {
  const issue = parseDateToISO(data.issueDate);
  const expiry = parseDateToISO(data.expiryDate);
  if (issue && expiry) {
    return expiry > issue;
  }
  return true;
}, {
  message: "eFRRO expiry date must be after issue date",
  path: ["expiryDate"]
});

export interface IValidationService {
  validateStudent(data: unknown): Promise<boolean>;
  validatePassport(data: unknown): Promise<boolean>;
  validateVisa(data: unknown): Promise<boolean>;
  validateEfrro(data: unknown): Promise<boolean>;
}

export class ZodValidationService implements IValidationService {
  async validateStudent(data: unknown): Promise<boolean> {
    const payload = data as { student?: unknown; personal?: unknown; contact?: unknown; academic?: unknown };
    StudentSchema.parse(payload.student);
    StudentPersonalSchema.parse(payload.personal);
    StudentContactSchema.parse(payload.contact);
    StudentAcademicSchema.parse(payload.academic);
    return true;
  }

  async validatePassport(data: unknown): Promise<boolean> {
    PassportSchema.parse(data);
    return true;
  }

  async validateVisa(data: unknown): Promise<boolean> {
    VisaSchema.parse(data);
    return true;
  }

  async validateEfrro(data: unknown): Promise<boolean> {
    EfrroSchema.parse(data);
    return true;
  }
}
