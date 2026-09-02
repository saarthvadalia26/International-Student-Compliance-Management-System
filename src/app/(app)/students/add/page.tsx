"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  User, 
  GraduationCap, 
  PhoneCall, 
  FileCheck, 
  ChevronLeft, 
  AlertCircle, 
  XCircle, 
  Layers, 
  Sparkles, 
  Info,
  Users,
  Landmark,
  Award,
  MapPin
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionNavGroup, SectionNavCard } from "@/components/ui/section-nav";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NationalitySelector } from "@/components/ui/nationality-selector";
import { SearchableProgramSelector } from "@/components/ui/searchable-program-selector";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { getActiveAcademicProgramsAction } from "@/app/(app)/settings/academic-programs-actions";
import { getActiveScholarshipSchemesAction } from "@/app/(app)/settings/scholarship-actions";
import { getActiveCampusesAction } from "@/app/(app)/settings/campus-actions";
import { AcademicProgram, getAcademicLevelLabel } from "@/domain/academic-programs/types";
import { ScholarshipScheme } from "@/domain/scholarships/types";
import { Campus } from "@/domain/campuses/types";
import { normalizeCountryInputSync } from "@/domain/countries/country-utils";
import { RegisterStudentValidationSchema } from "@/services/validation/student-validation";
import { registerStudentAction } from "@/app/(app)/students/actions";
import { RegisterStudentInput } from "@/services/student/student.types";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import { AcademicProgressionEngine } from "@/domain/academic/services/semester-progression.service";
import { 
  MARITAL_STATUS_OPTIONS, 
  BLOOD_GROUP_OPTIONS, 
  RELATIONSHIP_TYPE_OPTIONS, 
  ADMISSION_CATEGORY_OPTIONS, 
  FEE_PAYMENT_CATEGORY_OPTIONS,
  FEE_CURRENCY_OPTIONS,
  formatAgeDisplay,
  MaritalStatus,
  BloodGroup,
  RelationshipType,
  AdmissionCategory,
  FeePaymentCategory,
  FeeCurrency
} from "@/domain/students/types/registration-expansion.types";

type TabKey = "personal" | "academic" | "contact" | "documents";

interface FieldMeta {
  tab: TabKey;
  elementId: string;
  label: string;
}

const FIELD_METADATA: Record<string, FieldMeta> = {
  enrollmentNumber: { tab: "academic", elementId: "enrollmentNumber", label: "Enrollment Number" },
  registrationNumber: { tab: "academic", elementId: "enrollmentNumber", label: "Enrollment Number" },
  fullName: { tab: "personal", elementId: "fullName", label: "Full Name" },
  nationalityCode: { tab: "personal", elementId: "nationality", label: "Nationality" },
  nationality: { tab: "personal", elementId: "nationality", label: "Nationality" },
  gender: { tab: "personal", elementId: "gender", label: "Gender" },
  dateOfBirth: { tab: "personal", elementId: "dateOfBirth", label: "Date of Birth" },
  maritalStatus: { tab: "personal", elementId: "maritalStatus", label: "Marital Status" },
  bloodGroup: { tab: "personal", elementId: "bloodGroup", label: "Blood Group" },
  physicalDisability: { tab: "personal", elementId: "physicalDisability", label: "Physical Disability" },
  
  programCode: { tab: "academic", elementId: "program", label: "Academic Program" },
  program: { tab: "academic", elementId: "program", label: "Academic Program" },
  school: { tab: "academic", elementId: "school", label: "School / Department" },
  admissionDate: { tab: "academic", elementId: "admissionDate", label: "Admission Date" },
  joiningDate: { tab: "academic", elementId: "joiningDate", label: "Joining Date" },
  expectedGraduation: { tab: "academic", elementId: "expectedGraduation", label: "Expected Graduation Date" },
  currentSemester: { tab: "academic", elementId: "currentSemester", label: "Current Semester" },
  admissionCategory: { tab: "academic", elementId: "admissionCategory", label: "Admission Category" },
  admissionCategoryOther: { tab: "academic", elementId: "admissionCategoryOther", label: "Custom Admission Track" },
  siiApplicationNumber: { tab: "academic", elementId: "siiApplicationNumber", label: "SII Application Number" },
  iccrApplicationNumber: { tab: "academic", elementId: "iccrApplicationNumber", label: "ICCR Application Number" },
  iccrScholarshipSchemeName: { tab: "academic", elementId: "iccrScholarshipSchemeName", label: "Name of ICCR Scholarship Scheme" },
  scholarshipSchemeName: { tab: "academic", elementId: "iccrScholarshipSchemeName", label: "Scholarship Scheme" },
  nfsuCampus: { tab: "academic", elementId: "nfsuCampus", label: "NFSU Campus" },
  admissionAcademicYear: { tab: "academic", elementId: "admissionAcademicYear", label: "Admission / Academic Year" },
  feePaymentCategory: { tab: "academic", elementId: "feePaymentCategory", label: "Fee Payment Category" },
  tuitionFeeAmount: { tab: "academic", elementId: "tuitionFeeAmount", label: "Tuition Fees Amount" },
  tuitionFeeCurrency: { tab: "academic", elementId: "tuitionFeeCurrency", label: "Tuition Fees Currency" },
  hostelFeeAmount: { tab: "academic", elementId: "hostelFeeAmount", label: "Hostel Fees Amount" },
  hostelFeeCurrency: { tab: "academic", elementId: "hostelFeeCurrency", label: "Hostel Fees Currency" },
  
  phoneHome: { tab: "contact", elementId: "phoneHome", label: "Home Country Phone" },
  email: { tab: "contact", elementId: "email", label: "Student Email" },
  phoneLocal: { tab: "contact", elementId: "phoneLocal", label: "Local Contact Phone" },
  permanentAddress: { tab: "contact", elementId: "permanentAddress", label: "Permanent Address" },
  presentAddress: { tab: "contact", elementId: "presentAddress", label: "Present / Current Address" },
  localAddress: { tab: "contact", elementId: "presentAddress", label: "Present / Current Address" },
  
  fatherName: { tab: "contact", elementId: "fatherName", label: "Father Name" },
  fatherMobile: { tab: "contact", elementId: "fatherMobile", label: "Father Mobile" },
  fatherWhatsapp: { tab: "contact", elementId: "fatherWhatsapp", label: "Father WhatsApp" },
  fatherEmail: { tab: "contact", elementId: "fatherEmail", label: "Father's Email ID" },
  motherName: { tab: "contact", elementId: "motherName", label: "Mother Name" },
  motherMobile: { tab: "contact", elementId: "motherMobile", label: "Mother Mobile" },
  motherWhatsapp: { tab: "contact", elementId: "motherWhatsapp", label: "Mother WhatsApp" },
  motherEmail: { tab: "contact", elementId: "motherEmail", label: "Mother's Email ID" },

  relationshipName: { tab: "contact", elementId: "emergencyContactName", label: "Emergency Contact Name" },
  emergencyContactName: { tab: "contact", elementId: "emergencyContactName", label: "Emergency Contact Name" },
  relationshipType: { tab: "contact", elementId: "emergencyContactRelation", label: "Relationship Type" },
  emergencyContactRelation: { tab: "contact", elementId: "emergencyContactRelation", label: "Relationship Type" },
  relationshipPhone: { tab: "contact", elementId: "emergencyContactPhone", label: "Emergency Contact Phone" },
  emergencyContactPhone: { tab: "contact", elementId: "emergencyContactPhone", label: "Emergency Contact Phone" },
  relationshipEmail: { tab: "contact", elementId: "emergencyContactEmail", label: "Emergency Contact Email" },
  
  passportNumber: { tab: "documents", elementId: "passportNumber", label: "Passport Number" },
  passportIssueDate: { tab: "documents", elementId: "passportIssueDate", label: "Passport Issue Date" },
  passportExpiry: { tab: "documents", elementId: "passportExpiry", label: "Passport Expiry Date" },
  passportPlaceOfIssue: { tab: "documents", elementId: "passportPlaceOfIssue", label: "Passport Place of Issue" },
  visaNumber: { tab: "documents", elementId: "visaNumber", label: "Visa Number" },
  visaIssueDate: { tab: "documents", elementId: "visaIssueDate", label: "Visa Issue Date" },
  visaExpiry: { tab: "documents", elementId: "visaExpiry", label: "Visa Expiry Date" },
  visaType: { tab: "documents", elementId: "visaType", label: "Visa Classification" },
  efrroNumber: { tab: "documents", elementId: "efrroNumber", label: "eFRRO / Registration Number" },
  efrroIssueDate: { tab: "documents", elementId: "efrroIssueDate", label: "eFRRO Issue Date" },
  efrroExpiry: { tab: "documents", elementId: "efrroExpiry", label: "eFRRO Expiration Date" },

  bankName: { tab: "documents", elementId: "bankName", label: "Bank Name" },
  accountNumber: { tab: "documents", elementId: "accountNumber", label: "Account Number" },
  ifscCode: { tab: "documents", elementId: "ifscCode", label: "IFSC Code" },
  branchAddress: { tab: "documents", elementId: "branchAddress", label: "Branch Address" }
};

