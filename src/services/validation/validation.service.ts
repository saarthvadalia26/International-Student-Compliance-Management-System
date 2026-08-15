import { z } from "zod";

// 1. Core Student Schema
export const StudentSchema = z.object({
  registrationNumber: z.string().optional().nullable().refine(val => !val || val.trim().length >= 3, { message: "Enrollment number must contain at least 3 characters" }).refine(val => !val || val.trim().length <= 50, { message: "Enrollment number cannot exceed 50 characters" }),
  status: z.enum(["active", "suspended", "graduated", "withdrawn"]).default("active"),
});

// 2. Personal Info Schema
export const StudentPersonalSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
  nationalityCode: z.string().length(3, "Nationality must be a 3-letter ISO code"),
  gender: z.enum(["male", "female", "other", "transgender", "prefer_not_to_say"]).optional(),
  dateOfBirth: z.string().refine((dob) => {
    const date = new Date(dob);
    return date < new Date();
  }, { message: "Date of birth must be in the past" }),
  bloodGroup: z.string().max(5).optional().nullable(),
  religion: z.string().max(50).optional().nullable(),
});

// 3. Contact Coordinates Schema
export const StudentContactSchema = z.object({
  email: z.string().email("Invalid email address format").max(255),
  phoneHome: z.string().min(7).max(20),
  phoneLocal: z.string().min(7).max(20).optional().nullable(),
  permanentAddress: z.string().min(10, "Permanent address must be descriptive"),
  localAddress: z.string().optional().nullable(),
});

// 4. Academic Details Schema
export const StudentAcademicSchema = z.object({
  programCode: z.string().min(1, "Academic program is required").max(100),
  admissionDate: z.string(),
  expectedGraduation: z.string(),
  currentSemester: z.number().int().min(1).max(20),
  academicStatus: z.enum(["good_standing", "probation", "suspended"]).default("good_standing"),
}).refine((data) => {
  const ad = new Date(data.admissionDate);
  const eg = new Date(data.expectedGraduation);
  return eg > ad;
}, {
  message: "Expected graduation must be after admission date",
  path: ["expectedGraduation"]
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
  const issue = new Date(data.issueDate);
  const expiry = new Date(data.expiryDate);
  return expiry > issue;
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
  const issue = new Date(data.issueDate);
  const expiry = new Date(data.expiryDate);
  return expiry > issue;
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
  const issue = new Date(data.issueDate);
  const expiry = new Date(data.expiryDate);
  return expiry > issue;
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
