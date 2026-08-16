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
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NationalitySelector } from "@/components/ui/nationality-selector";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { getActiveAcademicProgramsAction } from "@/app/(app)/settings/academic-programs-actions";
import { AcademicProgram } from "@/domain/academic-programs/types";
import { RegisterStudentValidationSchema } from "@/services/validation/student-validation";
import { registerStudentAction } from "@/app/(app)/students/actions";
import { RegisterStudentInput } from "@/services/student/student.types";
import { DatePicker } from "@/components/ui/date-picker";
import { AcademicProgressionEngine } from "@/domain/academic/services/semester-progression.service";
import { Layers, Sparkles } from "lucide-react";

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
  programCode: { tab: "academic", elementId: "program", label: "Academic Program" },
  program: { tab: "academic", elementId: "program", label: "Academic Program" },
  school: { tab: "academic", elementId: "school", label: "School / Department" },
  admissionDate: { tab: "academic", elementId: "admissionDate", label: "Admission Date" },
  expectedGraduation: { tab: "academic", elementId: "expectedGraduation", label: "Expected Graduation Date" },
  currentSemester: { tab: "academic", elementId: "currentSemester", label: "Current Semester" },
  phoneHome: { tab: "contact", elementId: "phoneHome", label: "Home Country Phone" },
  email: { tab: "contact", elementId: "email", label: "Student Email" },
  phoneLocal: { tab: "contact", elementId: "phoneLocal", label: "Local Contact Phone" },
  permanentAddress: { tab: "contact", elementId: "permanentAddress", label: "Permanent Address" },
  localAddress: { tab: "contact", elementId: "localAddress", label: "Local Address" },
  relationshipName: { tab: "contact", elementId: "emergencyContactName", label: "Emergency Contact Name" },
  emergencyContactName: { tab: "contact", elementId: "emergencyContactName", label: "Emergency Contact Name" },
  relationshipType: { tab: "contact", elementId: "emergencyContactRelation", label: "Relationship Type" },
  emergencyContactRelation: { tab: "contact", elementId: "emergencyContactRelation", label: "Relationship Type" },
  relationshipPhone: { tab: "contact", elementId: "emergencyContactPhone", label: "Emergency Contact Phone" },
  emergencyContactPhone: { tab: "contact", elementId: "emergencyContactPhone", label: "Emergency Contact Phone" },
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
  efrroExpiry: { tab: "documents", elementId: "efrroExpiry", label: "eFRRO Expiration Date" }
};

