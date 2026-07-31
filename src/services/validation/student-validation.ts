import { z } from "zod";

export const RegisterStudentValidationSchema = z.object({
  registrationNumber: z.string().min(3, "Registration number must contain at least 3 characters").max(50),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
  nationalityCode: z.string().length(3, "Nationality must be a 3-letter ISO code"),
  gender: z.enum(["male", "female", "other", "transgender", "prefer_not_to_say"]).optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required").refine((dob) => {
    const date = new Date(dob);
    return date < new Date();
  }, { message: "Date of birth must be in the past" }),
  email: z.string().min(1, "Email is required").email("Invalid email address format").max(255),
  phoneHome: z.string().min(7, "Phone number must contain at least 7 digits").max(20, "Phone number cannot exceed 20 digits"),
  phoneLocal: z.string().optional().refine(val => !val || val.length >= 7, { message: "Local phone must contain at least 7 digits" }),
  permanentAddress: z.string().min(10, "Permanent address must be descriptive"),
  localAddress: z.string().optional(),
  programCode: z.string().min(1, "Academic program is required").max(20),
  admissionDate: z.string().min(1, "Admission date is required"),
  expectedGraduation: z.string().min(1, "Expected graduation date is required"),
  currentSemester: z.number().int().min(1).max(20).default(1),
  relationshipType: z.enum(["parent", "guardian", "local_sponsor"], { message: "Emergency contact relationship is required" }),
  relationshipName: z.string().min(2, "Emergency contact name must be at least 2 characters").max(255),
  relationshipPhone: z.string().min(7, "Emergency contact phone must contain at least 7 digits").max(20),
  relationshipEmail: z.string().email("Invalid email address format").optional().or(z.literal("")),
  relationshipAddress: z.string().optional(),
  embassyName: z.string().optional(),
  embassyAddress: z.string().optional(),
  embassyPhone: z.string().optional(),
  embassyEmail: z.string().optional().or(z.literal("")),
  embassyContactPerson: z.string().optional(),
  passportNumber: z.string().optional().refine(val => !val || val.length >= 5, { message: "Passport number must contain at least 5 characters" }),
  passportExpiry: z.string().optional(),
  visaNumber: z.string().optional().refine(val => !val || val.length >= 5, { message: "Visa number must contain at least 5 characters" }),
  visaExpiry: z.string().optional()
}).refine((data) => {
  const ad = new Date(data.admissionDate);
  const eg = new Date(data.expectedGraduation);
  return eg > ad;
}, {
  message: "Expected graduation must be after admission date",
  path: ["expectedGraduation"]
});

export const UpdateStudentValidationSchema = z.object({
  status: z.enum(["active", "suspended", "graduated", "withdrawn"]).optional(),
  fullName: z.string().min(2).max(255).optional(),
  gender: z.enum(["male", "female", "other", "transgender", "prefer_not_to_say"]).optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email().max(255).optional(),
  phoneHome: z.string().min(7).max(20).optional(),
  phoneLocal: z.string().min(7).max(20).optional(),
  permanentAddress: z.string().min(10).optional(),
  localAddress: z.string().optional(),
  programCode: z.string().max(20).optional(),
  currentSemester: z.number().int().min(1).max(20).optional(),
  academicStatus: z.enum(["good_standing", "probation", "suspended"]).optional()
});
