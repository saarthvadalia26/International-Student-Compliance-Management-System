import { z } from "zod";
import { normalizeCountryInputSync } from "@/domain/countries/country-utils";
import { isEfrroApplicable } from "@/domain/compliance/utils/efrro-applicability";
import { parseDateToISO } from "@/lib/utils/date";

export const RegisterStudentValidationSchema = z.object({
  registrationNumber: z.string().optional().nullable().refine(val => !val || val.trim().length >= 3, { message: "Enrollment number must contain at least 3 characters" }).refine(val => !val || val.trim().length <= 50, { message: "Enrollment number cannot exceed 50 characters" }),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(255),
  nationalityCode: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    const norm = normalizeCountryInputSync(val);
    return Boolean(norm);
  }, { message: "Please select a valid nationality" }),
  gender: z.enum(["male", "female", "other", "transgender", "prefer_not_to_say"], {
    message: "Please select a valid gender option"
  }).optional().nullable(),
  dateOfBirth: z.string().optional().nullable().refine((dob) => {
    if (!dob || !dob.trim()) return true;
    const iso = parseDateToISO(dob);
    if (!iso) return false;
    const today = new Date().toISOString().split("T")[0];
    return iso <= today;
  }, { message: "Date of birth must be a valid date in the past (DD/MM/YYYY)" }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "separated", "other", "prefer_not_to_say"], {
    message: "Please select a valid marital status"
  }).optional().nullable(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], {
    message: "Please select a valid standard blood group"
  }).optional().nullable(),
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
  }, { message: "Please enter a valid Father email address format" }),
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
  }, { message: "Please enter a valid Mother email address format" }),
  email: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return z.string().email().safeParse(val.trim()).success;
  }, { message: "Please enter a valid email address format" }),
  phoneHome: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return val.trim().length >= 7 && val.trim().length <= 20;
  }, { message: "Home country phone number must contain at least 7 digits (max 20 digits)" }),
  phoneLocal: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 7, { message: "Local phone must contain at least 7 digits" }),
  phoneLocalCountryCode: z.string().optional().nullable(),
  phoneLocalNumber: z.string().optional().nullable(),
  phoneHomeCountryCode: z.string().optional().nullable(),
  phoneHomeNumber: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 5, { message: "Permanent address must be descriptive (at least 5 characters)" }),
  presentAddress: z.string().optional().nullable(),
  localAddress: z.string().optional().nullable(),
  programId: z.string().optional().nullable(),
  programCode: z.string().optional().nullable(),
  admissionDate: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable().refine((jd) => {
    if (!jd || !jd.trim()) return true;
    const iso = parseDateToISO(jd);
    return Boolean(iso);
  }, { message: "Joining date must be a valid date in DD/MM/YYYY format" }),
  expectedGraduation: z.string().optional().nullable(),
  currentSemester: z.number().int().min(1).max(20).optional().nullable(),
  admissionCategory: z.enum(["iccr", "sii", "direct", "foreign_govt_sponsored", "other"], {
    message: "Please select a valid admission category"
  }).optional().nullable(),
  lastEducationalQualification: z.string().max(255).optional().nullable(),
  lastEducationalInstitution: z.string().max(255).optional().nullable(),
  admissionCategoryOther: z.string().optional().nullable(),
  siiApplicationNumber: z.string().optional().nullable(),
  iccrApplicationNumber: z.string().optional().nullable(),
  iccrScholarshipSchemeName: z.string().max(255).optional().nullable(),
  scholarshipSchemeName: z.string().max(255).optional().nullable(),
  nfsuCampus: z.string().max(255).optional().nullable(),
  admissionAcademicYear: z.string().max(20).optional().nullable(),
  feePaymentCategory: z.enum(["self_financed", "scholarship"], {
    message: "Please select a valid fee payment category"
  }).optional().nullable(),
  tuitionFeeAmount: z.number().nonnegative("Tuition fee amount must be zero or a positive number").optional().nullable(),
  tuitionFeeCurrency: z.enum(["INR", "USD"], {
    message: "Please select INR or USD for tuition fee currency"
  }).optional().nullable(),
  hostelFeeAmount: z.number().nonnegative("Hostel fee amount must be zero or a positive number").optional().nullable(),
  hostelFeeCurrency: z.enum(["INR", "USD"], {
    message: "Please select INR or USD for hostel fee currency"
  }).optional().nullable(),
  relationshipType: z.enum([
    "father", 
    "mother", 
    "brother", 
    "sister", 
    "guardian", 
    "husband", 
    "wife", 
    "spouse", 
    "parent", 
    "local_sponsor", 
    "other"
  ], { message: "Please select a valid relationship type" }).optional().nullable(),
  relationshipName: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 2, { message: "Emergency contact name must be at least 2 characters" }),
  relationshipPhone: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 7, { message: "Emergency contact phone must contain at least 7 digits" }),
  relationshipEmail: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return z.string().email().safeParse(val.trim()).success;
  }, { message: "Invalid emergency contact email address format" }),
  relationshipAddress: z.string().optional().nullable(),
  embassyName: z.string().optional().nullable(),
  embassyAddress: z.string().optional().nullable(),
  embassyCity: z.string().optional().nullable(),
  embassyCountry: z.string().optional().nullable(),
  embassyPhone: z.string().optional().nullable(),
  embassyEmail: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return z.string().email().safeParse(val.trim()).success;
  }, { message: "Invalid consular email address format" }),
  embassyWebsite: z.string().optional().nullable(),
  embassyContactPerson: z.string().optional().nullable(),
  passportNumber: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 5, { message: "Passport number must contain at least 5 characters" }),
  passportIssueDate: z.string().optional().nullable(),
  passportExpiry: z.string().optional().nullable(),
  passportPlaceOfIssue: z.string().optional().nullable(),
  visaNumber: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 5, { message: "Visa number must contain at least 5 characters" }),
  visaIssueDate: z.string().optional().nullable(),
  visaExpiry: z.string().optional().nullable(),
  visaType: z.string().max(100).optional().nullable(),
  efrroNumber: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 3, { message: "eFRRO number must contain at least 3 characters" }),
  efrroIssueDate: z.string().optional().nullable(),
  efrroExpiry: z.string().optional().nullable(),
  // Bank Details fields (All Optional)
  bankName: z.string().max(255).optional().nullable(),
  accountNumber: z.string().max(100).optional().nullable(),
  ifscCode: z.string().max(50).optional().nullable(),
  branchAddress: z.string().max(1000).optional().nullable(),
  bankDetails: z.object({
    bankName: z.string().max(255).optional().nullable(),
    accountNumber: z.string().max(100).optional().nullable(),
    ifscCode: z.string().max(50).optional().nullable(),
    branchAddress: z.string().max(1000).optional().nullable()
  }).optional().nullable()
}).refine((data) => {
  // Conditional rule: If admissionCategory is Other, admissionCategoryOther (Please specify) is mandatory
  if (data.admissionCategory === "other") {
    return Boolean(data.admissionCategoryOther && data.admissionCategoryOther.trim().length > 0);
  }
  return true;
}, {
  message: "Please specify the custom admission category",
  path: ["admissionCategoryOther"]
}).refine((data) => {
  if (data.passportIssueDate && data.passportExpiry && data.passportIssueDate.trim() && data.passportExpiry.trim()) {
    const pi = parseDateToISO(data.passportIssueDate);
    const pe = parseDateToISO(data.passportExpiry);
    if (pi && pe) {
      return pe > pi;
    }
  }
  return true;
}, {
  message: "Passport expiration date must be strictly after the issue date",
  path: ["passportExpiry"]
}).refine((data) => {
  if (data.visaIssueDate && data.visaExpiry && data.visaIssueDate.trim() && data.visaExpiry.trim()) {
    const vi = parseDateToISO(data.visaIssueDate);
    const ve = parseDateToISO(data.visaExpiry);
    if (vi && ve) {
      return ve > vi;
    }
  }
  return true;
}, {
  message: "Visa expiration date must be strictly after the issue date",
  path: ["visaExpiry"]
}).refine((data) => {
  if (data.nationalityCode && !isEfrroApplicable(data.nationalityCode)) {
    return true;
  }
  if (data.efrroIssueDate && data.efrroExpiry && data.efrroIssueDate.trim() && data.efrroExpiry.trim()) {
    const ei = parseDateToISO(data.efrroIssueDate);
    const ee = parseDateToISO(data.efrroExpiry);
    if (ei && ee) {
      return ee > ei;
    }
  }
  return true;
}, {
  message: "eFRRO expiration date must be strictly after the issue date",
  path: ["efrroExpiry"]

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
  message: "Expected graduation date must be after admission date",
  path: ["expectedGraduation"]
});