/**
 * Normalizes any incoming date string or Date instance to a strict local YYYY-MM-DD format
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
  if (str.includes("T")) return str.split("T")[0];
  const slashParts = str.split("/");
  if (slashParts.length === 3) {
    if (slashParts[0].length === 4) {
      return `${slashParts[0]}-${slashParts[1].padStart(2, "0")}-${slashParts[2].padStart(2, "0")}`;
    } else if (slashParts[2].length === 4) {
      return `${slashParts[2]}-${slashParts[0].padStart(2, "0")}-${slashParts[1].padStart(2, "0")}`;
    }
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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

  // Dynamic Academic Programs state
  const [academicPrograms, setAcademicPrograms] = React.useState<AcademicProgram[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = React.useState(true);

  React.useEffect(() => {
    async function loadPrograms() {
      setIsLoadingPrograms(true);
      const res = await getActiveAcademicProgramsAction();
      if (res.success && res.programs) {
        setAcademicPrograms(res.programs);
      }
      setIsLoadingPrograms(false);
    }
    loadPrograms();
  }, []);

  // Form State (persisted across all tab transitions)
  const [formData, setFormData] = React.useState({
    enrollmentNumber: "",
    fullName: "",
    nationality: "",
    gender: "",
    dateOfBirth: "",
    email: "",
    phoneHome: "",
    phoneLocal: "",
    permanentAddress: "",
    localAddress: "",
    program: "",
    school: "",
    admissionDate: "",
    expectedGraduation: "",
    emergencyContactName: "",
    emergencyContactRelation: "parent",
    emergencyContactPhone: "",
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

  // Helper to calculate expected graduation date dynamically from program configuration
  const calculateGraduationDate = (programName: string, admissionDateStr: string) => {
    if (!admissionDateStr) return "";
    const selectedProg = academicPrograms.find(p => p.programName === programName);
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
      if (id === "admissionDate" && prev.program) {
        next.expectedGraduation = calculateGraduationDate(prev.program, value);
      }
      return next;
    });
  };

  const handleSelectChange = (field: string, value: string) => {
    const normalizedVal = normalizeDateToISO(value) || value;

    // Clear validation error on select/date change
    const relatedKey = field === "nationality" ? "nationalityCode" : field === "program" ? "programCode" : field === "emergencyContactRelation" ? "relationshipType" : field;
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
      if (field === "program") {
        const selectedProg = academicPrograms.find(p => p.programName === value);
        if (selectedProg) {
          if (!prev.school) {
            next.school = selectedProg.schoolName || "";
          }
          if (prev.admissionDate) {
            next.expectedGraduation = calculateGraduationDate(value, prev.admissionDate);
          }
        }
      }
      if (field === "admissionDate" && prev.program) {
        next.expectedGraduation = calculateGraduationDate(prev.program, normalizedVal);
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
    const sanitizedGrad = normalizeDateToISO(formData.expectedGraduation);
    const sanitizedPassIssue = normalizeDateToISO(formData.passportIssueDate);
    const sanitizedPassExp = normalizeDateToISO(formData.passportExpiry);
    const sanitizedVisaIssue = normalizeDateToISO(formData.visaIssueDate);
    const sanitizedVisaExp = normalizeDateToISO(formData.visaExpiry);
    const sanitizedEfrroIssue = normalizeDateToISO(formData.efrroIssueDate);
    const sanitizedEfrroExp = normalizeDateToISO(formData.efrroExpiry);

    // Zod payload assembly
    const validationPayload: RegisterStudentInput = {
      registrationNumber: formData.enrollmentNumber?.trim() || undefined,
      fullName: formData.fullName.trim(),
      nationalityCode: formData.nationality.trim().toUpperCase(),
      gender: (formData.gender as "male" | "female" | "other" | "transgender" | "prefer_not_to_say") || undefined,
      dateOfBirth: sanitizedDob,
      email: formData.email.trim().toLowerCase(),
      phoneHome: formData.phoneHome.trim(),
      phoneLocal: formData.phoneLocal.trim() || undefined,
      permanentAddress: formData.permanentAddress.trim(),
      localAddress: formData.localAddress.trim() || undefined,
      programCode: formData.program.trim(),
      admissionDate: sanitizedAdm,
      expectedGraduation: sanitizedGrad,
      currentSemester: 1,
      relationshipType: formData.emergencyContactName.trim() ? (formData.emergencyContactRelation as "parent" | "guardian" | "local_sponsor") : undefined,
      relationshipName: formData.emergencyContactName.trim() || undefined,
      relationshipPhone: formData.emergencyContactPhone.trim() || undefined,
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
      efrroExpiry: sanitizedEfrroExp || undefined
    };

    // Safe development diagnostics
    if (process.env.NODE_ENV === "development" || typeof window !== "undefined") {
      console.log("[STUDENT_REGISTRATION_SUBMIT_PAYLOAD]", {
        registrationNumber: validationPayload.registrationNumber,
        fullName: validationPayload.fullName,
        nationalityCode: validationPayload.nationalityCode,
        gender: validationPayload.gender,
        dateOfBirth: validationPayload.dateOfBirth,
        email: validationPayload.email,
        phoneHome: validationPayload.phoneHome ? `${validationPayload.phoneHome.slice(0, 3)}***` : undefined,
        programCode: validationPayload.programCode,
        admissionDate: validationPayload.admissionDate,
        expectedGraduation: validationPayload.expectedGraduation,
        relationshipType: validationPayload.relationshipType,
        relationshipName: validationPayload.relationshipName,
        passportNumber: validationPayload.passportNumber ? `${validationPayload.passportNumber.slice(0, 2)}***` : undefined,
        passportExpiry: validationPayload.passportExpiry,
        visaNumber: validationPayload.visaNumber ? `${validationPayload.visaNumber.slice(0, 2)}***` : undefined,
        visaExpiry: validationPayload.visaExpiry,
        efrroNumber: validationPayload.efrroNumber ? `${validationPayload.efrroNumber.slice(0, 2)}***` : undefined,
        efrroExpiry: validationPayload.efrroExpiry
      });
    }

    const result = RegisterStudentValidationSchema.safeParse(validationPayload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      let firstErrorField = "";

      console.warn("[STUDENT_REGISTRATION_VALIDATION_FAILED]", result.error.issues.map(iss => ({
        field: iss.path.join("."),
        code: iss.code,
        message: iss.message
      })));
      
      result.error.issues.forEach((issue) => {
        const path = String(issue.path[0] || "");
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
          if (!firstErrorField) firstErrorField = path;
        }
      });
      
      setValidationErrors(fieldErrors);
      
      const errorCount = Object.keys(fieldErrors).length;
      
      // Auto-navigate and focus first invalid field
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
        
        // Handle server-side validation error map
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
          Enter the information currently available. Additional information can be added later from the student profile.
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
        <div className="md:col-span-1 space-y-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "personal" 
                ? "bg-primary text-primary-foreground shadow-sm font-semibold" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 shrink-0" /> Personal Identity
            </div>
            {tabErrorCounts.personal > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                {tabErrorCounts.personal}
              </span>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("academic")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "academic" 
                ? "bg-primary text-primary-foreground shadow-sm font-semibold" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap className="h-4 w-4 shrink-0" /> Academic Profile
            </div>
            {tabErrorCounts.academic > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                {tabErrorCounts.academic}
              </span>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "contact" 
                ? "bg-primary text-primary-foreground shadow-sm font-semibold" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <PhoneCall className="h-4 w-4 shrink-0" /> Emergency Contact
            </div>
            {tabErrorCounts.contact > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                {tabErrorCounts.contact}
              </span>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "documents" 
                ? "bg-primary text-primary-foreground shadow-sm font-semibold" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileCheck className="h-4 w-4 shrink-0" /> Document Checklist
            </div>
            {tabErrorCounts.documents > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                {tabErrorCounts.documents}
              </span>
            )}
          </button>

          <div className="mt-8 p-3 rounded-lg border border-border/60 bg-muted/20 text-[11px] text-muted-foreground font-caption space-y-1">
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" /> Registration Guidance
            </div>
            <p className="leading-relaxed">
              Enter the information currently available. Additional contact details and physical compliance documents can be added later through the student profile.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <Card className="md:col-span-3 border border-border/60 shadow-sm overflow-visible">
          <form onSubmit={handleSubmit} noValidate>
            {/* Personal Details Tab */}
            {activeTab === "personal" && (
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-h2 font-semibold">Personal Identification</h2>
                  <p className="text-[11px] text-muted-foreground font-caption">Basic biographical information.</p>
                </div>
                <Separator className="my-2" />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="fullName">
                      Full Name (as per Passport)
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
                      Nationality
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
                      Gender
                    </label>
                    <Select value={formData.gender} onValueChange={(v) => handleSelectChange("gender", v || "")}>
                      <SelectTrigger 
                        id="gender"
                        className={validationErrors.gender ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                      >
                        <SelectValue placeholder="Choose Gender" />
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
                    <label className="text-xs font-medium text-foreground" htmlFor="dateOfBirth">
                      Date of Birth
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
                  </div>
                </div>
              </CardContent>
            )}

            {/* Academic Details Tab */}
            {activeTab === "academic" && (
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-h2 font-semibold">Academic Enrollment Profile</h2>
                  <p className="text-[11px] text-muted-foreground font-caption">University enrollment structure and program codes.</p>
                </div>
                <Separator className="my-2" />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="enrollmentNumber">
                      Enrollment Number (optional)
                    </label>
                    <Input
                      id="enrollmentNumber"
                      placeholder="e.g. NFSU/2026/CS/101"
                      value={formData.enrollmentNumber}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm font-mono ${(validationErrors.registrationNumber || validationErrors.enrollmentNumber) ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    <p className="text-[11px] text-muted-foreground font-caption">
                      Provided by the university. You can add it later if it is not available now.
                    </p>
                    {(validationErrors.registrationNumber || validationErrors.enrollmentNumber) && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.registrationNumber || validationErrors.enrollmentNumber}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="program">
                      Academic Program
                    </label>
                    <Select 
                      value={formData.program} 
                      onValueChange={(v) => handleSelectChange("program", v || "")} 
                      disabled={isLoadingPrograms || academicPrograms.length === 0}
                    >
                      <SelectTrigger 
                        id="program"
                        className={`h-10 text-xs ${(validationErrors.programCode || validationErrors.program) ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      >
                        <SelectValue placeholder={isLoadingPrograms ? "Loading programs..." : "Select Academic Program"} />
                      </SelectTrigger>
                      <SelectContent>
                        {academicPrograms.map((prog) => (
                           <SelectItem key={prog.id} value={prog.programName}>
                            {prog.programName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {academicPrograms.length === 0 && !isLoadingPrograms && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                        No academic programs have been configured. Please contact the system administrator.
                      </p>
                    )}
                    {(validationErrors.programCode || validationErrors.program) && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.programCode || validationErrors.program}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="school">
                      School / Department
                    </label>
                    <Input
                      id="school"
                      placeholder="e.g. School of Computing & Data Sciences"
                      value={formData.school}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="admissionDate">
                      Admission Date
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
                    <label className="text-xs font-medium text-foreground" htmlFor="expectedGraduation">
                      Expected Graduation Date
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

                {formData.program && (
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 mt-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Automatic Semester Progression Enabled
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground">
                          {academicPrograms.find(p => p.programName === formData.program)?.totalSemesters || 8} Semesters
                        </span>
                      </div>
                      <div>
                        Interval: <span className="font-medium text-foreground">{academicPrograms.find(p => p.programName === formData.program)?.semesterDuration || 6} Months / Semester</span>
                      </div>
                      <div>
                        Initial: <span className="font-semibold text-primary font-mono">Semester 1</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      ISCMS will automatically calculate and advance the student&apos;s current semester without manual staff intervention.
                    </p>
                  </div>
                )}
              </CardContent>
            )}

            {/* Contact Details Tab */}
            {activeTab === "contact" && (
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-h2 font-semibold">Contact Details & Emergency Coordinators</h2>
                  <p className="text-[11px] text-muted-foreground font-caption">Contact coordinates and immediate family/sponsor contacts.</p>
                </div>
                <Separator className="my-2" />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="phoneHome">
                      Home Country Phone Number
                    </label>
                    <Input
                      id="phoneHome"
                      placeholder="+CountryCode-XXXXX-XXXXX"
                      value={formData.phoneHome}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm ${validationErrors.phoneHome ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {validationErrors.phoneHome && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.phoneHome}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="email">
                      Student Institutional Email
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

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="phoneLocal">
                      Local Contact Number (India)
                    </label>
                    <Input
                      id="phoneLocal"
                      placeholder="+91-XXXXX-XXXXX"
                      value={formData.phoneLocal}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm ${validationErrors.phoneLocal ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {validationErrors.phoneLocal && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.phoneLocal}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="permanentAddress">
                      Permanent Address (Home Country)
                    </label>
                    <Input
                      id="permanentAddress"
                      placeholder="Full residential address in home country (at least 10 characters)"
                      value={formData.permanentAddress}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm ${validationErrors.permanentAddress ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {validationErrors.permanentAddress && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.permanentAddress}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="localAddress">
                      Local Address (India)
                    </label>
                    <Input
                      id="localAddress"
                      placeholder="Hostel or local residential address"
                      value={formData.localAddress}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm ${validationErrors.localAddress ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {validationErrors.localAddress && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.localAddress}
                      </p>
                    )}
                  </div>
                  
                  <Separator className="my-2 sm:col-span-2" />

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
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="local_sponsor">Local Sponsor</SelectItem>
                      </SelectContent>
                    </Select>
                    {(validationErrors.relationshipType || validationErrors.emergencyContactRelation) && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.relationshipType || validationErrors.emergencyContactRelation}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactPhone">
                      Emergency Contact Phone Number
                    </label>
                    <Input
                      id="emergencyContactPhone"
                      placeholder="Country code prefixed phone number"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className={`h-10 text-sm ${(validationErrors.relationshipPhone || validationErrors.emergencyContactPhone) ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    {(validationErrors.relationshipPhone || validationErrors.emergencyContactPhone) && (
                      <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                        {validationErrors.relationshipPhone || validationErrors.emergencyContactPhone}
                      </p>
                    )}
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
                
                {/* Passport Information Group */}
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

                {/* Visa Information Group */}
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
                        onValueChange={(v) => handleSelectChange("visaType", v || "Student (S-1)")}
                      >
                        <SelectTrigger id="visaType" className="h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Student (S-1)">Student (S-1)</SelectItem>
                          <SelectItem value="Student (S-2)">Student (S-2)</SelectItem>
                          <SelectItem value="Research (R-1)">Research (R-1)</SelectItem>
                          <SelectItem value="Intern (I-1)">Intern (I-1)</SelectItem>
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

                {/* eFRRO / Residential Permit Details */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      eFRRO / Residential Permit Details
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-caption mt-0.5">
                      Local registration details with Indian immigration authorities.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-foreground" htmlFor="efrroNumber">
                        eFRRO / Registration Number
                      </label>
                      <Input
                        id="efrroNumber"
                        placeholder="e.g. FRRO123456789"
                        value={formData.efrroNumber}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className={`h-10 text-sm ${validationErrors.efrroNumber ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                      />
                      {validationErrors.efrroNumber && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.efrroNumber}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="efrroIssueDate">
                        eFRRO Issue Date
                      </label>
                      <DatePicker
                        id="efrroIssueDate"
                        value={formData.efrroIssueDate}
                        onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                        onValueChange={(v) => handleSelectChange("efrroIssueDate", v)}
                        disabled={isSubmitting}
                        placeholder="Select eFRRO issue date..."
                        error={validationErrors.efrroIssueDate}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground" htmlFor="efrroExpiry">
                        eFRRO Expiration Date
                      </label>
                      <DatePicker
                        id="efrroExpiry"
                        value={formData.efrroExpiry}
                        onChange={(e) => handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>)}
                        onValueChange={(v) => handleSelectChange("efrroExpiry", v)}
                        disabled={isSubmitting}
                        placeholder="Select eFRRO expiry date..."
                        error={validationErrors.efrroExpiry}
                      />
                      {validationErrors.efrroExpiry && (
                        <p className="text-[11px] text-rose-500 font-medium animate-in slide-in-from-top-1">
                          {validationErrors.efrroExpiry}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 border border-border rounded-md text-[10px] text-muted-foreground font-caption">
                  Note: Uploading physical document scans (PDF/JPG) is disabled during architecture initialization. Once the profile is initialized, administrators can upload document files in the Student Profile Inspector.
                </div>
              </CardContent>
            )}

            {/* Footer action buttons */}
            <CardFooter className="flex items-center justify-between border-t border-border/40 px-6 py-4 bg-muted/10">
              <Link href="/students" passHref>
                <Button variant="outline" type="button" size="sm" className="h-9 text-xs" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              
              <div className="flex items-center gap-2.5">
                {activeTab !== "documents" && (
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm" 
                    className="h-9 text-xs flex items-center gap-1.5"
                    onClick={() => {
                      if (activeTab === "personal") setActiveTab("academic");
                      else if (activeTab === "academic") setActiveTab("contact");
                      else if (activeTab === "contact") setActiveTab("documents");
                    }}
                  >
                    Next Section <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}

                <AsyncActionButton
                  type="submit"
                  size="sm"
                  className="h-9 text-xs px-4 font-semibold"
                  isLoading={isSubmitting}
                  isSuccess={submittingSuccess}
                  isError={submittingError}
                  idleText="Save & Register"
                  loadingText="Saving Student..."
                  successText="Student Registered"
                  errorText="Try Again"
                />
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