/**
 * Normalizes any incoming date string or Date instance to a strict local YYYY-MM-DD format.
 * Strictly prevents interpreting non-date 3-letter strings (like country codes "MAR", "MAY") as dates.
 */
function normalizeDateToISO(val: Date | string | undefined | null): string {
  if (!val) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (str.includes("T") && /^\d{4}-\d{2}-\d{2}T/.test(str)) return str.split("T")[0];
  const slashParts = str.split("/");
  if (slashParts.length === 3) {
    if (slashParts[0].length === 4) {
      return `${slashParts[0]}-${slashParts[1].padStart(2, "0")}-${slashParts[2].padStart(2, "0")}`;
    } else if (slashParts[2].length === 4) {
      return `${slashParts[2]}-${slashParts[0].padStart(2, "0")}-${slashParts[1].padStart(2, "0")}`;
    }
  }
  const hyphenParts = str.split("-");
  if (hyphenParts.length === 3 && hyphenParts[2].length === 4) {
    return `${hyphenParts[2]}-${hyphenParts[1].padStart(2, "0")}-${hyphenParts[0].padStart(2, "0")}`;
  }
  // Only attempt Date parsing if string contains numeric digits to avoid colliding with 3-letter country codes
  if (/\d/.test(str)) {
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return str;
}

export default function StudentRegistrationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabKey>("personal");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittingSuccess, setSubmittingSuccess] = React.useState(false);
  const [submittingError, setSubmittingError] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  // Dynamic Academic Master Data state
  const [academicPrograms, setAcademicPrograms] = React.useState<AcademicProgram[]>([]);
  const [scholarshipSchemes, setScholarshipSchemes] = React.useState<ScholarshipScheme[]>([]);
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = React.useState(true);

  React.useEffect(() => {
    async function loadMasterData() {
      setIsLoadingPrograms(true);
      try {
        const [progRes, schRes, campRes] = await Promise.all([
          getActiveAcademicProgramsAction(),
          getActiveScholarshipSchemesAction(),
          getActiveCampusesAction()
        ]);
        if (progRes.success && progRes.programs) {
          setAcademicPrograms(progRes.programs);
        }
        if (schRes.success && schRes.schemes) {
          setScholarshipSchemes(schRes.schemes);
        }
        if (campRes.success && campRes.campuses) {
          setCampuses(campRes.campuses);
        }
      } finally {
        setIsLoadingPrograms(false);
      }
    }
    loadMasterData();
  }, []);

  // Form State (persisted across all tab transitions)
  const [formData, setFormData] = React.useState({
    // Personal Identity
    fullName: "",
    nationality: "",
    gender: "",
    dateOfBirth: "",
    maritalStatus: "",
    bloodGroup: "",
    physicalDisability: "", // "" (not specified), "yes", "no"

    // Academic Profile
    enrollmentNumber: "",
    programId: "",
    program: "",
    school: "",
    admissionDate: "",
    joiningDate: "",
    expectedGraduation: "",
    admissionCategory: "",
    admissionCategoryOther: "",
    siiApplicationNumber: "",
    iccrApplicationNumber: "",
    iccrScholarshipSchemeName: "",
    nfsuCampus: "",
    admissionAcademicYear: "",
    feePaymentCategory: "",
    tuitionFeeAmount: "",
    tuitionFeeCurrency: "INR",
    hostelFeeAmount: "",
    hostelFeeCurrency: "INR",

    // Contact Coordinates
    email: "",
    phoneHome: "",
    phoneHomeCountryCode: "+91",
    phoneHomeNumber: "",
    phoneLocal: "",
    phoneLocalCountryCode: "+91",
    phoneLocalNumber: "",
    permanentAddress: "",
    presentAddress: "",
    localAddress: "",

    // Family Information
    fatherName: "",
    fatherMobile: "",
    fatherMobileCountryCode: "+91",
    fatherMobileNumber: "",
    fatherWhatsapp: "",
    fatherWhatsappCountryCode: "+91",
    fatherWhatsappNumber: "",
    fatherEmail: "",
    motherName: "",
    motherMobile: "",
    motherMobileCountryCode: "+91",
    motherMobileNumber: "",
    motherWhatsapp: "",
    motherWhatsappCountryCode: "+91",
    motherWhatsappNumber: "",
    motherEmail: "",

    // Emergency Contact
    emergencyContactName: "",
    emergencyContactRelation: "parent",
    emergencyContactPhone: "",
    emergencyContactCountryCode: "+91",
    emergencyContactNumber: "",
    emergencyContactEmail: "",

    // Documents
    passportNumber: "",
    passportIssueDate: "",
    passportExpiry: "",
    passportPlaceOfIssue: "",
    visaNumber: "",
    visaIssueDate: "",
    visaExpiry: "",
    visaType: "Student (S-1)",
    efrroNumber: "",
    efrroIssueDate: "",
    efrroExpiry: "",

    // Bank Details (Optional)
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchAddress: ""
  });

  // Calculate error counts per tab
  const tabErrorCounts = React.useMemo(() => {
    const counts: Record<TabKey, number> = {
      personal: 0,
      academic: 0,
      contact: 0,
      documents: 0
    };
    Object.keys(validationErrors).forEach((field) => {
      const meta = FIELD_METADATA[field];
      if (meta) {
        counts[meta.tab]++;
      }
    });
    return counts;
  }, [validationErrors]);

  // Derived age display
  const calculatedAgeInfo = React.useMemo(() => {
    return formatAgeDisplay(formData.dateOfBirth);
  }, [formData.dateOfBirth]);

  // Derived currently selected program object
  const selectedProgram = React.useMemo(() => {
    const ident = formData.programId || formData.program;
    if (!ident) return null;
    return academicPrograms.find(p => 
      p.id === ident || 
      p.programName === ident || 
      p.programCode === ident
    ) || null;
  }, [formData.programId, formData.program, academicPrograms]);

  // Helper to calculate expected graduation date dynamically from program configuration
  const calculateGraduationDate = (programIdent: string, admissionDateStr: string) => {
    if (!admissionDateStr || !programIdent) return "";
    const selectedProg = academicPrograms.find(p => 
      p.id === programIdent || 
      p.programName === programIdent || 
      p.programCode === programIdent
    );
    if (!selectedProg) return "";

    return AcademicProgressionEngine.calculateExpectedGraduationDate({
      admissionDate: admissionDateStr,
      courseConfig: {
        programName: selectedProg.programName,
        programCode: selectedProg.programCode,
        totalSemesters: selectedProg.totalSemesters || 8,
        semesterDuration: selectedProg.semesterDuration || 6,
        semesterDurationUnit: selectedProg.semesterDurationUnit || "months"
      }
    });
  };

  const handleProgramChange = (prog: AcademicProgram | null) => {
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next.program;
      delete next.programCode;
      return next;
    });

    setFormData(prev => {
      const next = {
        ...prev,
        programId: prog?.id || "",
        program: prog?.programName || "",
        school: prog?.schoolName || prev.school || ""
      };
      if (prev.admissionDate && prog) {
        next.expectedGraduation = calculateGraduationDate(prog.id, prev.admissionDate);
      }
      return next;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    
    // Clear validation error on field change
    if (validationErrors[id] || validationErrors[id === "emergencyContactName" ? "relationshipName" : id === "emergencyContactPhone" ? "relationshipPhone" : id]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[id];
        if (id === "emergencyContactName") delete next.relationshipName;
        if (id === "emergencyContactPhone") delete next.relationshipPhone;
        return next;
      });
    }

    setFormData(prev => {
      const next = { ...prev, [id]: value };
      if (id === "admissionDate" && (prev.programId || prev.program)) {
        next.expectedGraduation = calculateGraduationDate(prev.programId || prev.program, value);
      }
      return next;
    });
  };

  const handleSelectChange = (field: string, value: string) => {
    const isDateField = field.toLowerCase().includes("date") || field.toLowerCase().includes("expiry");
    const normalizedVal = isDateField ? (normalizeDateToISO(value) || value) : value;

    // Clear validation error on select/date change
    const relatedKey = field === "nationality" ? "nationalityCode" 
      : field === "program" ? "programCode" 
      : field === "emergencyContactRelation" ? "relationshipType" 
      : field;

    if (validationErrors[field] || validationErrors[relatedKey]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        delete next[relatedKey];
        return next;
      });
    }

    setFormData(prev => {
      const next = { ...prev, [field]: normalizedVal };
      if (field === "admissionDate" && (prev.programId || prev.program)) {
        next.expectedGraduation = calculateGraduationDate(prev.programId || prev.program, normalizedVal);
      }
      return next;
    });
  };

  // Focus a specific field and jump to its tab
  const focusField = (fieldKey: string) => {
    const meta = FIELD_METADATA[fieldKey] || { tab: "personal", elementId: fieldKey, label: fieldKey };
    setActiveTab(meta.tab);
    setTimeout(() => {
      const el = document.getElementById(meta.elementId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }, 120);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedDob = normalizeDateToISO(formData.dateOfBirth);
    const sanitizedAdm = normalizeDateToISO(formData.admissionDate);
    const sanitizedJoining = normalizeDateToISO(formData.joiningDate);
    const sanitizedGrad = normalizeDateToISO(formData.expectedGraduation);
    const sanitizedPassIssue = normalizeDateToISO(formData.passportIssueDate);
    const sanitizedPassExp = normalizeDateToISO(formData.passportExpiry);
    const sanitizedVisaIssue = normalizeDateToISO(formData.visaIssueDate);
    const sanitizedVisaExp = normalizeDateToISO(formData.visaExpiry);
    const sanitizedEfrroIssue = normalizeDateToISO(formData.efrroIssueDate);
    const sanitizedEfrroExp = normalizeDateToISO(formData.efrroExpiry);

    // Disability 3-state parsing
    let physicalDisabilityVal: boolean | null | undefined = undefined;
    if (formData.physicalDisability === "yes") physicalDisabilityVal = true;
    else if (formData.physicalDisability === "no") physicalDisabilityVal = false;
    else if (formData.physicalDisability === "not_specified") physicalDisabilityVal = null;

    // Zod payload assembly for progressive student registration
    const validationPayload: RegisterStudentInput = {
      registrationNumber: formData.enrollmentNumber?.trim() || undefined,
      fullName: formData.fullName.trim(),
      nationalityCode: formData.nationality ? (normalizeCountryInputSync(formData.nationality)?.isoAlpha3 || formData.nationality.trim().toUpperCase()) : undefined,
      gender: (formData.gender as "male" | "female" | "other" | "transgender" | "prefer_not_to_say") || undefined,
      dateOfBirth: sanitizedDob || undefined,
      maritalStatus: (formData.maritalStatus as MaritalStatus) || undefined,
      bloodGroup: formData.bloodGroup?.trim() || undefined,
      physicalDisability: physicalDisabilityVal,

      // Family info
      fatherName: formData.fatherName?.trim() || undefined,
      fatherMobile: formData.fatherMobile?.trim() || undefined,
      fatherMobileCountryCode: formData.fatherMobileCountryCode?.trim() || undefined,
      fatherMobileNumber: formData.fatherMobileNumber?.trim() || undefined,
      fatherWhatsapp: formData.fatherWhatsapp?.trim() || undefined,
      fatherWhatsappCountryCode: formData.fatherWhatsappCountryCode?.trim() || undefined,
      fatherWhatsappNumber: formData.fatherWhatsappNumber?.trim() || undefined,
      fatherEmail: formData.fatherEmail?.trim().toLowerCase() || undefined,
      motherName: formData.motherName?.trim() || undefined,
      motherMobile: formData.motherMobile?.trim() || undefined,
      motherMobileCountryCode: formData.motherMobileCountryCode?.trim() || undefined,
      motherMobileNumber: formData.motherMobileNumber?.trim() || undefined,
      motherWhatsapp: formData.motherWhatsapp?.trim() || undefined,
      motherWhatsappCountryCode: formData.motherWhatsappCountryCode?.trim() || undefined,
      motherWhatsappNumber: formData.motherWhatsappNumber?.trim() || undefined,
      motherEmail: formData.motherEmail?.trim().toLowerCase() || undefined,

      // Contact coordinates
      email: formData.email.trim().toLowerCase() || undefined,
      phoneHome: formData.phoneHome.trim() || undefined,
      phoneHomeCountryCode: formData.phoneHomeCountryCode.trim() || undefined,
      phoneHomeNumber: formData.phoneHomeNumber.trim() || undefined,
      phoneLocal: formData.phoneLocal.trim() || undefined,
      phoneLocalCountryCode: formData.phoneLocalCountryCode.trim() || undefined,
      phoneLocalNumber: formData.phoneLocalNumber.trim() || undefined,
      permanentAddress: formData.permanentAddress.trim() || undefined,
      presentAddress: formData.presentAddress.trim() || formData.localAddress.trim() || undefined,
      localAddress: formData.presentAddress.trim() || formData.localAddress.trim() || undefined,

      // Academic profile
      programId: formData.programId.trim() || undefined,
      programCode: formData.program.trim() || undefined,
      admissionDate: sanitizedAdm || undefined,
      joiningDate: sanitizedJoining || undefined,
      expectedGraduation: sanitizedGrad || undefined,
      currentSemester: formData.program.trim() ? 1 : undefined,
      admissionCategory: (formData.admissionCategory as AdmissionCategory) || undefined,
      admissionCategoryOther: formData.admissionCategory === "other" ? (formData.admissionCategoryOther.trim() || undefined) : undefined,
      siiApplicationNumber: formData.siiApplicationNumber?.trim() || undefined,
      iccrApplicationNumber: formData.iccrApplicationNumber?.trim() || undefined,
      iccrScholarshipSchemeName: formData.iccrScholarshipSchemeName?.trim() || undefined,
      scholarshipSchemeName: formData.iccrScholarshipSchemeName?.trim() || undefined,
      nfsuCampus: formData.nfsuCampus?.trim() || undefined,
      admissionAcademicYear: formData.admissionAcademicYear?.trim() || undefined,
      feePaymentCategory: (formData.feePaymentCategory as FeePaymentCategory) || undefined,
      tuitionFeeAmount: formData.tuitionFeeAmount?.trim() !== "" ? Number(formData.tuitionFeeAmount) : undefined,
      tuitionFeeCurrency: formData.tuitionFeeAmount?.trim() !== "" ? ((formData.tuitionFeeCurrency as FeeCurrency) || "INR") : undefined,
      hostelFeeAmount: formData.hostelFeeAmount?.trim() !== "" ? Number(formData.hostelFeeAmount) : undefined,
      hostelFeeCurrency: formData.hostelFeeAmount?.trim() !== "" ? ((formData.hostelFeeCurrency as FeeCurrency) || "INR") : undefined,

      // Emergency relationship
      relationshipType: formData.emergencyContactName.trim() ? (formData.emergencyContactRelation as RelationshipType) : undefined,
      relationshipName: formData.emergencyContactName.trim() || undefined,
      relationshipPhone: formData.emergencyContactPhone.trim() || undefined,
      relationshipEmail: formData.emergencyContactEmail.trim() || undefined,

      // Document details
      passportNumber: formData.passportNumber.trim() || undefined,
      passportIssueDate: sanitizedPassIssue || undefined,
      passportExpiry: sanitizedPassExp || undefined,
      passportPlaceOfIssue: formData.passportPlaceOfIssue.trim() || undefined,
      visaNumber: formData.visaNumber.trim() || undefined,
      visaIssueDate: sanitizedVisaIssue || undefined,
      visaExpiry: sanitizedVisaExp || undefined,
      visaType: formData.visaType.trim() || undefined,
      efrroNumber: formData.efrroNumber.trim() || undefined,
      efrroIssueDate: sanitizedEfrroIssue || undefined,
      efrroExpiry: sanitizedEfrroExp || undefined,

      // Bank Details (Optional)
      bankName: formData.bankName?.trim() || undefined,
      accountNumber: formData.accountNumber?.trim() || undefined,
      ifscCode: formData.ifscCode?.trim() || undefined,
      branchAddress: formData.branchAddress?.trim() || undefined
    };

    const result = RegisterStudentValidationSchema.safeParse(validationPayload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      let firstErrorField = "";

      result.error.issues.forEach((issue) => {
        const path = String(issue.path[0] || "");
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
          if (!firstErrorField) firstErrorField = path;
        }
      });
      
      setValidationErrors(fieldErrors);
      const errorCount = Object.keys(fieldErrors).length;
      
      if (firstErrorField) {
        focusField(firstErrorField);
      }

      toast.error("Student information is incomplete", {
        description: errorCount === 1 
          ? "Please correct the highlighted field before registering the student." 
          : `Please correct the ${errorCount} highlighted fields before registering the student.`
      });
      return;
    }

    setValidationErrors({});
    setIsSubmitting(true);
    setSubmittingSuccess(false);
    setSubmittingError(false);

    try {
      const res = await registerStudentAction(validationPayload);
      if (res.success && res.studentId) {
        setSubmittingSuccess(true);
        toast.success("Student registered successfully", {
          description: `${formData.fullName} has been added to the international student directory.`
        });
        setTimeout(() => {
          router.push(`/students/${res.studentId}`);
        }, 800);
      } else {
        setSubmittingError(true);
        
        if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
          setValidationErrors(res.fieldErrors);
          const firstKey = Object.keys(res.fieldErrors)[0];
          if (firstKey) focusField(firstKey);
        }

        const errTitle = res.errorTitle || "Unable to register student";
        const errMsg = res.error || "An unexpected error occurred while saving the student record.";
        
        toast.error(errTitle, {
          description: errMsg
        });
      }
    } catch (err) {
      setSubmittingError(true);
      const raw = err instanceof Error ? err.message : String(err || "");
      toast.error("Unable to save the student", {
        description: raw.includes("fetch") || raw.includes("network") 
          ? "Connection lost. Please check your internet connection." 
          : "The system could not connect to the database. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Back navigation */}
      <div className="flex items-center">
        <Link href="/students" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-small transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Student Directory
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="font-h1 tracking-tight text-foreground text-2xl font-bold">Register International Student</h1>
        <p className="font-caption text-muted-foreground text-xs mt-1">
          Enter the demographic, academic, and family information available. Additional fields can be progressively updated later.
        </p>
      </div>

      {/* Top-Level Incomplete Form Summary Card */}
      {hasValidationErrors && (
        <div 
          role="alert"
          aria-live="polite"
          className="p-4 rounded-xl border border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 shadow-sm animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div>
                <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                  Student information is incomplete
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  Please correct the {Object.keys(validationErrors).length === 1 ? "highlighted field" : `${Object.keys(validationErrors).length} highlighted fields`} before registering the student. Click any item to jump directly to it:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {Object.entries(validationErrors).map(([fieldKey, errorMsg]) => {
                  const meta = FIELD_METADATA[fieldKey] || { tab: "personal", elementId: fieldKey, label: fieldKey };
                  return (
                    <button
                      key={fieldKey}
                      type="button"
                      onClick={() => focusField(fieldKey)}
                      className="group flex items-start gap-2 p-2 rounded-lg bg-white/70 dark:bg-zinc-900/60 border border-rose-200 dark:border-rose-900/50 text-left hover:border-rose-400 dark:hover:border-rose-700 transition-all shadow-2xs"
                    >
                      <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0 group-hover:scale-125 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-rose-950 dark:text-rose-100 flex items-center justify-between">
                          <span>{meta.label}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                            {meta.tab}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-tight mt-0.5">
                          {errorMsg}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        {/* Sidebar Tabs navigation */}
        <div className="md:col-span-1 min-w-0">
          <SectionNavGroup orientation="responsive" className="min-w-0">
            <SectionNavCard
              icon={User}
              title="Personal & Demographic"
              isActive={activeTab === "personal"}
              onClick={() => setActiveTab("personal")}
              badgeCount={tabErrorCounts.personal}
              badgeVariant="destructive"
            />
            <SectionNavCard
              icon={GraduationCap}
              title="Academic & Admission"
              isActive={activeTab === "academic"}
              onClick={() => setActiveTab("academic")}
              badgeCount={tabErrorCounts.academic}
              badgeVariant="destructive"
            />
            <SectionNavCard
              icon={PhoneCall}
              title="Contact & Guardian"
              isActive={activeTab === "contact"}
              onClick={() => setActiveTab("contact")}
              badgeCount={tabErrorCounts.contact}
              badgeVariant="destructive"
            />
            <SectionNavCard
              icon={FileCheck}
              title="Documents & Legal"
              isActive={activeTab === "documents"}
              onClick={() => setActiveTab("documents")}
              badgeCount={tabErrorCounts.documents}
              badgeVariant="destructive"
            />
          </SectionNavGroup>

          <div className="hidden md:block mt-6 p-3 rounded-xl border border-border/60 bg-muted/20 text-[11px] text-muted-foreground font-caption space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Progressive Registration
            </div>
            <p className="leading-relaxed">
              Only <strong>Legal Full Name</strong> is mandatory for initial registration. All demographic, family, admission, and document details can be progressively enriched anytime.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <Card className="md:col-span-3 border border-border/60 shadow-sm overflow-visible">
          <form onSubmit={handleSubmit} noValidate>
            {/* Personal Details Tab */}
            {activeTab === "personal" && (
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-sm font-h2 font-semibold">Personal & Demographic Identity</h2>
                  <p className="text-[11px] text-muted-foreground font-caption">Biographical coordinates, demographic background, and health indicators.</p>
                </div>
                <Separator className="my-2" />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1" htmlFor="fullName">
                      Full Name (as per Passport) <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <Input
                      id="fullName"
                      placeholder="e.g. Elena Rostova"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={validationErrors.fullName ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                    />
                    {validationErrors.fullName && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="nationality">
                      Nationality <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <NationalitySelector 
                      value={formData.nationality} 
                      onChange={(v) => handleSelectChange("nationality", v)} 
                    />
                    {(validationErrors.nationalityCode || validationErrors.nationality) && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.nationalityCode || validationErrors.nationality}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="gender">
                      Gender <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Select value={formData.gender} onValueChange={(v) => handleSelectChange("gender", v || "")}>
                      <SelectTrigger 
                        id="gender"
                        className={validationErrors.gender ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      >
                        <SelectValue placeholder="Choose Gender (Optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="transgender">Transgender</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.gender && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.gender}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between" htmlFor="dateOfBirth">
                      <span>Date of Birth</span>
                      {calculatedAgeInfo && (
                        <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                          {calculatedAgeInfo.fullText}
                        </span>
                      )}
                    </label>
                    <DatePicker
                      id="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                      onValueChange={(v) => handleSelectChange("dateOfBirth", v)}
                      disabled={isSubmitting}
                      disableFuture={true}
                      maxDate={new Date()}
                      startYear={1940}
                      placeholder="Select date of birth..."
                      error={validationErrors.dateOfBirth}
                    />
                    <p className="text-[11px] text-muted-foreground font-caption">
                      Age is automatically calculated from the date of birth.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="maritalStatus">
                      Marital Status <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Select value={formData.maritalStatus} onValueChange={(v) => handleSelectChange("maritalStatus", v || "")}>
                      <SelectTrigger 
                        id="maritalStatus"
                        className={validationErrors.maritalStatus ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      >
                        <SelectValue placeholder="Select Marital Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.maritalStatus && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.maritalStatus}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="bloodGroup">
                      Blood Group <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Select value={formData.bloodGroup} onValueChange={(v) => handleSelectChange("bloodGroup", v || "")}>
                      <SelectTrigger 
                        id="bloodGroup"
                        className={validationErrors.bloodGroup ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      >
                        <SelectValue placeholder="Select Blood Group" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUP_OPTIONS.map((bg) => (
                          <SelectItem key={bg.value} value={bg.value} className="font-mono">{bg.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.bloodGroup && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.bloodGroup}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="physicalDisability">
                      Physical Disability <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Select value={formData.physicalDisability} onValueChange={(v) => handleSelectChange("physicalDisability", v || "")}>
                      <SelectTrigger 
                        id="physicalDisability"
                        className={validationErrors.physicalDisability ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      >
                        <SelectValue placeholder="Select Status (Not Specified)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_specified">Not Specified</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                    {validationErrors.physicalDisability && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.physicalDisability}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            )}

            {/* Academic Details Tab */}
            {activeTab === "academic" && (
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-sm font-h2 font-semibold">Academic Profile & Admission Track</h2>
                  <p className="text-[11px] text-muted-foreground font-caption">University enrollment structure, academic programs, and institutional admission channels.</p>
                </div>
                <Separator className="my-2" />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1" htmlFor="enrollmentNumber">
                      Enrollment Number <span className="text-muted-foreground text-[10px] font-normal">(Optional - Leave blank if not yet issued)</span>
                    </label>
                    <Input
                      id="enrollmentNumber"
                      placeholder="e.g. NFSU/2026/CS/101 (Leave blank if not yet available)"
                      value={formData.enrollmentNumber}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm font-mono ${(validationErrors.registrationNumber || validationErrors.enrollmentNumber) ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {(validationErrors.registrationNumber || validationErrors.enrollmentNumber) && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.registrationNumber || validationErrors.enrollmentNumber}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="admissionCategory">
                      Admission Category <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Select 
                      value={formData.admissionCategory} 
                      onValueChange={(v) => handleSelectChange("admissionCategory", v || "")}
                    >
                      <SelectTrigger 
                        id="admissionCategory"
                        className={`h-10 text-xs ${validationErrors.admissionCategory ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      >
                        <SelectValue placeholder="Select Admission Channel / Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMISSION_CATEGORY_OPTIONS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.admissionCategory && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.admissionCategory}
                      </p>
                    )}
                  </div>

                  {/* Conditional: Please specify when category is Other */}
                  {formData.admissionCategory === "other" && (
                    <div className="space-y-1.5 sm:col-span-2 animate-in fade-in-0 slide-in-from-top-1">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1" htmlFor="admissionCategoryOther">
                        Please Specify Admission Track <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <Input
                        id="admissionCategoryOther"
                        placeholder="e.g. Bilateral Cultural Exchange or Special Scholarship"
                        value={formData.admissionCategoryOther}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.admissionCategoryOther ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {validationErrors.admissionCategoryOther && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.admissionCategoryOther}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ICCR Application Number - Always visible, optional */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="iccrApplicationNumber">
                      ICCR Application Number <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Input
                      id="iccrApplicationNumber"
                      placeholder="e.g. ICCR-2026-98124"
                      value={formData.iccrApplicationNumber}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm font-mono ${validationErrors.iccrApplicationNumber ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {validationErrors.iccrApplicationNumber && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.iccrApplicationNumber}
                      </p>
                    )}
                  </div>

                  {/* Name of ICCR Scholarship Scheme - Dynamic master data or text fallback */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between" htmlFor="iccrScholarshipSchemeName">
                      <span>Scholarship Scheme <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span></span>
                      {scholarshipSchemes.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">Configured in Master Data</span>
                      )}
                    </label>
                    {scholarshipSchemes.length > 0 ? (
                      <Select
                        value={formData.iccrScholarshipSchemeName || "none"}
                        onValueChange={(v) => handleSelectChange("iccrScholarshipSchemeName", !v || v === "none" ? "" : v)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="iccrScholarshipSchemeName"
                          className={`h-10 text-xs ${validationErrors.iccrScholarshipSchemeName ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                        >
                          <SelectValue placeholder="Select Scholarship Scheme (None / Direct)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="none">None / Direct Admission</SelectItem>
                          {scholarshipSchemes.map((sch) => (
                            <SelectItem key={sch.id} value={sch.name} className="text-xs">
                              {sch.name} {sch.code ? `(${sch.code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="iccrScholarshipSchemeName"
                        placeholder="e.g. Silver Jubilee Scholarship Scheme, Africa Scholarship Scheme"
                        value={formData.iccrScholarshipSchemeName}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.iccrScholarshipSchemeName ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                    )}
                    {validationErrors.iccrScholarshipSchemeName && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.iccrScholarshipSchemeName}
                      </p>
                    )}
                  </div>

                  {/* SII Application Number - Always visible, optional */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="siiApplicationNumber">
                      SII Application Number <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Input
                      id="siiApplicationNumber"
                      placeholder="e.g. SII-2026-88192"
                      value={formData.siiApplicationNumber}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm font-mono ${validationErrors.siiApplicationNumber ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {validationErrors.siiApplicationNumber && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.siiApplicationNumber}
                      </p>
                    )}
                  </div>

                  {/* NFSU Campus - Dynamic master data or text fallback */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between" htmlFor="nfsuCampus">
                      <span>NFSU Campus <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span></span>
                      {campuses.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">Configured in Master Data</span>
                      )}
                    </label>
                    {campuses.length > 0 ? (
                      <Select
                        value={formData.nfsuCampus || "none"}
                        onValueChange={(v) => handleSelectChange("nfsuCampus", !v || v === "none" ? "" : v)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="nfsuCampus"
                          className={`h-10 text-xs ${validationErrors.nfsuCampus ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                        >
                          <SelectValue placeholder="Select NFSU Campus" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="none">Not Specified</SelectItem>
                          {campuses.map((c) => (
                            <SelectItem key={c.id} value={c.name} className="text-xs">
                              {c.name} {c.location ? `— ${c.location}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="nfsuCampus"
                        placeholder="e.g. Delhi Campus, Gandhinagar Campus, Mumbai Campus"
                        value={formData.nfsuCampus}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.nfsuCampus ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                    )}
                    {validationErrors.nfsuCampus && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.nfsuCampus}
                      </p>
                    )}
                  </div>

                  {/* Admission / Academic Year - Always visible, optional */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="admissionAcademicYear">
                      Admission / Academic Year <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Input
                      id="admissionAcademicYear"
                      placeholder="e.g. 2024-25, 2025-26, 2026-27"
                      value={formData.admissionAcademicYear}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm ${validationErrors.admissionAcademicYear ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {validationErrors.admissionAcademicYear && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.admissionAcademicYear}
                      </p>
                    )}
                  </div>

                  {/* Fee Payment Category / Funding Type - Always visible, optional */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="feePaymentCategory">
                      Fee Payment Category / Funding Type <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <Select
                      value={formData.feePaymentCategory || "not_specified"}
                      onValueChange={(v) => handleSelectChange("feePaymentCategory", !v || v === "not_specified" ? "" : v)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="feePaymentCategory"
                        className={`h-10 text-xs ${validationErrors.feePaymentCategory ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      >
                        <SelectValue placeholder="Select Funding Type (Not Specified)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_specified">Not Specified</SelectItem>
                        {FEE_PAYMENT_CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.feePaymentCategory && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.feePaymentCategory}
                      </p>
                    )}
                  </div>

                  {/* Tuition Fees - Amount + Currency */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">
                      Tuition Fees <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input
                          id="tuitionFeeAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Amount (leave blank if not specified)"
                          value={formData.tuitionFeeAmount}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`h-10 text-sm ${validationErrors.tuitionFeeAmount ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                        />
                      </div>
                      <div>
                        <Select
                          value={formData.tuitionFeeCurrency || "INR"}
                          onValueChange={(v) => handleSelectChange("tuitionFeeCurrency", v || "INR")}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FEE_CURRENCY_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {validationErrors.tuitionFeeAmount && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.tuitionFeeAmount}
                      </p>
                    )}
                  </div>

                  {/* Hostel Fees - Amount + Currency */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground">
                      Hostel Fees <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input
                          id="hostelFeeAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Amount (leave blank if not specified)"
                          value={formData.hostelFeeAmount}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`h-10 text-sm ${validationErrors.hostelFeeAmount ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                        />
                      </div>
                      <div>
                        <Select
                          value={formData.hostelFeeCurrency || "INR"}
                          onValueChange={(v) => handleSelectChange("hostelFeeCurrency", v || "INR")}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FEE_CURRENCY_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {validationErrors.hostelFeeAmount && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.hostelFeeAmount}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1" htmlFor="program">
                      Academic Program <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <SearchableProgramSelector
                      id="program"
                      programs={academicPrograms}
                      value={formData.programId || formData.program}
                      onChange={handleProgramChange}
                      disabled={isSubmitting || isLoadingPrograms}
                      placeholder={isLoadingPrograms ? "Loading academic programs..." : "Search and select academic program..."}
                      error={validationErrors.programCode || validationErrors.program}
                    />
                  </div>

                  {selectedProgram ? (
                    <div className="p-3.5 bg-muted/40 rounded-lg border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:col-span-2">
                      <div>
                        <span className="text-muted-foreground block text-[11px] font-medium">Assigned School / Department</span>
                        <span className="font-semibold text-foreground block break-words mt-0.5">
                          {selectedProgram.schoolName || formData.school || "School of Pharmacy & Emerging Sciences"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] font-medium">Academic Level</span>
                        <span className="font-semibold text-foreground block mt-0.5">
                          {selectedProgram.academicLevel ? getAcademicLevelLabel(selectedProgram.academicLevel) : "Undergraduate (UG)"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/20 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground flex items-center gap-2 sm:col-span-2">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>School/Department and Academic Level will automatically resolve once an Academic Program is selected.</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="admissionDate">
                      Admission Date <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <DatePicker
                      id="admissionDate"
                      value={formData.admissionDate}
                      onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                      onValueChange={(v) => handleSelectChange("admissionDate", v)}
                      disabled={isSubmitting}
                      startYear={2015}
                      endYear={new Date().getFullYear() + 2}
                      placeholder="Select admission date..."
                      error={validationErrors.admissionDate}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="joiningDate">
                      Joining Date <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <DatePicker
                      id="joiningDate"
                      value={formData.joiningDate}
                      onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                      onValueChange={(v) => handleSelectChange("joiningDate", v)}
                      disabled={isSubmitting}
                      startYear={2015}
                      endYear={new Date().getFullYear() + 2}
                      placeholder="Select official joining date..."
                      error={validationErrors.joiningDate}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="expectedGraduation">
                      Expected Graduation Date <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                    </label>
                    <DatePicker
                      id="expectedGraduation"
                      value={formData.expectedGraduation}
                      onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                      onValueChange={(v) => handleSelectChange("expectedGraduation", v)}
                      disabled={isSubmitting}
                      startYear={2015}
                      endYear={new Date().getFullYear() + 10}
                      placeholder="Select expected graduation..."
                      error={validationErrors.expectedGraduation}
                    />
                  </div>
                </div>

                {formData.program && (() => {
                  const selectedProgramObj = academicPrograms.find(p => p.programName === formData.program || p.programCode === formData.program);
                  return (
                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Automatic Progression & Academic Configuration
                        </div>
                        {selectedProgramObj?.academicLevel && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <span>Level:</span>
                            <span className="font-semibold text-foreground bg-background px-2 py-0.5 rounded-md border border-border/60 text-[10px]">
                              {getAcademicLevelLabel(selectedProgramObj.academicLevel)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium text-foreground">
                            {selectedProgramObj?.totalSemesters || 8} Semesters
                          </span>
                        </div>
                        <div>
                          Interval: <span className="font-medium text-foreground">{selectedProgramObj?.semesterDuration || 6} Months / Semester</span>
                        </div>
                        <div>
                          Initial: <span className="font-semibold text-primary font-mono">Semester 1</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            )}

            {/* Contact Details & Family Tab */}
            {activeTab === "contact" && (
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-h2 font-semibold">Contact, Family & Emergency Coordinates</h2>
                  <p className="text-[11px] text-muted-foreground font-caption">Direct contact coordinates, parents&apos; contact information, and emergency liaison.</p>
                </div>
                <Separator className="my-2" />
                
                {/* 1. Student Coordinates */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Student Contact</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="phoneHome">
                        Home Country / Primary Phone <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                      </label>
                      <PhoneInput
                        id="phoneHome"
                        countryCode={formData.phoneHomeCountryCode}
                        number={formData.phoneHomeNumber}
                        onCountryCodeChange={(code) => setFormData(p => ({ ...p, phoneHomeCountryCode: code }))}
                        onNumberChange={(num) => setFormData(p => ({ ...p, phoneHomeNumber: num }))}
                        onChange={(composite, code, num) => {
                          setFormData(p => ({ ...p, phoneHome: composite, phoneHomeCountryCode: code, phoneHomeNumber: num }));
                          if (validationErrors.phoneHome) {
                            setValidationErrors(prev => { const n = { ...prev }; delete n.phoneHome; return n; });
                          }
                        }}
                        disabled={isSubmitting}
                        placeholder="e.g. 9812345678"
                        defaultCountryCode="+91"
                        className={validationErrors.phoneHome ? "border-rose-500 rounded-md" : ""}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="email">
                        Student Institutional Email <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="student@university.edu"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.email ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {validationErrors.email && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-foreground" htmlFor="phoneLocal">
                        Local Contact Number (India) <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                      </label>
                      <PhoneInput
                        id="phoneLocal"
                        countryCode={formData.phoneLocalCountryCode}
                        number={formData.phoneLocalNumber}
                        onCountryCodeChange={(code) => setFormData(p => ({ ...p, phoneLocalCountryCode: code }))}
                        onNumberChange={(num) => setFormData(p => ({ ...p, phoneLocalNumber: num }))}
                        onChange={(composite, code, num) => {
                          setFormData(p => ({ ...p, phoneLocal: composite, phoneLocalCountryCode: code, phoneLocalNumber: num }));
                          if (validationErrors.phoneLocal) {
                            setValidationErrors(prev => { const n = { ...prev }; delete n.phoneLocal; return n; });
                          }
                        }}
                        disabled={isSubmitting}
                        placeholder="e.g. 9876543210"
                        defaultCountryCode="+91"
                        className={validationErrors.phoneLocal ? "border-rose-500 rounded-md" : ""}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-foreground" htmlFor="permanentAddress">
                        Permanent Address <span className="text-muted-foreground text-[10px] font-normal">(Home Country, Optional)</span>
                      </label>
                      <Textarea
                        id="permanentAddress"
                        placeholder="e.g. 123 Main Street, Kathmandu, Nepal"
                        value={formData.permanentAddress}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`min-h-16 text-sm ${validationErrors.permanentAddress ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {validationErrors.permanentAddress && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.permanentAddress}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-foreground" htmlFor="presentAddress">
                        Present / Current Address <span className="text-muted-foreground text-[10px] font-normal">(India, Optional)</span>
                      </label>
                      <Textarea
                        id="presentAddress"
                        placeholder="e.g. Hostel Block B, NFSU Campus, Gandhinagar, Gujarat, India"
                        value={formData.presentAddress}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`min-h-16 text-sm ${validationErrors.presentAddress ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {validationErrors.presentAddress && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.presentAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 2. Family Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Family Information</h3>
                  </div>

                  {/* Father Details */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                    <h4 className="text-xs font-semibold text-foreground">Father Details</h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground" htmlFor="fatherName">
                          Father Full Name
                        </label>
                        <Input
                          id="fatherName"
                          placeholder="e.g. Alexander Rostov"
                          value={formData.fatherName}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="h-10 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground" htmlFor="fatherMobile">
                          Father Mobile Number
                        </label>
                        <PhoneInput
                          id="fatherMobile"
                          countryCode={formData.fatherMobileCountryCode}
                          number={formData.fatherMobileNumber}
                          onCountryCodeChange={(code) => setFormData(p => ({ ...p, fatherMobileCountryCode: code }))}
                          onNumberChange={(num) => setFormData(p => ({ ...p, fatherMobileNumber: num }))}
                          onChange={(composite, code, num) => {
                            setFormData(p => ({ ...p, fatherMobile: composite, fatherMobileCountryCode: code, fatherMobileNumber: num }));
                          }}
                          disabled={isSubmitting}
                          placeholder="Mobile number"
                          defaultCountryCode="+91"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground" htmlFor="fatherWhatsapp">
                          Father WhatsApp Number
                        </label>
                        <PhoneInput
                          id="fatherWhatsapp"
                          countryCode={formData.fatherWhatsappCountryCode}
                          number={formData.fatherWhatsappNumber}
                          onCountryCodeChange={(code) => setFormData(p => ({ ...p, fatherWhatsappCountryCode: code }))}
                          onNumberChange={(num) => setFormData(p => ({ ...p, fatherWhatsappNumber: num }))}
                          onChange={(composite, code, num) => {
                            setFormData(p => ({ ...p, fatherWhatsapp: composite, fatherWhatsappCountryCode: code, fatherWhatsappNumber: num }));
                          }}
                          disabled={isSubmitting}
                          placeholder="WhatsApp number"
                          defaultCountryCode="+91"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground" htmlFor="fatherEmail">
                          Father&apos;s Email ID
                        </label>
                        <Input
                          id="fatherEmail"
                          type="email"
                          placeholder="e.g. father@example.com"
                          value={formData.fatherEmail}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`h-10 text-sm ${validationErrors.fatherEmail ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {validationErrors.fatherEmail && (
                          <p className="text-[11px] font-medium text-destructive mt-1">
                            {validationErrors.fatherEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mother Details */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                    <h4 className="text-xs font-semibold text-foreground">Mother Details</h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground" htmlFor="motherName">
                          Mother Full Name
                        </label>
                        <Input
                          id="motherName"
                          placeholder="e.g. Maria Rostova"
                          value={formData.motherName}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="h-10 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground" htmlFor="motherMobile">
                          Mother Mobile Number
                        </label>
                        <PhoneInput
                          id="motherMobile"
                          countryCode={formData.motherMobileCountryCode}
                          number={formData.motherMobileNumber}
                          onCountryCodeChange={(code) => setFormData(p => ({ ...p, motherMobileCountryCode: code }))}
                          onNumberChange={(num) => setFormData(p => ({ ...p, motherMobileNumber: num }))}
                          onChange={(composite, code, num) => {
                            setFormData(p => ({ ...p, motherMobile: composite, motherMobileCountryCode: code, motherMobileNumber: num }));
                          }}
                          disabled={isSubmitting}
                          placeholder="Mobile number"
                          defaultCountryCode="+91"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground" htmlFor="motherWhatsapp">
                          Mother WhatsApp Number
                        </label>
                        <PhoneInput
                          id="motherWhatsapp"
                          countryCode={formData.motherWhatsappCountryCode}
                          number={formData.motherWhatsappNumber}
                          onCountryCodeChange={(code) => setFormData(p => ({ ...p, motherWhatsappCountryCode: code }))}
                          onNumberChange={(num) => setFormData(p => ({ ...p, motherWhatsappNumber: num }))}
                          onChange={(composite, code, num) => {
                            setFormData(p => ({ ...p, motherWhatsapp: composite, motherWhatsappCountryCode: code, motherWhatsappNumber: num }));
                          }}
                          disabled={isSubmitting}
                          placeholder="WhatsApp number"
                          defaultCountryCode="+91"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground" htmlFor="motherEmail">
                          Mother&apos;s Email ID
                        </label>
                        <Input
                          id="motherEmail"
                          type="email"
                          placeholder="e.g. mother@example.com"
                          value={formData.motherEmail}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className={`h-10 text-sm ${validationErrors.motherEmail ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {validationErrors.motherEmail && (
                          <p className="text-[11px] font-medium text-destructive mt-1">
                            {validationErrors.motherEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 3. Emergency Contact */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Immediate Emergency Liaison</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactName">
                        Emergency Contact Name
                      </label>
                      <Input
                        id="emergencyContactName"
                        placeholder="e.g. Dmitry Rostov"
                        value={formData.emergencyContactName}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${(validationErrors.relationshipName || validationErrors.emergencyContactName) ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {(validationErrors.relationshipName || validationErrors.emergencyContactName) && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.relationshipName || validationErrors.emergencyContactName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactRelation">
                        Relationship Type
                      </label>
                      <Select 
                        value={formData.emergencyContactRelation} 
                        onValueChange={(v) => handleSelectChange("emergencyContactRelation", v || "")}
                      >
                        <SelectTrigger 
                          id="emergencyContactRelation"
                          className={`h-10 text-xs ${(validationErrors.relationshipType || validationErrors.emergencyContactRelation) ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                        >
                          <SelectValue placeholder="Select Relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIP_TYPE_OPTIONS.map((rel) => (
                            <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(validationErrors.relationshipType || validationErrors.emergencyContactRelation) && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.relationshipType || validationErrors.emergencyContactRelation}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactPhone">
                        Emergency Contact Phone Number
                      </label>
                      <PhoneInput
                        id="emergencyContactPhone"
                        countryCode={formData.emergencyContactCountryCode}
                        number={formData.emergencyContactNumber}
                        onCountryCodeChange={(code) => setFormData(p => ({ ...p, emergencyContactCountryCode: code }))}
                        onNumberChange={(num) => setFormData(p => ({ ...p, emergencyContactNumber: num }))}
                        onChange={(composite, code, num) => {
                          setFormData(p => ({ ...p, emergencyContactPhone: composite, emergencyContactCountryCode: code, emergencyContactNumber: num }));
                        }}
                        disabled={isSubmitting}
                        placeholder="Phone number"
                        defaultCountryCode="+91"
                        className={(validationErrors.relationshipPhone || validationErrors.emergencyContactPhone) ? "border-rose-500 rounded-md" : ""}
                      />
                      {(validationErrors.relationshipPhone || validationErrors.emergencyContactPhone) && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.relationshipPhone || validationErrors.emergencyContactPhone}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactEmail">
                        Emergency Contact Email <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                      </label>
                      <Input
                        id="emergencyContactEmail"
                        type="email"
                        placeholder="contact@example.com"
                        value={formData.emergencyContactEmail}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.relationshipEmail ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {validationErrors.relationshipEmail && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.relationshipEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}

            {/* Document Verification Tab */}
            {activeTab === "documents" && (
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-h2 font-semibold">Immigration Document Auditing (Metadata Initialization)</h2>
                  <p className="text-[11px] text-muted-foreground font-caption">Pre-initialize passport and visa profiles with valid issue and expiry dates to establish compliance baselines.</p>
                </div>
                <Separator className="my-2" />
                
                {/* Passport Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Passport Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="passportNumber">
                        Passport Number
                      </label>
                      <Input
                        id="passportNumber"
                        placeholder="e.g. JP998877"
                        value={formData.passportNumber}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.passportNumber ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {validationErrors.passportNumber && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.passportNumber}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="passportPlaceOfIssue">
                        Place of Issue
                      </label>
                      <Input
                        id="passportPlaceOfIssue"
                        placeholder="e.g. Tokyo / Berlin"
                        value={formData.passportPlaceOfIssue}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="passportIssueDate">
                        Passport Issue Date
                      </label>
                      <DatePicker
                        id="passportIssueDate"
                        value={formData.passportIssueDate}
                        onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                        onValueChange={(v) => handleSelectChange("passportIssueDate", v)}
                        disabled={isSubmitting}
                        placeholder="Select passport issue date..."
                        error={validationErrors.passportIssueDate}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="passportExpiry">
                        Passport Expiration Date
                      </label>
                      <DatePicker
                        id="passportExpiry"
                        value={formData.passportExpiry}
                        onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                        onValueChange={(v) => handleSelectChange("passportExpiry", v)}
                        disabled={isSubmitting}
                        placeholder="Select passport expiry date..."
                        error={validationErrors.passportExpiry}
                      />
                      {validationErrors.passportExpiry && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.passportExpiry}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Visa Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Visa Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="visaNumber">
                        Visa Number
                      </label>
                      <Input
                        id="visaNumber"
                        placeholder="e.g. V99887766"
                        value={formData.visaNumber}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.visaNumber ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {validationErrors.visaNumber && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.visaNumber}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="visaType">
                        Visa Classification
                      </label>
                      <Select 
                        value={formData.visaType} 
                        onValueChange={(v) => handleSelectChange("visaType", v || "")}
                      >
                        <SelectTrigger id="visaType" className="h-10 text-xs">
                          <SelectValue placeholder="Select Visa Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student (S-1)">Student (S-1)</SelectItem>
                          <SelectItem value="Student (S-2)">Student (S-2)</SelectItem>
                          <SelectItem value="Student (S-3)">Student (S-3)</SelectItem>
                          <SelectItem value="Student (S-4)">Student (S-4)</SelectItem>
                          <SelectItem value="Student (S-5)">Student (S-5)</SelectItem>
                          <SelectItem value="Research (R-1)">Research (R-1)</SelectItem>
                          <SelectItem value="Intern (I-1)">Intern (I-1)</SelectItem>
                          <SelectItem value="Other">Other Category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="visaIssueDate">
                        Visa Issue Date
                      </label>
                      <DatePicker
                        id="visaIssueDate"
                        value={formData.visaIssueDate}
                        onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                        onValueChange={(v) => handleSelectChange("visaIssueDate", v)}
                        disabled={isSubmitting}
                        placeholder="Select visa issue date..."
                        error={validationErrors.visaIssueDate}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="visaExpiry">
                        Visa Expiration Date
                      </label>
                      <DatePicker
                        id="visaExpiry"
                        value={formData.visaExpiry}
                        onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                        onValueChange={(v) => handleSelectChange("visaExpiry", v)}
                        disabled={isSubmitting}
                        placeholder="Select visa expiry date..."
                        error={validationErrors.visaExpiry}
                      />
                      {validationErrors.visaExpiry && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.visaExpiry}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* eFRRO Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">eFRRO / Residential Permit (Optional)</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="efrroNumber">
                        Registration / RC Number
                      </label>
                      <Input
                        id="efrroNumber"
                        placeholder="e.g. FRRO/AHM/2026/899"
                        value={formData.efrroNumber}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.efrroNumber ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="efrroIssueDate">
                        Registration Issue Date
                      </label>
                      <DatePicker
                        id="efrroIssueDate"
                        value={formData.efrroIssueDate}
                        onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                        onValueChange={(v) => handleSelectChange("efrroIssueDate", v)}
                        disabled={isSubmitting}
                        placeholder="Select issue date..."
                        error={validationErrors.efrroIssueDate}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="efrroExpiry">
                        Registration Valid Until
                      </label>
                      <DatePicker
                        id="efrroExpiry"
                        value={formData.efrroExpiry}
                        onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                        onValueChange={(v) => handleSelectChange("efrroExpiry", v)}
                        disabled={isSubmitting}
                        placeholder="Select expiry date..."
                        error={validationErrors.efrroExpiry}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Bank Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Bank Details (Optional)</h3>
                      <p className="text-[11px] text-muted-foreground">Account coordinates for stipend, refund, and institutional financial liaison.</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="bankName">
                        Bank Name
                      </label>
                      <Input
                        id="bankName"
                        placeholder="e.g. State Bank of India"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.bankName ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="accountNumber">
                        Account Number
                      </label>
                      <Input
                        id="accountNumber"
                        type="text"
                        placeholder="e.g. 000123456789 (Preserves leading zeros)"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm font-mono ${validationErrors.accountNumber ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="ifscCode">
                        IFSC Code
                      </label>
                      <Input
                        id="ifscCode"
                        placeholder="e.g. SBIN0001234"
                        value={formData.ifscCode}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm font-mono uppercase ${validationErrors.ifscCode ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-foreground" htmlFor="branchAddress">
                        Branch Address
                      </label>
                      <Textarea
                        id="branchAddress"
                        placeholder="e.g. Gandhinagar Main Branch, Sector 9, Gujarat, India"
                        value={formData.branchAddress}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`min-h-16 text-sm resize-y ${validationErrors.branchAddress ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}

            {/* Bottom Actions Footer */}
            <div className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {activeTab !== "documents" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (activeTab === "personal") setActiveTab("academic");
                      else if (activeTab === "academic") setActiveTab("contact");
                      else if (activeTab === "contact") setActiveTab("documents");
                    }}
                    className="text-xs font-medium"
                  >
                    Next Section
                  </Button>
                )}

                <AsyncActionButton
                  type="submit"
                  isLoading={isSubmitting}
                  isSuccess={submittingSuccess}
                  isError={submittingError}
                  loadingText="Registering student..."
                  successText="Student registered!"
                  errorText="Registration failed"
                  idleText="Register Student"
                  className="min-w-[160px] text-xs font-semibold shadow-xs"
                />
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