export const UpdateStudentValidationSchema = z.object({
  status: z.enum(["active", "suspended", "graduated", "withdrawn"]).optional(),
  registrationNumber: z.string().optional().nullable().refine(val => !val || val.trim().length >= 3, { message: "Enrollment number must contain at least 3 characters" }).refine(val => !val || val.trim().length <= 50, { message: "Enrollment number cannot exceed 50 characters" }),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(255).optional(),
  nationalityCode: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    const norm = normalizeCountryInputSync(val);
    return Boolean(norm);
  }, { message: "Please select a valid nationality" }),
  gender: z.enum(["male", "female", "other", "transgender", "prefer_not_to_say"]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable().refine((dob) => {
    if (!dob || !dob.trim()) return true;
    const iso = parseDateToISO(dob);
    if (!iso) return false;
    const today = new Date().toISOString().split("T")[0];
    return iso <= today;
  }, { message: "Date of birth must be a valid date in the past (DD/MM/YYYY)" }),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "separated", "other", "prefer_not_to_say"]).optional().nullable(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional().nullable(),
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
  email: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return z.string().email().safeParse(val.trim()).success;
  }, { message: "Invalid email address format" }),
  phoneHome: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return val.trim().length >= 7 && val.trim().length <= 20;
  }, { message: "Home phone must contain between 7 and 20 digits" }),
  phoneLocal: z.string().optional().nullable().refine(val => !val || !val.trim() || val.trim().length >= 7, { message: "Local phone must contain at least 7 digits" }),
  phoneLocalCountryCode: z.string().optional().nullable(),
  phoneLocalNumber: z.string().optional().nullable(),
  phoneHomeCountryCode: z.string().optional().nullable(),
  phoneHomeNumber: z.string().optional().nullable(),
  permanentAddress: z.string().optional().nullable(),
  presentAddress: z.string().optional().nullable(),
  localAddress: z.string().optional().nullable(),
  programId: z.string().optional().nullable(),
  programCode: z.string().optional().nullable(),
  admissionDate: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable().refine((jd) => {
    if (!jd || !jd.trim()) return true;
    const iso = parseDateToISO(jd);
    return Boolean(iso);
  }, { message: "Joining date must be a valid date in DD/MM/YYYY format" }),
  expectedGraduation: z.string().optional().nullable(),
  currentSemester: z.number().int().min(1).max(20).optional().nullable(),
  academicStatus: z.enum(["good_standing", "probation", "suspended"]).optional(),
  admissionCategory: z.enum(["iccr", "sii", "direct", "foreign_govt_sponsored", "other"]).optional().nullable(),
  lastEducationalQualification: z.string().max(255).optional().nullable(),
  lastEducationalInstitution: z.string().max(255).optional().nullable(),
  admissionCategoryOther: z.string().optional().nullable(),
  siiApplicationNumber: z.string().optional().nullable(),
  iccrApplicationNumber: z.string().optional().nullable(),
  iccrScholarshipSchemeName: z.string().max(255).optional().nullable(),
  scholarshipSchemeName: z.string().max(255).optional().nullable(),
  nfsuCampus: z.string().max(255).optional().nullable(),
  admissionAcademicYear: z.string().max(20).optional().nullable(),
  feePaymentCategory: z.enum(["self_financed", "scholarship"]).optional().nullable(),
  tuitionFeeAmount: z.number().nonnegative().optional().nullable(),
  tuitionFeeCurrency: z.enum(["INR", "USD"]).optional().nullable(),
  hostelFeeAmount: z.number().nonnegative().optional().nullable(),
  hostelFeeCurrency: z.enum(["INR", "USD"]).optional().nullable(),
  relationshipType: z.enum([
    "father", 
    "mother", 
    "brother", 
    "sister", 
    "guardian", 
    "husband", 
    "wife", 
    "spouse", 
    "parent", 
    "local_sponsor", 
    "other"
  ]).optional().nullable(),
  relationshipName: z.string().optional().nullable(),
  relationshipPhone: z.string().optional().nullable(),
  relationshipEmail: z.string().optional().nullable(),
  relationshipAddress: z.string().optional().nullable(),
  embassyName: z.string().optional().nullable(),
  embassyAddress: z.string().optional().nullable(),
  embassyCity: z.string().optional().nullable(),
  embassyCountry: z.string().optional().nullable(),
  embassyPhone: z.string().optional().nullable(),
  embassyEmail: z.string().optional().nullable().refine(val => {
    if (!val || !val.trim()) return true;
    return z.string().email().safeParse(val.trim()).success;
  }, { message: "Invalid consular email address format" }),
  embassyWebsite: z.string().optional().nullable(),
  embassyContactPerson: z.string().optional().nullable(),
  // Bank Details fields (All Optional)
  bankName: z.string().max(255).optional().nullable(),
  accountNumber: z.string().max(100).optional().nullable(),
  ifscCode: z.string().max(50).optional().nullable(),
  branchAddress: z.string().max(1000).optional().nullable(),
  bankDetails: z.object({
    bankName: z.string().max(255).optional().nullable(),
    accountNumber: z.string().max(100).optional().nullable(),
    ifscCode: z.string().max(50).optional().nullable(),
    branchAddress: z.string().max(1000).optional().nullable()
  }).optional().nullable()
}).refine((data) => {
  if (data.admissionCategory === "other") {
    return Boolean(data.admissionCategoryOther && data.admissionCategoryOther.trim().length > 0);
  }
  return true;
}, {
  message: "Please specify the custom admission category",
  path: ["admissionCategoryOther"]
});
