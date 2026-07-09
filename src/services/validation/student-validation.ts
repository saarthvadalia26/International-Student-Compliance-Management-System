import { z } from "zod";

export const RegisterStudentValidationSchema = z.object({
  registrationNumber: z.string().min(3).max(50),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255),
  nationalityCode: z.string().length(3, "Nationality must be a 3-letter ISO code"),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().refine((dob) => {
    const date = new Date(dob);
    return date < new Date();
  }, { message: "Date of birth must be in the past" }),
  email: z.string().email("Invalid email address format").max(255),
  phoneHome: z.string().min(7).max(20),
  phoneLocal: z.string().min(7).max(20).optional(),
  permanentAddress: z.string().min(10, "Permanent address must be descriptive"),
  localAddress: z.string().optional(),
  programCode: z.string().max(20),
  admissionDate: z.string(),
  expectedGraduation: z.string(),
  currentSemester: z.number().int().min(1).max(20).default(1),
  relationshipType: z.enum(["parent", "guardian", "local_sponsor"]),
  relationshipName: z.string().min(2).max(255),
  relationshipPhone: z.string().min(7).max(20),
  relationshipEmail: z.string().email().optional().or(z.literal("")),
  relationshipAddress: z.string().optional(),
  embassyName: z.string().optional(),
  embassyAddress: z.string().optional(),
  embassyPhone: z.string().optional(),
  embassyEmail: z.string().optional().or(z.literal("")),
  embassyContactPerson: z.string().optional()
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
  gender: z.enum(["male", "female", "other"]).optional(),
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
