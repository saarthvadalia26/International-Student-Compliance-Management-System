import { z } from "zod";

export const RegisterStudentValidationSchema = z.object({
  registrationNumber: z.string().optional().nullable().refine(val => !val || val.trim().length >= 3, { message: "Enrollment number must contain at least 3 characters" }).refine(val => !val || val.trim().length <= 50, { message: "Enrollment number cannot exceed 50 characters" }),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
  nationalityCode: z.string().length(3, "Please select a valid nationality"),
  gender: z.enum(["male", "female", "other", "transgender", "prefer_not_to_say"], {
    message: "Please select a gender"
  }).optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required").refine((dob) => {
    const date = new Date(dob);
    return !isNaN(date.getTime()) && date < new Date();
  }, { message: "Date of birth must be a valid date in the past" }),
  email: z.string().min(1, "Student institutional email is required").email("Please enter a valid email address format").max(255),
  phoneHome: z.string().min(7, "Home country phone number must contain at least 7 digits").max(20, "Phone number cannot exceed 20 digits"),
  phoneLocal: z.string().optional().refine(val => !val || val.length >= 7, { message: "Local phone must contain at least 7 digits" }),
  permanentAddress: z.string().min(10, "Permanent address must be descriptive (at least 10 characters)"),
  localAddress: z.string().optional(),
  programCode: z.string().min(1, "Academic program is required").max(100),
  admissionDate: z.string().min(1, "Admission date is required"),
  expectedGraduation: z.string().min(1, "Expected graduation date is required"),
  currentSemester: z.number().int().min(1).max(20).default(1),
  relationshipType: z.enum(["parent", "guardian", "local_sponsor"], { message: "Please select a valid relationship type" }).optional(),
  relationshipName: z.string().optional().refine(val => !val || val.trim().length >= 2, { message: "Emergency contact name must be at least 2 characters" }),
  relationshipPhone: z.string().optional().refine(val => !val || val.trim().length >= 7, { message: "Emergency contact phone must contain at least 7 digits" }),
  relationshipEmail: z.string().email("Invalid email address format").optional().or(z.literal("")),
  relationshipAddress: z.string().optional(),
  embassyName: z.string().optional(),
  embassyAddress: z.string().optional(),
  embassyPhone: z.string().optional(),
  embassyEmail: z.string().optional().or(z.literal("")),
  embassyContactPerson: z.string().optional(),
  passportNumber: z.string().optional().refine(val => !val || val.length >= 5, { message: "Passport number must contain at least 5 characters" }),
  passportIssueDate: z.string().optional(),
  passportExpiry: z.string().optional(),
  passportPlaceOfIssue: z.string().optional(),
  visaNumber: z.string().optional().refine(val => !val || val.length >= 5, { message: "Visa number must contain at least 5 characters" }),
  visaIssueDate: z.string().optional(),
  visaExpiry: z.string().optional(),
  visaType: z.string().optional()
}).refine((data) => {
  if (data.passportIssueDate && data.passportExpiry) {
    const pi = new Date(data.passportIssueDate);
    const pe = new Date(data.passportExpiry);
    return pe > pi;
  }
  return true;
}, {
  message: "Passport expiration date must be strictly after the issue date",
  path: ["passportExpiry"]
}).refine((data) => {
  if (data.visaIssueDate && data.visaExpiry) {
    const vi = new Date(data.visaIssueDate);
    const ve = new Date(data.visaExpiry);
    return ve > vi;
  }
  return true;
}, {
  message: "Visa expiration date must be strictly after the issue date",
  path: ["visaExpiry"]
}).refine((data) => {
  if (data.admissionDate && data.expectedGraduation) {
    const ad = new Date(data.admissionDate);
    const eg = new Date(data.expectedGraduation);
    return eg > ad;
  }
  return true;
}, {
  message: "Expected graduation date must be after admission date",
  path: ["expectedGraduation"]
}).refine((data) => {
  if (data.visaExpiry) {
    const ve = new Date(data.visaExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ve >= today;
  }
  return true;
}, {
  message: "Visa expiration date must be today or in the future",
  path: ["visaExpiry"]
}).refine((data) => {
  if (data.passportExpiry) {
    const pe = new Date(data.passportExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pe >= today;
  }
  return true;
}, {
  message: "Passport expiration date must be today or in the future",
  path: ["passportExpiry"]
});

export const UpdateStudentValidationSchema = z.object({
  status: z.enum(["active", "suspended", "graduated", "withdrawn"]).optional(),
  registrationNumber: z.string().optional().nullable().refine(val => !val || val.trim().length >= 3, { message: "Enrollment number must contain at least 3 characters" }).refine(val => !val || val.trim().length <= 50, { message: "Enrollment number cannot exceed 50 characters" }),
  fullName: z.string().min(2).max(255).optional(),
  gender: z.enum(["male", "female", "other", "transgender", "prefer_not_to_say"]).optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email().max(255).optional(),
  phoneHome: z.string().min(7).max(20).optional(),
  phoneLocal: z.string().min(7).max(20).optional(),
  permanentAddress: z.string().min(10).optional(),
  localAddress: z.string().optional(),
  programCode: z.string().max(100).optional(),
  currentSemester: z.number().int().min(1).max(20).optional(),
  academicStatus: z.enum(["good_standing", "probation", "suspended"]).optional()
});
