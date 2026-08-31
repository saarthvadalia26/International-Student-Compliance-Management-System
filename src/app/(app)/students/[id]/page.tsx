"use client";

import * as React from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Globe, 
  Phone, 
  Mail, 
  XCircle, 
  Building,
  Loader2,
  Calendar,
  ExternalLink,
  Edit3,
  ShieldCheck,
  Clock,
  History,
  SlidersHorizontal,
  Sparkles,
  Layers,
  GraduationCap,
  User,
  Users,
  FileText,
  RefreshCw,
  FileCheck2,
  Plus
} from "lucide-react";
import { 
  getStudentDetailsAction, 
  updateStudentAction, 
  getStudentReminderScheduleAction,
  recordAcademicAdjustmentAction,
  renewDocumentAction,
  addOriginalDocumentAction,
  editDocumentDetailsAction,
  getDocumentHistoryAction,
  type DocumentVersionHistoryItem
} from "@/app/(app)/students/actions";
import { getActiveSchoolsAction } from "@/app/(app)/settings/schools-actions";
import { School } from "@/domain/schools/types";
import { AcademicProgressionEngine } from "@/domain/academic/services/semester-progression.service";
import { CountryFlag } from "@/components/ui/country-flag";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { SectionNavGroup, SectionNavCard } from "@/components/ui/section-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SearchableProgramSelector } from "@/components/ui/searchable-program-selector";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { getActiveAcademicProgramsAction } from "@/app/(app)/settings/academic-programs-actions";
import { AcademicProgram } from "@/domain/academic-programs/types";
import { ExpiryReminderEngine } from "@/domain/notifications/services/reminder-engine.service";
import { 
  StudentReminderScheduleResponse 
} from "@/domain/notifications/types/reminder.types";
import { DispatchReminderDialog } from "@/features/compliance/components/dispatch-reminder-dialog";
import { DocumentReminderSchedule } from "@/features/compliance/components/document-reminder-schedule";
import { ProfileCompletionEngine, ProfileCompletionResult } from "@/domain/students/services/profile-completion.service";

import { 
  MARITAL_STATUS_OPTIONS, 
  BLOOD_GROUP_OPTIONS, 
  RELATIONSHIP_TYPE_OPTIONS, 
  ADMISSION_CATEGORY_OPTIONS, 
  FEE_PAYMENT_CATEGORY_OPTIONS,
  FEE_CURRENCY_OPTIONS,
  formatAgeDisplay,
  MaritalStatus,
  RelationshipType,
  AdmissionCategory,
  FeePaymentCategory,
  FeeCurrency
} from "@/domain/students/types/registration-expansion.types";

export interface StudentDocument {
  number: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  visaType?: string;
  versionNumber?: number | null;
  versionLabel?: string | null;
  renewalCount?: number;
  verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected";
  hasUploadedDocument: boolean;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  filePath?: string | null;
  fileDownloadUrl?: string | null;
  activeEarlyAuthorization?: {
    id: string;
    reason: string;
    reasonDetails: string;
    validFrom: string;
    validUntil: string;
    status: string;
    createdAt: string;
  } | null;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phoneHome: string;
  phoneLocal: string;
  permanentAddress: string;
  presentAddress?: string | null;
  localAddress: string;
  currentSemester: number;
  totalSemesters?: number;
  semesterDuration?: number;
  semesterDurationUnit?: string;
  academicStage?: string;
  academicStageLabel?: string;
  isCompleted?: boolean;
  isFinalSemester?: boolean;
  academicAdjustments?: Array<{
    id?: string;
    adjustmentType: string;
    effectiveDate: string;
    previousProgramCode?: string | null;
    newProgramCode?: string | null;
    previousSemester?: number | null;
    adjustedSemester?: number | null;
    reason: string;
    notes?: string | null;
    createdBy?: string | null;
    createdAt?: string;
  }>;
  academicStatus: "good_standing" | "probation" | "suspended";
  status: "active" | "suspended" | "graduated" | "withdrawn";
  registrationNumber: string;
  nationalityCode: string;
  nationalityName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  maritalStatus?: string | null;
  physicalDisability?: boolean | null;
  fatherName?: string | null;
  fatherMobile?: string | null;
  fatherWhatsapp?: string | null;
  fatherEmail?: string | null;
  motherName?: string | null;
  motherMobile?: string | null;
  motherWhatsapp?: string | null;
  motherEmail?: string | null;
  programName: string;
  programCode: string;
  programId?: string | null;
  academicLevel?: string | null;
  academicLevelLabel?: string | null;
  school: string;
  isSchoolOverridden?: boolean;
  overrideSchoolId?: string | null;
  schoolOverrideReason?: string | null;
  admissionDate: string;
  expectedGraduation: string;
  admissionCategory?: string | null;
  admissionCategoryOther?: string | null;
  siiApplicationNumber?: string | null;
  iccrApplicationNumber?: string | null;
  nfsuCampus?: string | null;
  admissionAcademicYear?: string | null;
  feePaymentCategory?: FeePaymentCategory | string | null;
  tuitionFeeAmount?: number | null;
  tuitionFeeCurrency?: FeeCurrency | string | null;
  hostelFeeAmount?: number | null;
  hostelFeeCurrency?: FeeCurrency | string | null;
  complianceStatus: "compliant" | "warning" | "non_compliant" | "expired";
  daysToPassportExpiry?: number;
  daysToVisaExpiry?: number;
  daysToEfrroExpiry?: number;
  passport: StudentDocument;
  visa: StudentDocument;
  efrro?: StudentDocument;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  embassy: {
    name: string;
    phone?: string;
    email?: string;
    address: string;
    city?: string;
    country?: string;
    website?: string;
    contactPerson?: string;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StudentDetailsPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const studentId = resolvedParams.id;
  
  const [student, setStudent] = React.useState<StudentProfile | undefined>(undefined);
  const [isLoadingStudent, setIsLoadingStudent] = React.useState(true);
  const [activeSubTab, setActiveSubTab] = React.useState<"personal" | "academic" | "contact" | "documents">("personal");

  // Helper to verify if document number is valid (not placeholder/empty)
  const hasValidDocumentNumber = React.useCallback((docNum?: string | null): boolean => {
    if (!docNum) return false;
    const trimmed = docNum.trim().toLowerCase();
    return (
      trimmed !== "" &&
      trimmed !== "not provided" &&
      trimmed !== "pending" &&
      trimmed !== "not recorded" &&
      trimmed !== "none" &&
      trimmed !== "n/a" &&
      trimmed !== "undefined" &&
      trimmed !== "null"
    );
  }, []);

  // Helper to verify if document details are recorded
  const isDocRecorded = React.useCallback((doc?: StudentDocument | null): doc is StudentDocument => {
    if (!doc || !doc.number) return false;
    return hasValidDocumentNumber(doc.number);
  }, [hasValidDocumentNumber]);

  // Add / Edit Document Dialog State
  const [addEditDocDialogOpen, setAddEditDocDialogOpen] = React.useState(false);
  const [addEditMode, setAddEditMode] = React.useState<"add" | "edit">("add");
  const [addEditDocType, setAddEditDocType] = React.useState<"passport" | "visa" | "efrro">("passport");
  const [addEditForm, setAddEditForm] = React.useState({
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    placeOfIssue: "",
    visaType: "Student (S-1)",
    notes: "",
    reason: "",
    file: null as File | null
  });
  const [isSavingDoc, setIsSavingDoc] = React.useState(false);
  const [addEditErrors, setAddEditErrors] = React.useState<Record<string, string>>({});

  const handleOpenAddDocDialog = (docType: "passport" | "visa" | "efrro") => {
    setAddEditDocType(docType);
    setAddEditMode("add");
    setAddEditForm({
      documentNumber: "",
      issueDate: "",
      expiryDate: "",
      placeOfIssue: "",
      visaType: "Student (S-1)",
      notes: "",
      reason: "",
      file: null
    });
    setAddEditErrors({});
    setAddEditDocDialogOpen(true);
  };

  const handleOpenEditDocDialog = (docType: "passport" | "visa" | "efrro") => {
    if (!student) return;
    const currentDoc = docType === "passport" ? student.passport : docType === "visa" ? student.visa : student.efrro;
    setAddEditDocType(docType);
    setAddEditMode("edit");
    setAddEditForm({
      documentNumber: currentDoc?.number && hasValidDocumentNumber(currentDoc.number) ? currentDoc.number : "",
      issueDate: currentDoc?.issueDate ? currentDoc.issueDate.split("T")[0] : "",
      expiryDate: currentDoc?.expiryDate ? currentDoc.expiryDate.split("T")[0] : "",
      placeOfIssue: currentDoc?.placeOfIssue || "",
      visaType: currentDoc?.visaType || "Student (S-1)",
      notes: currentDoc?.notes || "",
      reason: "Administrative details correction",
      file: null
    });
    setAddEditErrors({});
    setAddEditDocDialogOpen(true);
  };

  const handleSubmitAddEditDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const errors: Record<string, string> = {};
    if (!addEditForm.documentNumber.trim()) errors.documentNumber = "Document number is required.";
    if (!addEditForm.issueDate.trim()) errors.issueDate = "Issue date is required.";
    if (!addEditForm.expiryDate.trim()) errors.expiryDate = "Expiration date is required.";
    if (addEditForm.issueDate && addEditForm.expiryDate && addEditForm.expiryDate <= addEditForm.issueDate) {
      errors.expiryDate = "Expiration date must be strictly after the issue date.";
    }

    if (Object.keys(errors).length > 0) {
      setAddEditErrors(errors);
      return;
    }

    setIsSavingDoc(true);
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("documentType", addEditDocType);
      formData.append("documentNumber", addEditForm.documentNumber.trim());
      formData.append("issueDate", addEditForm.issueDate.trim());
      formData.append("expiryDate", addEditForm.expiryDate.trim());
      if (addEditForm.placeOfIssue.trim()) formData.append("placeOfIssue", addEditForm.placeOfIssue.trim());
      if (addEditForm.visaType.trim()) formData.append("visaType", addEditForm.visaType.trim());
      if (addEditForm.notes.trim()) formData.append("notes", addEditForm.notes.trim());
      if (addEditMode === "edit" && addEditForm.reason.trim()) formData.append("reason", addEditForm.reason.trim());
      if (addEditForm.file) formData.append("file", addEditForm.file);

      const res = addEditMode === "add" 
        ? await addOriginalDocumentAction(formData)
        : await editDocumentDetailsAction(formData);

      if (res.success) {
        toast.success(
          addEditMode === "add" ? "Document Added" : "Document Updated",
          {
            description: addEditMode === "add"
              ? `Original ${addEditDocType === "passport" ? "Passport" : addEditDocType === "visa" ? "Student Visa" : "eFRRO"} details added successfully.`
              : `${addEditDocType === "passport" ? "Passport" : addEditDocType === "visa" ? "Student Visa" : "eFRRO"} details updated successfully.`
          }
        );
        setAddEditDocDialogOpen(false);
        await Promise.all([loadStudentData(), loadReminderSchedule()]);
      } else {
        toast.error("Operation Failed", { description: res.error || "Failed to save document details." });
      }
    } catch (err) {
      toast.error("Save Error", {
        description: err instanceof Error ? err.message : "Failed to record document details."
      });
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Renew Document Dialog State
  const [renewDialogOpen, setRenewDialogOpen] = React.useState(false);
  const [renewDocType, setRenewDocType] = React.useState<"passport" | "visa" | "efrro">("passport");
  const [renewForm, setRenewForm] = React.useState({
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    placeOfIssue: "",
    visaType: "Student (S-1)",
    notes: "",
    file: null as File | null
  });
  const [isRenewing, setIsRenewing] = React.useState(false);
  const [renewErrors, setRenewErrors] = React.useState<Record<string, string>>({});

  // Version History Dialog State
  const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false);
  const [historyDocType, setHistoryDocType] = React.useState<"passport" | "visa" | "efrro">("passport");
  const [historyVersions, setHistoryVersions] = React.useState<DocumentVersionHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  const handleOpenRenewDialog = (docType: "passport" | "visa" | "efrro") => {
    if (!student) return;
    const currentDoc = docType === "passport" ? student.passport : docType === "visa" ? student.visa : student.efrro;
    
    // Strict requirement: Cannot renew if no original document exists
    if (!isDocRecorded(currentDoc)) {
      toast.error("Original Document Required", {
        description: `Original ${docType === "passport" ? "Passport" : docType === "visa" ? "Visa" : "eFRRO"} details must be added before renewal can be created.`
      });
      handleOpenAddDocDialog(docType);
      return;
    }

    setRenewDocType(docType);
    setRenewForm({
      documentNumber: currentDoc?.number && hasValidDocumentNumber(currentDoc.number) ? currentDoc.number : "",
      issueDate: currentDoc?.issueDate ? currentDoc.issueDate.split("T")[0] : "",
      expiryDate: "",
      placeOfIssue: currentDoc?.placeOfIssue || "",
      visaType: currentDoc?.visaType || "Student (S-1)",
      notes: "",
      file: null
    });
    setRenewErrors({});
    setRenewDialogOpen(true);
  };

  const handleOpenHistoryDialog = async (docType: "passport" | "visa" | "efrro") => {
    setHistoryDocType(docType);
    setHistoryDialogOpen(true);
    setIsLoadingHistory(true);
    try {
      const res = await getDocumentHistoryAction(studentId, docType);
      if (res.success) {
        setHistoryVersions(res.versions || []);
      } else {
        toast.error("Failed to load document version history");
        setHistoryVersions([]);
      }
    } catch {
      toast.error("Error loading version history");
      setHistoryVersions([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmitRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const errors: Record<string, string> = {};
    if (!renewForm.documentNumber.trim()) errors.documentNumber = "Document number is required.";
    if (!renewForm.issueDate.trim()) errors.issueDate = "Issue date is required.";
    if (!renewForm.expiryDate.trim()) errors.expiryDate = "Expiration date is required.";
    if (renewForm.issueDate && renewForm.expiryDate && renewForm.expiryDate <= renewForm.issueDate) {
      errors.expiryDate = "Expiration date must be strictly after the issue date.";
    }

    if (Object.keys(errors).length > 0) {
      setRenewErrors(errors);
      return;
    }

    setIsRenewing(true);
    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      formData.append("documentType", renewDocType);
      formData.append("documentNumber", renewForm.documentNumber.trim());
      formData.append("issueDate", renewForm.issueDate.trim());
      formData.append("expiryDate", renewForm.expiryDate.trim());
      if (renewForm.placeOfIssue.trim()) formData.append("placeOfIssue", renewForm.placeOfIssue.trim());
      if (renewForm.visaType.trim()) formData.append("visaType", renewForm.visaType.trim());
      if (renewForm.notes.trim()) formData.append("notes", renewForm.notes.trim());
      if (renewForm.file) formData.append("file", renewForm.file);

      const res = await renewDocumentAction(formData);
      if (res.success) {
        toast.success(`Document Renewed (${res.versionLabel || "New Version"})`, {
          description: "New document version is now current and active in compliance schedules."
        });
        setRenewDialogOpen(false);
        await Promise.all([loadStudentData(), loadReminderSchedule()]);
      } else {
        toast.error("Renewal Rejected", { description: res.error || "Failed to renew document." });
        if (res.error?.includes("Original document details must be added")) {
          setRenewDialogOpen(false);
          handleOpenAddDocDialog(renewDocType);
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unexpected error renewing document.");
    } finally {
      setIsRenewing(false);
    }
  };

  // Academic Programs & Schools Reference State
  const [academicPrograms, setAcademicPrograms] = React.useState<AcademicProgram[]>([]);
  const [schools, setSchools] = React.useState<School[]>([]);

  // Expiry-Driven Reminder Schedule State
  const [reminderSchedule, setReminderSchedule] = React.useState<StudentReminderScheduleResponse | null>(null);
  const [selectedReminderDoc, setSelectedReminderDoc] = React.useState<"passport" | "visa" | "efrro">("passport");
  const [isLoadingReminders, setIsLoadingReminders] = React.useState(true);
  const isDispatchingReminder = null;

  // Unsaved Changes Confirmation Dialog State
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = React.useState(false);

  // Dispatch Reminder Dialog State
  const [dispatchDialogState, setDispatchDialogState] = React.useState<{
    isOpen: boolean;
    docType: "passport" | "visa" | "efrro";
    thresholdDays: number;
    ruleId: string;
    ruleName: string;
  }>({
    isOpen: false,
    docType: "passport",
    thresholdDays: 15,
    ruleId: "",
    ruleName: ""
  });

  const openDispatchDialog = (docType: "passport" | "visa" | "efrro", thresholdDays: number, ruleId: string, ruleName: string) => {
    setDispatchDialogState({
      isOpen: true,
      docType,
      thresholdDays,
      ruleId,
      ruleName
    });
  };

  const closeDispatchDialog = () => {
    setDispatchDialogState(prev => ({ ...prev, isOpen: false }));
  };

  // Academic Adjustment Dialog State
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = React.useState(false);
  const [adjustmentForm, setAdjustmentForm] = React.useState({
    adjustmentType: "semester_override" as "semester_override" | "semester_repeat" | "academic_leave" | "course_transfer" | "extension" | "admission_date_correction",
    effectiveDate: new Date().toISOString().split("T")[0],
    adjustedSemester: 1,
    newProgramCode: "",
    reason: "",
    notes: ""
  });
  const [adjustmentErrors, setAdjustmentErrors] = React.useState<Record<string, string>>({});
  const [isSavingAdjustment, setIsSavingAdjustment] = React.useState(false);
  const [saveAdjustmentSuccess, setSaveAdjustmentSuccess] = React.useState(false);
  const [saveAdjustmentError, setSaveAdjustmentError] = React.useState(false);

  const handleOpenAdjustmentDialog = () => {
    if (!student) return;
    setAdjustmentForm({
      adjustmentType: "semester_override",
      effectiveDate: new Date().toISOString().split("T")[0],
      adjustedSemester: student.currentSemester || 1,
      newProgramCode: student.programCode || "",
      reason: "",
      notes: ""
    });
    setAdjustmentErrors({});
    setSaveAdjustmentSuccess(false);
    setSaveAdjustmentError(false);
    setIsAdjustmentDialogOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const errors: Record<string, string> = {};
    if (!adjustmentForm.reason.trim()) {
      errors.reason = "A mandatory institutional reason is required.";
    }
    if (!adjustmentForm.effectiveDate) {
      errors.effectiveDate = "Effective date is required.";
    }

    if (Object.keys(errors).length > 0) {
      setAdjustmentErrors(errors);
      return;
    }

    setIsSavingAdjustment(true);
    setSaveAdjustmentSuccess(false);
    setSaveAdjustmentError(false);

    try {
      const res = await recordAcademicAdjustmentAction(studentId, {
        adjustmentType: adjustmentForm.adjustmentType,
        effectiveDate: adjustmentForm.effectiveDate,
        previousSemester: student.currentSemester,
        adjustedSemester: Number(adjustmentForm.adjustedSemester) || null,
        previousProgramCode: student.programCode,
        newProgramCode: adjustmentForm.adjustmentType === "course_transfer" ? adjustmentForm.newProgramCode : undefined,
        reason: adjustmentForm.reason.trim(),
        notes: adjustmentForm.notes.trim() || undefined
      });

      if (res.success) {
        setSaveAdjustmentSuccess(true);
        toast.success("Academic Adjustment Recorded", {
          description: `Progression updated to Semester ${res.currentSemester || student.currentSemester}.`
        });
        await loadStudentData();
        setTimeout(() => {
          setIsAdjustmentDialogOpen(false);
        }, 500);
      } else {
        setSaveAdjustmentError(true);
        toast.error(res.error || "Failed to record academic adjustment.");
      }
    } catch {
      setSaveAdjustmentError(true);
      toast.error("Unexpected error saving academic adjustment.");
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  const loadStudentData = React.useCallback(async () => {
    try {
      setIsLoadingStudent(true);
      const res = await getStudentDetailsAction(studentId);
      if (res.success && res.student) {
        setStudent(res.student);
      } else {
        setStudent(undefined);
      }
    } catch (err) {
      console.error("[STUDENT_DETAILS] Failed to load student:", err);
      setStudent(undefined);
    } finally {
      setIsLoadingStudent(false);
    }
  }, [studentId]);

  const loadReminderSchedule = React.useCallback(async () => {
    try {
      setIsLoadingReminders(true);
      const res = await getStudentReminderScheduleAction(studentId);
      if (res.success && res.schedule) {
        setReminderSchedule(res.schedule);
      }
    } catch (err) {
      console.error("[REMINDERS_LOAD_ERROR]", err);
    } finally {
      setIsLoadingReminders(false);
    }
  }, [studentId]);

  const effectiveSchedule = React.useMemo(() => {
    if (reminderSchedule) return reminderSchedule;
    if (!student) return null;

    return ExpiryReminderEngine.calculateStudentReminders({
      studentId,
      expectedGraduationDate: student.expectedGraduation,
      passport: student.passport ? {
        number: student.passport.number,
        expiryDate: student.passport.expiryDate,
        isUploaded: student.passport.hasUploadedDocument,
        verificationStatus: student.passport.verificationStatus
      } : null,
      visa: student.visa ? {
        number: student.visa.number,
        expiryDate: student.visa.expiryDate,
        isUploaded: student.visa.hasUploadedDocument,
        verificationStatus: student.visa.verificationStatus
      } : null,
      efrro: student.efrro ? {
        number: student.efrro.number,
        expiryDate: student.efrro.expiryDate,
        isUploaded: student.efrro.hasUploadedDocument,
        verificationStatus: student.efrro.verificationStatus
      } : null,
      notifications: []
    });
  }, [reminderSchedule, student, studentId]);

  // Automatically select the first document tab that has an active expiry date if current tab has no expiry recorded
  React.useEffect(() => {
    if (effectiveSchedule) {
      const hasPassport = Boolean(effectiveSchedule.passport?.expiryDate);
      const hasVisa = Boolean(effectiveSchedule.visa?.expiryDate);
      const hasEfrro = Boolean(effectiveSchedule.efrro?.expiryDate);

      if (selectedReminderDoc === "passport" && !hasPassport) {
        if (hasEfrro) {
          setSelectedReminderDoc("efrro");
        } else if (hasVisa) {
          setSelectedReminderDoc("visa");
        }
      }
    }
  }, [effectiveSchedule, selectedReminderDoc]);

  React.useEffect(() => {
    loadStudentData();
    loadReminderSchedule();
  }, [loadStudentData, loadReminderSchedule]);

  React.useEffect(() => {
    async function loadReferenceData() {
      const [progRes, schoolRes] = await Promise.all([
        getActiveAcademicProgramsAction(),
        getActiveSchoolsAction()
      ]);
      if (progRes.success && progRes.programs) {
        setAcademicPrograms(progRes.programs);
      }
      if (schoolRes.success && schoolRes.schools) {
        setSchools(schoolRes.schools);
      }
    }
    loadReferenceData();
  }, []);

  // Edit Profile States
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    registrationNumber: "",
    fullName: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    bloodGroup: "",
    physicalDisability: "not_specified",
    programId: "",
    program: "",
    admissionDate: "",
    expectedGraduation: "",
    admissionCategory: "",
    admissionCategoryOther: "",
    siiApplicationNumber: "",
    iccrApplicationNumber: "",
    nfsuCampus: "",
    admissionAcademicYear: "",
    feePaymentCategory: "",
    tuitionFeeAmount: "",
    tuitionFeeCurrency: "INR",
    hostelFeeAmount: "",
    hostelFeeCurrency: "INR",
    phoneHome: "",
    phoneLocal: "",
    permanentAddress: "",
    presentAddress: "",
    localAddress: "",
    fatherName: "",
    fatherMobile: "",
    fatherWhatsapp: "",
    fatherEmail: "",
    motherName: "",
    motherMobile: "",
    motherWhatsapp: "",
    motherEmail: "",
    emergencyContactName: "",
    emergencyContactRelation: "parent",
    emergencyContactPhone: "",
    emergencyContactEmail: "",
    currentSemester: 1,
    academicStatus: "good_standing" as StudentProfile["academicStatus"],
    isSchoolOverridden: false,
    overrideSchoolId: "",
    schoolOverrideReason: "",
    status: "active" as StudentProfile["status"],
    embassyName: "",
    embassyAddress: "",
    embassyCity: "",
    embassyCountry: "",
    embassyPhone: "",
    embassyEmail: "",
    embassyWebsite: "",
    embassyContactPerson: ""
  });

  const openEditDialog = () => {
    if (student) {
      setEditForm({
        registrationNumber: student.registrationNumber && student.registrationNumber !== "Not provided" ? student.registrationNumber : "",
        fullName: student.fullName,
        email: student.email,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split("T")[0] : "",
        gender: student.gender || "",
        maritalStatus: student.maritalStatus || "",
        bloodGroup: student.bloodGroup || "",
        physicalDisability: student.physicalDisability === true ? "yes" : student.physicalDisability === false ? "no" : "not_specified",
        programId: student.programId || "",
        program: student.programName || student.programCode || "",
        isSchoolOverridden: Boolean(student.isSchoolOverridden),
        overrideSchoolId: student.overrideSchoolId || "",
        schoolOverrideReason: student.schoolOverrideReason || "",
        admissionDate: student.admissionDate ? student.admissionDate.split("T")[0] : "",
        expectedGraduation: student.expectedGraduation ? student.expectedGraduation.split("T")[0] : "",
        admissionCategory: student.admissionCategory || "",
        admissionCategoryOther: student.admissionCategoryOther || "",
        siiApplicationNumber: student.siiApplicationNumber || "",
        iccrApplicationNumber: student.iccrApplicationNumber || "",
        nfsuCampus: student.nfsuCampus || "",
        admissionAcademicYear: student.admissionAcademicYear || "",
        feePaymentCategory: student.feePaymentCategory || "",
        tuitionFeeAmount: student.tuitionFeeAmount !== null && student.tuitionFeeAmount !== undefined ? String(student.tuitionFeeAmount) : "",
        tuitionFeeCurrency: student.tuitionFeeCurrency || "INR",
        hostelFeeAmount: student.hostelFeeAmount !== null && student.hostelFeeAmount !== undefined ? String(student.hostelFeeAmount) : "",
        hostelFeeCurrency: student.hostelFeeCurrency || "INR",
        phoneHome: student.phoneHome,
        phoneLocal: student.phoneLocal || "",
        permanentAddress: student.permanentAddress,
        presentAddress: student.presentAddress || student.localAddress || "",
        localAddress: student.localAddress || student.presentAddress || "",
        fatherName: student.fatherName || "",
        fatherMobile: student.fatherMobile || "",
        fatherWhatsapp: student.fatherWhatsapp || "",
        fatherEmail: student.fatherEmail || "",
        motherName: student.motherName || "",
        motherMobile: student.motherMobile || "",
        motherWhatsapp: student.motherWhatsapp || "",
        motherEmail: student.motherEmail || "",
        emergencyContactName: student.emergencyContact?.name && student.emergencyContact.name !== "Not Specified" ? student.emergencyContact.name : "",
        emergencyContactRelation: student.emergencyContact?.relationship || "parent",
        emergencyContactPhone: student.emergencyContact?.phone && student.emergencyContact.phone !== "Not Specified" ? student.emergencyContact.phone : "",
        emergencyContactEmail: student.emergencyContact?.email || "",
        currentSemester: student.currentSemester,
        academicStatus: student.academicStatus,
        status: student.status,
        embassyName: student.embassy?.name && student.embassy.name !== "Not Specified" ? student.embassy.name : "",
        embassyAddress: student.embassy?.address && student.embassy.address !== "Not Specified" ? student.embassy.address : "",
        embassyCity: student.embassy?.city || "",
        embassyCountry: student.embassy?.country || "",
        embassyPhone: student.embassy?.phone || "",
        embassyEmail: student.embassy?.email || "",
        embassyWebsite: student.embassy?.website || "",
        embassyContactPerson: student.embassy?.contactPerson || ""
      });
      setIsDirty(false);
      setIsEditDialogOpen(true);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditForm(prev => ({ ...prev, [id]: value }));
    setIsDirty(true);
  };

  const handleFormSelectChange = (name: string, value: string) => {
    setEditForm(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  // AsyncActionButton states for edit profile save action
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);

  // Compute profile completion score and missing fields
  const profileCompletion = React.useMemo<ProfileCompletionResult | null>(() => {
    if (!student) return null;
    return ProfileCompletionEngine.evaluate({
      fullName: student.fullName,
      nationalityCode: student.nationalityCode,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      maritalStatus: student.maritalStatus,
      bloodGroup: student.bloodGroup,
      physicalDisability: student.physicalDisability,
      programCode: student.programCode,
      admissionDate: student.admissionDate,
      expectedGraduation: student.expectedGraduation,
      admissionCategory: student.admissionCategory,
      admissionCategoryOther: student.admissionCategoryOther,
      siiApplicationNumber: student.siiApplicationNumber,
      email: student.email,
      phoneHome: student.phoneHome,
      permanentAddress: student.permanentAddress,
      fatherName: student.fatherName,
      fatherEmail: student.fatherEmail,
      motherName: student.motherName,
      motherEmail: student.motherEmail,
      emergencyContactName: student.emergencyContact?.name,
      emergencyContactPhone: student.emergencyContact?.phone,
      passportNumber: student.passport?.number,
      passportExpiry: student.passport?.expiryDate,
      visaNumber: student.visa?.number,
      visaExpiry: student.visa?.expiryDate,
      efrroNumber: student.efrro?.number,
      efrroExpiry: student.efrro?.expiryDate
    });
  }, [student]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.fullName.trim()) {
      toast.error("Validation Error", { description: "Full Name is required." });
      return;
    }
    if (editForm.email && editForm.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email.trim())) {
        toast.error("Validation Error", { description: "Please enter a valid email address format." });
        return;
      }
    }
    if (editForm.fatherEmail && editForm.fatherEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.fatherEmail.trim())) {
        toast.error("Validation Error", { description: "Please enter a valid Father Email ID format." });
        return;
      }
    }
    if (editForm.motherEmail && editForm.motherEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.motherEmail.trim())) {
        toast.error("Validation Error", { description: "Please enter a valid Mother Email ID format." });
        return;
      }
    }
    if (editForm.admissionCategory === "other" && !editForm.admissionCategoryOther?.trim()) {
      toast.error("Validation Error", { description: "Please specify the custom admission track." });
      return;
    }

    if (editForm.isSchoolOverridden && !editForm.overrideSchoolId) {
      toast.error("Validation Error", { description: "Please select an alternative school for the administrative override." });
      return;
    }
    if (editForm.isSchoolOverridden && !editForm.schoolOverrideReason?.trim()) {
      toast.error("Validation Error", { description: "A mandatory justification is required for the administrative school override." });
      return;
    }

    // Parse disability 3-state value
    let parsedDisability: boolean | null | undefined = undefined;
    if (editForm.physicalDisability === "yes") parsedDisability = true;
    else if (editForm.physicalDisability === "no") parsedDisability = false;
    else if (editForm.physicalDisability === "not_specified") parsedDisability = null;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      const res = await updateStudentAction(studentId, {
        registrationNumber: editForm.registrationNumber?.trim() || null,
        fullName: editForm.fullName.trim(),
        dateOfBirth: editForm.dateOfBirth?.trim() || undefined,
        gender: (editForm.gender as "male" | "female" | "other" | "transgender" | "prefer_not_to_say") || undefined,
        maritalStatus: (editForm.maritalStatus as MaritalStatus) || undefined,
        bloodGroup: editForm.bloodGroup?.trim() || undefined,
        physicalDisability: parsedDisability,
        email: editForm.email?.trim() || undefined,
        phoneHome: editForm.phoneHome?.trim() || undefined,
        phoneLocal: editForm.phoneLocal?.trim() || undefined,
        permanentAddress: editForm.permanentAddress !== undefined ? (editForm.permanentAddress?.trim() || null) : undefined,
        presentAddress: editForm.presentAddress !== undefined ? (editForm.presentAddress?.trim() || null) : (editForm.localAddress !== undefined ? (editForm.localAddress?.trim() || null) : undefined),
        localAddress: editForm.presentAddress !== undefined ? (editForm.presentAddress?.trim() || null) : (editForm.localAddress !== undefined ? (editForm.localAddress?.trim() || null) : undefined),
        fatherName: editForm.fatherName !== undefined ? (editForm.fatherName?.trim() || null) : undefined,
        fatherMobile: editForm.fatherMobile !== undefined ? (editForm.fatherMobile?.trim() || null) : undefined,
        fatherWhatsapp: editForm.fatherWhatsapp !== undefined ? (editForm.fatherWhatsapp?.trim() || null) : undefined,
        fatherEmail: editForm.fatherEmail !== undefined ? (editForm.fatherEmail.trim() ? editForm.fatherEmail.trim().toLowerCase() : null) : undefined,
        motherName: editForm.motherName !== undefined ? (editForm.motherName?.trim() || null) : undefined,
        motherMobile: editForm.motherMobile !== undefined ? (editForm.motherMobile?.trim() || null) : undefined,
        motherWhatsapp: editForm.motherWhatsapp !== undefined ? (editForm.motherWhatsapp?.trim() || null) : undefined,
        motherEmail: editForm.motherEmail !== undefined ? (editForm.motherEmail.trim() ? editForm.motherEmail.trim().toLowerCase() : null) : undefined,
        relationshipName: editForm.emergencyContactName?.trim() || undefined,
        relationshipType: (editForm.emergencyContactRelation as RelationshipType) || undefined,
        relationshipPhone: editForm.emergencyContactPhone?.trim() || undefined,
        relationshipEmail: editForm.emergencyContactEmail?.trim() || undefined,
        programId: editForm.programId?.trim() || undefined,
        programCode: editForm.program?.trim() || undefined,
        overrideSchoolId: editForm.isSchoolOverridden ? (editForm.overrideSchoolId || null) : null,
        schoolOverrideReason: editForm.isSchoolOverridden ? (editForm.schoolOverrideReason?.trim() || null) : null,
        admissionDate: editForm.admissionDate?.trim() || undefined,
        expectedGraduation: editForm.expectedGraduation?.trim() || undefined,
        admissionCategory: (editForm.admissionCategory as AdmissionCategory) || undefined,
        admissionCategoryOther: editForm.admissionCategory === "other" ? (editForm.admissionCategoryOther?.trim() || undefined) : undefined,
        siiApplicationNumber: editForm.siiApplicationNumber ? editForm.siiApplicationNumber.trim() : null,
        iccrApplicationNumber: editForm.iccrApplicationNumber ? editForm.iccrApplicationNumber.trim() : null,
        nfsuCampus: editForm.nfsuCampus ? editForm.nfsuCampus.trim() : null,
        admissionAcademicYear: editForm.admissionAcademicYear?.trim() || null,
        feePaymentCategory: (editForm.feePaymentCategory as FeePaymentCategory) || null,
        tuitionFeeAmount: editForm.tuitionFeeAmount?.trim() !== "" ? Number(editForm.tuitionFeeAmount) : null,
        tuitionFeeCurrency: editForm.tuitionFeeAmount?.trim() !== "" ? ((editForm.tuitionFeeCurrency as FeeCurrency) || "INR") : null,
        hostelFeeAmount: editForm.hostelFeeAmount?.trim() !== "" ? Number(editForm.hostelFeeAmount) : null,
        hostelFeeCurrency: editForm.hostelFeeAmount?.trim() !== "" ? ((editForm.hostelFeeCurrency as FeeCurrency) || "INR") : null,
        currentSemester: Number(editForm.currentSemester) || 1,
        academicStatus: editForm.academicStatus,
        status: editForm.status,
        embassyName: editForm.embassyName.trim() || undefined,
        embassyAddress: editForm.embassyAddress.trim() || undefined,
        embassyCity: editForm.embassyCity.trim() || undefined,
        embassyCountry: editForm.embassyCountry.trim() || undefined,
        embassyPhone: editForm.embassyPhone.trim() || undefined,
        embassyEmail: editForm.embassyEmail.trim() || undefined,
        embassyWebsite: editForm.embassyWebsite.trim() || undefined,
        embassyContactPerson: editForm.embassyContactPerson.trim() || undefined
      });

      if (res.success) {
        setSaveSuccess(true);
        toast.success("Profile Updated", { description: "Student information updated successfully in database." });
        await Promise.all([loadStudentData(), loadReminderSchedule()]);
        setTimeout(() => {
          setIsEditDialogOpen(false);
          setIsDirty(false);
        }, 600);
      } else {
        setSaveError(true);
        toast.error("Update Failed", { description: res.error || "Failed to update student profile." });
      }
    } catch (err) {
      setSaveError(true);
      toast.error("Database Error", {
        description: err instanceof Error ? err.message : "Unable to communicate with database."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      if (isDirty) {
        setIsConfirmDiscardOpen(true);
        return;
      }
      setIsEditDialogOpen(false);
      setIsDirty(false);
    } else {
      openEditDialog();
    }
  };

  const handleConfirmDiscard = () => {
    setIsConfirmDiscardOpen(false);
    setIsEditDialogOpen(false);
    setIsDirty(false);
  };

  const handleCancelDiscard = () => {
    setIsConfirmDiscardOpen(false);
  };

  const getComplianceHeaderBadge = (status: StudentProfile["complianceStatus"]) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-2.5 py-0.5">Compliant</Badge>;
      case "warning":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-2.5 py-0.5">Warning / Expiring Soon</Badge>;
      case "expired":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs px-2.5 py-0.5">Expired Document</Badge>;
      default:
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs px-2.5 py-0.5">Non-Compliant</Badge>;
    }
  };

  if (isLoadingStudent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="text-sm font-medium text-muted-foreground">Loading student profile...</h2>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-h2 font-semibold">Student Record Not Found</h2>
        <p className="text-xs text-muted-foreground font-caption">
          The requested student ID does not match any registered international profile.
        </p>
        <Link href="/students" passHref>
          <Button size="sm">Return to Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Link 
              href="/students" 
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Directory
            </Link>
            <span className="text-muted-foreground/40 shrink-0">/</span>
            <span className="text-xs font-mono font-medium text-foreground truncate">
              {student.registrationNumber && student.registrationNumber !== "Not provided" ? student.registrationNumber : "Enrollment: Not provided"}
            </span>
          </div>
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <CountryFlag countryCode={student.nationalityCode} size="md" />
            <h1 className="text-xl font-h1 font-bold text-foreground tracking-tight truncate">{student.fullName}</h1>
            {getComplianceHeaderBadge(student.complianceStatus)}
          </div>
        </div>

        {/* Global Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={openEditDialog}
          >
            Edit Student Profile
          </Button>
          <Link href={`/reports/students?id=${student.id}`} passHref>
            <Button size="sm" variant="default" className="text-xs">
              Generate PDF Dossier
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Completion Progress Card */}
      {profileCompletion && profileCompletion.percentage < 100 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 text-foreground shadow-xs animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                {profileCompletion.statusLabel} ({profileCompletion.percentage}%)
              </Badge>
              <span className="text-xs font-medium text-foreground">
                Progressive Registration Active
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted/60 dark:bg-zinc-800 h-2 rounded-full overflow-hidden max-w-md">
              <div 
                className={`h-full transition-all duration-500 ${
                  profileCompletion.percentage >= 80 
                    ? "bg-emerald-500" 
                    : profileCompletion.percentage >= 40 
                      ? "bg-amber-500" 
                      : "bg-rose-500"
                }`}
                style={{ width: `${profileCompletion.percentage}%` }}
              />
            </div>
            {profileCompletion.missingItems.length > 0 && (
              <p className="text-[11px] text-muted-foreground font-caption leading-relaxed">
                <span className="font-semibold text-foreground/80">Pending Information:</span> {profileCompletion.missingItems.join(", ")}.
              </p>
            )}
          </div>

          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs border-amber-500/40 hover:bg-amber-500/10 shrink-0"
            onClick={openEditDialog}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
            Complete Profile
          </Button>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid gap-6 lg:grid-cols-3 w-full max-w-full min-w-0">
        {/* Left 2 Cols: Tabbed Content */}
        <div className="lg:col-span-2 space-y-6 w-full max-w-full min-w-0">
          {/* Sub-tabs for detailed drill-down */}
          <SectionNavGroup orientation="horizontal" variant="segmented" className="w-full max-w-full min-w-0">
            <SectionNavCard
              icon={User}
              title="Personal Identity"
              isActive={activeSubTab === "personal"}
              onClick={() => setActiveSubTab("personal")}
              variant="segmented"
              size="sm"
            />
            <SectionNavCard
              icon={GraduationCap}
              title="Academic Profile"
              isActive={activeSubTab === "academic"}
              onClick={() => setActiveSubTab("academic")}
              variant="segmented"
              size="sm"
            />
            <SectionNavCard
              icon={Phone}
              title="Contact & Guardian"
              isActive={activeSubTab === "contact"}
              onClick={() => setActiveSubTab("contact")}
              variant="segmented"
              size="sm"
            />
            <SectionNavCard
              icon={FileText}
              title="Compliance Documents"
              isActive={activeSubTab === "documents"}
              onClick={() => setActiveSubTab("documents")}
              variant="segmented"
              size="sm"
            />
          </SectionNavGroup>

          {/* Tab 1: Personal & Demographic Info */}
          {activeSubTab === "personal" && (
            <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Personal & Demographic Identity
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Biographical coordinates, demographic background, and physical indicators.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 text-xs w-full min-w-0">
                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Full Name (Legal)</span>
                    <span className="font-semibold text-foreground block text-sm break-words">{student.fullName}</span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Nationality</span>
                    <div className="flex items-center gap-2 font-semibold text-foreground pt-0.5">
                      <CountryFlag countryCode={student.nationalityCode} size="sm" />
                      <span>{student.nationalityName}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20 min-w-0 sm:col-span-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-muted-foreground block text-[11px] font-medium">Date of Birth & Age Calculation</span>
                      {student.dateOfBirth && (() => {
                        const ageInfo = formatAgeDisplay(student.dateOfBirth);
                        return ageInfo ? (
                          <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-bold bg-primary/10 text-primary border-primary/30">
                            {ageInfo.fullText}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <span>{student.dateOfBirth ? AcademicProgressionEngine.formatDisplayDate(student.dateOfBirth) : "Not provided"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Calculated dynamically relative to the student&apos;s date of birth and elapsed chronological years.
                    </p>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Gender</span>
                    <span className="font-semibold text-foreground block capitalize">
                      {student.gender ? student.gender.replace(/_/g, " ") : "Not provided"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Marital Status</span>
                    <span className="font-semibold text-foreground block capitalize">
                      {student.maritalStatus ? student.maritalStatus.replace(/_/g, " ") : "Not provided"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Blood Group</span>
                    <span className="font-semibold text-foreground block font-mono">
                      {student.bloodGroup || "Not provided"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Physical Disability</span>
                    <div>
                      {student.physicalDisability === true ? (
                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs px-2 py-0.5">
                          Yes (Declared)
                        </Badge>
                      ) : student.physicalDisability === false ? (
                        <Badge variant="outline" className="text-muted-foreground text-xs px-2 py-0.5">
                          No
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic font-normal">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 3: Academic & Admission Profile */}
          {activeSubTab === "academic" && (
            <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Academic Standing, Admission & Progression
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Admission track, curriculum structure, enrollment timeline, and adjustment history.
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleOpenAdjustmentDialog} 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8 gap-1.5 rounded-xl border-primary/30 hover:bg-primary/5 hover:text-primary text-foreground"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Academic Adjustment
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Academic Metrics Grid */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 text-xs w-full min-w-0">
                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Enrollment Number</span>
                    <span className="font-semibold text-foreground block font-mono break-all">
                      {student.registrationNumber && student.registrationNumber !== "Not provided" ? student.registrationNumber : "Not provided"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Admission Category</span>
                    <span className="font-semibold text-foreground block">
                      {student.admissionCategory === "iccr" ? "ICCR (Indian Council for Cultural Relations)"
                        : student.admissionCategory === "sii" ? "Study in India (SII)"
                        : student.admissionCategory === "direct" ? "Direct Admission"
                        : student.admissionCategory === "foreign_govt_sponsored" ? "Foreign Govt. Sponsored"
                        : student.admissionCategory === "other" ? `Other (${student.admissionCategoryOther || "Custom Track"})`
                        : "Not provided"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">ICCR Application Number</span>
                    <span className="font-semibold text-foreground block font-mono">
                      {student.iccrApplicationNumber || "Not provided"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Study in India (SII) Number</span>
                    <span className="font-semibold text-foreground block font-mono">
                      {student.siiApplicationNumber || "Not provided"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">NFSU Campus</span>
                    <span className="font-semibold text-foreground block">
                      {student.nfsuCampus || "Not specified"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-muted-foreground block text-[11px] font-medium">Registered School</span>
                      {student.isSchoolOverridden && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
                          Administrative Override
                        </Badge>
                      )}
                    </div>
                    <span className="font-semibold text-foreground block break-words">{student.school}</span>
                    {student.isSchoolOverridden && student.schoolOverrideReason && (
                      <span className="text-[10px] text-muted-foreground block italic pt-0.5">
                        Reason: {student.schoolOverrideReason}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Program Curriculum</span>
                    <span className="font-semibold text-foreground block break-words">{student.programName}</span>
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span className="text-[10px] font-mono text-muted-foreground block">Code: {student.programCode}</span>
                      {student.academicLevelLabel && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
                          {student.academicLevelLabel}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Curriculum Structure</span>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground flex-wrap">
                      <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{student.totalSemesters || 8} Semesters</span>
                      <span className="text-muted-foreground text-[11px] font-normal">({student.semesterDuration || 6} {student.semesterDurationUnit || "mo"}/sem)</span>
                    </div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Admission Date</span>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground flex-wrap">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{AcademicProgressionEngine.formatDisplayDate(student.admissionDate)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Current Semester</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground font-mono">
                        Semester {student.currentSemester} of {student.totalSemesters || 8}
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30 flex items-center gap-1 px-1.5 py-0.5 shrink-0">
                        <Sparkles className="h-2.5 w-2.5" />
                        Automatically calculated
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Automatically calculated from admission date ({AcademicProgressionEngine.formatDisplayDate(student.admissionDate)}) and {student.semesterDuration || 6}-{student.semesterDurationUnit || "month"} intervals.
                    </p>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Admission / Academic Year</span>
                    <span className="font-semibold text-foreground block">
                      {student.admissionAcademicYear || "Not specified"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Fee Payment Category / Funding Type</span>
                    <span className="font-semibold text-foreground block">
                      {student.feePaymentCategory === "self_financed"
                        ? "Self Financed"
                        : student.feePaymentCategory === "scholarship"
                        ? "Scholarship"
                        : "Not specified"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Tuition Fees</span>
                    <span className="font-semibold text-foreground block">
                      {student.tuitionFeeAmount !== null && student.tuitionFeeAmount !== undefined ? (
                        `${student.tuitionFeeCurrency === "USD" ? "$" : "₹"}${student.tuitionFeeAmount.toLocaleString()} ${student.tuitionFeeCurrency || ""}`.trim()
                      ) : (
                        "Not specified"
                      )}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Hostel Fees</span>
                    <span className="font-semibold text-foreground block">
                      {student.hostelFeeAmount !== null && student.hostelFeeAmount !== undefined ? (
                        `${student.hostelFeeCurrency === "USD" ? "$" : "₹"}${student.hostelFeeAmount.toLocaleString()} ${student.hostelFeeCurrency || ""}`.trim()
                      ) : (
                        "Not specified"
                      )}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40 min-w-0">
                    <span className="text-muted-foreground block text-[11px] font-medium">Expected Graduation</span>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground flex-wrap">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{AcademicProgressionEngine.formatDisplayDate(student.expectedGraduation)}</span>
                    </div>
                  </div>
                </div>

                {/* Adjustments & Exceptions Audit Trail */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-semibold text-foreground">Academic Adjustments & Exception History</h4>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {(student.academicAdjustments?.length || 0)} recorded
                    </span>
                  </div>

                  {(!student.academicAdjustments || student.academicAdjustments.length === 0) ? (
                    <div className="p-4 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground bg-muted/10">
                      No manual overrides or exceptions recorded. Progression is automatically synced to academic calendar intervals.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                          <tr>
                            <th className="py-2.5 px-3">Effective Date</th>
                            <th className="py-2.5 px-3">Adjustment Type</th>
                            <th className="py-2.5 px-3">Prev → New Sem</th>
                            <th className="py-2.5 px-3">Institutional Reason</th>
                            <th className="py-2.5 px-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {student.academicAdjustments.map((adj, idx) => (
                            <tr key={adj.id || idx} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                                {AcademicProgressionEngine.formatDisplayDate(adj.effectiveDate)}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                  {adj.adjustmentType.replace(/_/g, " ")}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-muted-foreground">
                                {adj.previousSemester ? `Sem ${adj.previousSemester}` : "—"} → <span className="font-semibold text-foreground">{adj.adjustedSemester ? `Sem ${adj.adjustedSemester}` : "—"}</span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-foreground max-w-xs">
                                {adj.reason}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                                {adj.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 4: Contact & Family Details */}
          {activeSubTab === "contact" && (
            <div className="space-y-6">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Contact & Host Country Coordinates</CardTitle>
                  <CardDescription className="text-[10px] font-caption">Direct student email, home country phone, and residential addresses.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-muted-foreground block font-caption">Institutional Email</span>
                      <span className="font-semibold text-foreground block">{student.email || "Not provided"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground block font-caption">Home Country Phone</span>
                      <span className="font-semibold text-foreground block">{student.phoneHome || "Not provided"}</span>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-muted-foreground block font-caption">Local Phone (Host / India)</span>
                      <span className="font-semibold text-foreground block">{student.phoneLocal || "Not provided"}</span>
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-muted-foreground block font-caption">Permanent Address</span>
                      <span className="font-medium text-foreground block leading-relaxed">{student.permanentAddress || "Not provided"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground block font-caption">Present / Current Address</span>
                      <span className="font-medium text-foreground block leading-relaxed">{student.presentAddress || student.localAddress || "Not provided"}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* WhatsApp OTP Auth Control for Admin */}
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        Registered WhatsApp OTP Number
                      </span>
                      <Badge variant={student.status === "active" ? "default" : "destructive"} className="text-[10px] h-5">
                        {student.status === "active" ? "Login Enabled" : "Login Disabled"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-foreground font-mono font-medium">
                      {student.phoneLocal || student.phoneHome || "No mobile number registered"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Family Information Card */}
              <Card className="border border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Family Information
                  </CardTitle>
                  <CardDescription className="text-[10px] font-caption">Parents&apos; contact coordinates and WhatsApp channels.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Father Details */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                      <span className="font-bold text-foreground block uppercase text-[10px] tracking-wider">Father Information</span>
                      <div className="space-y-1">
                        <span className="text-muted-foreground block font-caption">Full Name</span>
                        <span className="font-semibold text-foreground block">{student.fatherName || "Not provided"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground block font-caption">Mobile Number</span>
                        <span className="font-medium text-foreground block">{student.fatherMobile || "Not provided"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground block font-caption">WhatsApp Number</span>
                        <span className="font-medium text-foreground block">{student.fatherWhatsapp || "Not provided"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground block font-caption">Email ID</span>
                        <span className="font-medium text-foreground block truncate">{student.fatherEmail || "Not provided"}</span>
                      </div>
                    </div>

                    {/* Mother Details */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                      <span className="font-bold text-foreground block uppercase text-[10px] tracking-wider">Mother Information</span>
                      <div className="space-y-1">
                        <span className="text-muted-foreground block font-caption">Full Name</span>
                        <span className="font-semibold text-foreground block">{student.motherName || "Not provided"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground block font-caption">Mobile Number</span>
                        <span className="font-medium text-foreground block">{student.motherMobile || "Not provided"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground block font-caption">WhatsApp Number</span>
                        <span className="font-medium text-foreground block">{student.motherWhatsapp || "Not provided"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground block font-caption">Email ID</span>
                        <span className="font-medium text-foreground block truncate">{student.motherEmail || "Not provided"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 4: Compliance Documents & Version Renewal History */}
          {activeSubTab === "documents" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Compliance Documents & Version History
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Record and track document renewals (Original → Renewal 1 → Renewal 2...). All versions are preserved in permanent history.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-background/80">
                  Administrator Authority
                </Badge>
              </div>

              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
                {/* 1. Passport Card */}
                {(() => {
                  const doc = student.passport;
                  const hasDoc = isDocRecorded(doc);
                  const verLabel = doc?.versionLabel || (hasDoc ? (doc?.versionNumber ? (doc.versionNumber === 1 ? "Original" : `Renewal ${doc.versionNumber - 1}`) : "Original") : null);
                  const renewalCount = doc?.renewalCount ?? 0;

                  let statusText = "Not Recorded";
                  let statusClass = "text-muted-foreground";

                  if (hasDoc && doc?.expiryDate) {
                    const expDate = new Date(doc.expiryDate);
                    const now = new Date();
                    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                      statusText = "Expired";
                      statusClass = "text-destructive font-bold";
                    } else if (diffDays <= 30) {
                      statusText = `Expires in ${diffDays}d`;
                      statusClass = "text-amber-600 dark:text-amber-400 font-semibold";
                    } else {
                      statusText = "Compliant";
                      statusClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                    }
                  }

                  return (
                    <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
                      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Passport
                          </CardTitle>
                          {hasDoc && verLabel ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30">
                              {verLabel}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Not Recorded
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-[11px] text-muted-foreground">Passport & Travel Identification</CardDescription>
                      </CardHeader>
                      
                      {!hasDoc ? (
                        <CardContent className="p-6 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                          <div className="p-3 rounded-full bg-muted/40 text-muted-foreground">
                            <FileText className="h-5 w-5" />
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            No passport details have been added.
                          </p>
                        </CardContent>
                      ) : (
                        <CardContent className="p-4 space-y-3.5 text-xs flex-1">
                          <div className="space-y-1 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                            <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Passport Number</span>
                            <span className="font-semibold text-foreground block font-mono text-sm break-all">
                              {doc?.number || "—"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px]">Issue Date</span>
                              <span className="font-medium text-foreground block">
                                {doc?.issueDate ? AcademicProgressionEngine.formatDisplayDate(doc.issueDate) : "—"}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px]">Expiry Date</span>
                              <span className={statusClass}>
                                {doc?.expiryDate ? AcademicProgressionEngine.formatDisplayDate(doc.expiryDate) : "—"}
                              </span>
                            </div>
                          </div>

                          {doc?.placeOfIssue && (
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px]">Place of Issue</span>
                              <span className="font-medium text-foreground block">{doc.placeOfIssue}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px]">
                            <span className="text-muted-foreground">Total Renewals:</span>
                            <span className="font-bold text-foreground">{renewalCount} {renewalCount === 1 ? "renewal" : "renewals"}</span>
                          </div>

                          {doc?.fileDownloadUrl && (
                            <div className="pt-1">
                              <a
                                href={doc.fileDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Current Document
                              </a>
                            </div>
                          )}
                        </CardContent>
                      )}

                      <CardFooter className="p-3 border-t border-border/40 bg-muted/5 flex items-center justify-between gap-2 flex-wrap">
                        {!hasDoc ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenAddDocDialog("passport")}
                            className="h-8 text-xs w-full gap-1.5 font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Passport Details
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenHistoryDialog("passport")}
                              className="h-8 text-xs flex-1 min-w-[70px] gap-1.5"
                            >
                              <History className="h-3.5 w-3.5 text-muted-foreground" />
                              History
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDocDialog("passport")}
                              className="h-8 text-xs flex-1 min-w-[80px] gap-1.5"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                              Edit Details
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenRenewDialog("passport")}
                              className="h-8 text-xs flex-1 min-w-[100px] gap-1.5 font-semibold"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Renew Passport
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })()}

                {/* 2. Visa Card */}
                {(() => {
                  const doc = student.visa;
                  const hasDoc = isDocRecorded(doc);
                  const verLabel = doc?.versionLabel || (hasDoc ? (doc?.versionNumber ? (doc.versionNumber === 1 ? "Original" : `Renewal ${doc.versionNumber - 1}`) : "Original") : null);
                  const renewalCount = doc?.renewalCount ?? 0;

                  let statusText = "Not Recorded";
                  let statusClass = "text-muted-foreground";

                  if (hasDoc && doc?.expiryDate) {
                    const expDate = new Date(doc.expiryDate);
                    const now = new Date();
                    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                      statusText = "Expired";
                      statusClass = "text-destructive font-bold";
                    } else if (diffDays <= 30) {
                      statusText = `Expires in ${diffDays}d`;
                      statusClass = "text-amber-600 dark:text-amber-400 font-semibold";
                    } else {
                      statusText = "Compliant";
                      statusClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                    }
                  }

                  return (
                    <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
                      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <FileCheck2 className="h-4 w-4 text-primary" />
                            Student Visa
                          </CardTitle>
                          {hasDoc && verLabel ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30">
                              {verLabel}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Not Recorded
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-[11px] text-muted-foreground">Visa & Entry Clearance</CardDescription>
                      </CardHeader>
                      
                      {!hasDoc ? (
                        <CardContent className="p-6 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                          <div className="p-3 rounded-full bg-muted/40 text-muted-foreground">
                            <FileCheck2 className="h-5 w-5" />
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            No student visa details have been added.
                          </p>
                        </CardContent>
                      ) : (
                        <CardContent className="p-4 space-y-3.5 text-xs flex-1">
                          <div className="space-y-1 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                            <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">Visa Number</span>
                            <span className="font-semibold text-foreground block font-mono text-sm break-all">
                              {doc?.number || "—"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px]">Issue Date</span>
                              <span className="font-medium text-foreground block">
                                {doc?.issueDate ? AcademicProgressionEngine.formatDisplayDate(doc.issueDate) : "—"}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px]">Expiry Date</span>
                              <span className={statusClass}>
                                {doc?.expiryDate ? AcademicProgressionEngine.formatDisplayDate(doc.expiryDate) : "—"}
                              </span>
                            </div>
                          </div>

                          {doc?.visaType && (
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px]">Visa Category</span>
                              <span className="font-medium text-foreground block">{doc.visaType}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px]">
                            <span className="text-muted-foreground">Total Renewals:</span>
                            <span className="font-bold text-foreground">{renewalCount} {renewalCount === 1 ? "renewal" : "renewals"}</span>
                          </div>

                          {doc?.fileDownloadUrl && (
                            <div className="pt-1">
                              <a
                                href={doc.fileDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Current Document
                              </a>
                            </div>
                          )}
                        </CardContent>
                      )}

                      <CardFooter className="p-3 border-t border-border/40 bg-muted/5 flex items-center justify-between gap-2 flex-wrap">
                        {!hasDoc ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenAddDocDialog("visa")}
                            className="h-8 text-xs w-full gap-1.5 font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Visa Details
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenHistoryDialog("visa")}
                              className="h-8 text-xs flex-1 min-w-[70px] gap-1.5"
                            >
                              <History className="h-3.5 w-3.5 text-muted-foreground" />
                              History
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDocDialog("visa")}
                              className="h-8 text-xs flex-1 min-w-[80px] gap-1.5"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                              Edit Details
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenRenewDialog("visa")}
                              className="h-8 text-xs flex-1 min-w-[100px] gap-1.5 font-semibold"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Renew Visa
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })()}

                {/* 3. eFRRO Card */}
                {(() => {
                  const doc = student.efrro;
                  const hasDoc = isDocRecorded(doc);
                  const verLabel = doc?.versionLabel || (hasDoc ? (doc?.versionNumber ? (doc.versionNumber === 1 ? "Original" : `Renewal ${doc.versionNumber - 1}`) : "Original") : null);
                  const renewalCount = doc?.renewalCount ?? 0;

                  let statusText = "Not Recorded";
                  let statusClass = "text-muted-foreground";

                  if (hasDoc && doc?.expiryDate) {
                    const expDate = new Date(doc.expiryDate);
                    const now = new Date();
                    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                      statusText = "Expired";
                      statusClass = "text-destructive font-bold";
                    } else if (diffDays <= 30) {
                      statusText = `Expires in ${diffDays}d`;
                      statusClass = "text-amber-600 dark:text-amber-400 font-semibold";
                    } else {
                      statusText = "Compliant";
                      statusClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                    }
                  }

                  return (
                    <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
                      <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            eFRRO / Permit
                          </CardTitle>
                          {hasDoc && verLabel ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30">
                              {verLabel}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Not Recorded
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-[11px] text-muted-foreground">Residential Permit & Compliance</CardDescription>
                      </CardHeader>
                      
                      {!hasDoc ? (
                        <CardContent className="p-6 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                          <div className="p-3 rounded-full bg-muted/40 text-muted-foreground">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            No eFRRO details have been added.
                          </p>
                        </CardContent>
                      ) : (
                        <CardContent className="p-4 space-y-3.5 text-xs flex-1">
                          <div className="space-y-1 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                            <span className="text-muted-foreground block text-[10px] font-medium uppercase tracking-wider">eFRRO Number</span>
                            <span className="font-semibold text-foreground block font-mono text-sm break-all">
                              {doc?.number || "—"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px]">Issue Date</span>
                              <span className="font-medium text-foreground block">
                                {doc?.issueDate ? AcademicProgressionEngine.formatDisplayDate(doc.issueDate) : "—"}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-muted-foreground block text-[10px]">Expiry Date</span>
                              <span className={statusClass}>
                                {doc?.expiryDate ? AcademicProgressionEngine.formatDisplayDate(doc.expiryDate) : "—"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px]">
                            <span className="text-muted-foreground">Total Renewals:</span>
                            <span className="font-bold text-foreground">{renewalCount} {renewalCount === 1 ? "renewal" : "renewals"}</span>
                          </div>

                          {doc?.fileDownloadUrl && (
                            <div className="pt-1">
                              <a
                                href={doc.fileDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Current Document
                              </a>
                            </div>
                          )}
                        </CardContent>
                      )}

                      <CardFooter className="p-3 border-t border-border/40 bg-muted/5 flex items-center justify-between gap-2 flex-wrap">
                        {!hasDoc ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenAddDocDialog("efrro")}
                            className="h-8 text-xs w-full gap-1.5 font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add eFRRO Details
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenHistoryDialog("efrro")}
                              className="h-8 text-xs flex-1 min-w-[70px] gap-1.5"
                            >
                              <History className="h-3.5 w-3.5 text-muted-foreground" />
                              History
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDocDialog("efrro")}
                              className="h-8 text-xs flex-1 min-w-[80px] gap-1.5"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                              Edit Details
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenRenewDialog("efrro")}
                              className="h-8 text-xs flex-1 min-w-[100px] gap-1.5 font-semibold"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Renew eFRRO
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Emergency Contacts + Consular Info + DEDICATED REMINDER SCHEDULE */}
        <div className="space-y-6 w-full max-w-full min-w-0">
          {/* Emergency Contact */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground block font-caption">Contact Name</span>
                <span className="font-semibold text-foreground block">{student.emergencyContact.name}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground block font-caption">Relationship</span>
                <span className="font-medium text-foreground block capitalize">{student.emergencyContact.relationship}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground block font-caption">Primary Phone</span>
                <span className="font-semibold text-foreground block flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {student.emergencyContact.phone}
                </span>
              </div>
              {student.emergencyContact.email && (
                <div className="space-y-0.5">
                  <span className="text-muted-foreground block font-caption">Email Address</span>
                  <span className="font-medium text-foreground block flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {student.emergencyContact.email}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consular & Embassy Details */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consular & Embassy Info</CardTitle>
              <Button variant="ghost" size="sm" onClick={openEditDialog} className="h-6 text-[10px] px-2 text-primary hover:text-primary">
                Edit Info
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground block font-caption">Consulate / Embassy Name</span>
                <span className="font-semibold text-foreground block flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {student.embassy?.name && student.embassy.name !== "Not Specified" ? student.embassy.name : <span className="text-muted-foreground font-normal">Not provided</span>}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block font-caption">Embassy Address</span>
                <span className="font-medium text-foreground block leading-normal">
                  {student.embassy?.address && student.embassy.address !== "Not Specified" ? student.embassy.address : <span className="text-muted-foreground font-normal">Not provided</span>}
                </span>
              </div>

              {(student.embassy?.city || student.embassy?.country) && (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  {student.embassy.city && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block font-caption">City</span>
                      <span className="font-medium text-foreground block">{student.embassy.city}</span>
                    </div>
                  )}
                  {student.embassy.country && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block font-caption">Country</span>
                      <span className="font-medium text-foreground block">{student.embassy.country}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/30">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground block font-caption">Helpline Phone</span>
                  <span className="font-semibold text-foreground block flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {student.embassy?.phone || <span className="text-muted-foreground font-normal font-sans">Not provided</span>}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground block font-caption">Consular Email</span>
                  <span className="font-medium text-foreground block flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {student.embassy?.email || <span className="text-muted-foreground font-normal">Not provided</span>}
                  </span>
                </div>
              </div>

              {student.embassy?.website && (
                <div className="space-y-0.5 pt-1 border-t border-border/30">
                  <span className="text-muted-foreground block font-caption">Official Website</span>
                  <a
                    href={student.embassy.website.startsWith("http") ? student.embassy.website : `https://${student.embassy.website}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-medium text-primary hover:underline flex items-center gap-1 text-[11px] truncate"
                  >
                    <Globe className="h-3 w-3 shrink-0" />
                    {student.embassy.website}
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 ml-0.5 opacity-70" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* UNIFIED DOCUMENT REMINDER SCHEDULE SECTION */}
          <DocumentReminderSchedule
            schedule={effectiveSchedule}
            selectedDocType={selectedReminderDoc}
            onSelectDocType={setSelectedReminderDoc}
            isLoading={isLoadingReminders}
            onRefresh={loadReminderSchedule}
            onOpenDispatch={openDispatchDialog}
            isDispatchingReminderId={isDispatchingReminder}
          />
        </div>
      </div>

      {/* Edit Student Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Edit Student Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-5 py-2">
            {/* Identity & Demographics Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <User className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Identity & Demographics</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="fullName">Full Legal Name *</label>
                  <Input id="fullName" value={editForm.fullName} onChange={handleFormChange} className="h-9 text-sm" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="registrationNumber">University Enrollment Number</label>
                  <Input 
                    id="registrationNumber" 
                    placeholder="e.g. NFSU/2026/CS/101" 
                    value={editForm.registrationNumber} 
                    onChange={handleFormChange} 
                    className="h-9 text-sm font-mono" 
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground" htmlFor="dateOfBirth">Date of Birth</label>
                    {editForm.dateOfBirth && (() => {
                      const ageInfo = formatAgeDisplay(editForm.dateOfBirth);
                      return ageInfo ? (
                        <span className="text-[10px] font-semibold text-primary font-mono">
                          {ageInfo.fullText}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <DatePicker
                    id="dateOfBirth"
                    value={editForm.dateOfBirth}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }));
                      setIsDirty(true);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="gender">Gender</label>
                  <Select value={editForm.gender} onValueChange={(val) => handleFormSelectChange("gender", val || "")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select gender..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="transgender">Transgender</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="maritalStatus">Marital Status</label>
                  <Select value={editForm.maritalStatus} onValueChange={(val) => handleFormSelectChange("maritalStatus", val || "")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select marital status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="bloodGroup">Blood Group</label>
                  <Select value={editForm.bloodGroup} onValueChange={(val) => handleFormSelectChange("bloodGroup", val || "")}>
                    <SelectTrigger className="h-9 text-xs font-mono">
                      <SelectValue placeholder="Select blood group..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUP_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="font-mono">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="physicalDisability">Physical Disability</label>
                  <Select value={editForm.physicalDisability} onValueChange={(val) => handleFormSelectChange("physicalDisability", val || "not_specified")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_specified">Not Specified / Not provided</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Academic & Admission Details Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <GraduationCap className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Academic & Admission Profile</h4>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="program">Academic Program</label>
                <SearchableProgramSelector
                  id="program"
                  programs={academicPrograms}
                  value={editForm.programId || editForm.program}
                  onChange={(p) => {
                    setEditForm(prev => ({
                      ...prev,
                      programId: p?.id || "",
                      program: p?.programName || ""
                    }));
                    setIsDirty(true);
                  }}
                  placeholder="Search and select academic program..."
                />
              </div>

              {/* Program Derived School & Override Option */}
              {(() => {
                const currentProgId = editForm.programId || editForm.program;
                const matchedProg = academicPrograms.find(p => p.id === currentProgId || p.programName === currentProgId || p.programCode === currentProgId);
                const defaultSchoolName = matchedProg?.schoolName || student?.school || "Not assigned yet";

                return (
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium text-[11px]">School / Department</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm(prev => ({ 
                            ...prev, 
                            isSchoolOverridden: !prev.isSchoolOverridden,
                            overrideSchoolId: !prev.isSchoolOverridden ? (prev.overrideSchoolId || schools[0]?.id || "") : ""
                          }));
                          setIsDirty(true);
                        }}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        {editForm.isSchoolOverridden ? "Use Program Default" : "Administrative Override"}
                      </button>
                    </div>

                    {!editForm.isSchoolOverridden ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Program Default School</span>
                          <span className="font-semibold text-foreground block break-words">
                            {defaultSchoolName}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">Auto-Inherited</Badge>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 border-t border-border/40">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-foreground" htmlFor="overrideSchoolId">
                            Override School / Department <span className="text-destructive">*</span>
                          </label>
                          <Select 
                            value={editForm.overrideSchoolId} 
                            onValueChange={(val) => {
                              setEditForm(prev => ({ ...prev, overrideSchoolId: val || "" }));
                              setIsDirty(true);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select alternative school..." />
                            </SelectTrigger>
                            <SelectContent>
                              {schools.filter(s => s.isActive).map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.code || "N/A"})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-foreground" htmlFor="schoolOverrideReason">
                            Override Justification <span className="text-destructive">*</span>
                          </label>
                          <Input
                            id="schoolOverrideReason"
                            placeholder="Institutional justification for override..."
                            value={editForm.schoolOverrideReason}
                            onChange={handleFormChange}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="admissionCategory">Admission Category</label>
                  <Select value={editForm.admissionCategory} onValueChange={(val) => handleFormSelectChange("admissionCategory", val || "")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select admission track..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMISSION_CATEGORY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="iccrApplicationNumber">
                    ICCR Application Number
                  </label>
                  <Input 
                    id="iccrApplicationNumber" 
                    placeholder="e.g. ICCR-2026-98124" 
                    value={editForm.iccrApplicationNumber} 
                    onChange={handleFormChange} 
                    className="h-9 text-sm font-mono" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="siiApplicationNumber">
                    Study in India (SII) Number
                  </label>
                  <Input 
                    id="siiApplicationNumber" 
                    placeholder="e.g. SII-2026-88192" 
                    value={editForm.siiApplicationNumber} 
                    onChange={handleFormChange} 
                    className="h-9 text-sm font-mono" 
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="nfsuCampus">
                    NFSU Campus
                  </label>
                  <Input 
                    id="nfsuCampus" 
                    placeholder="e.g. Delhi Campus, Gandhinagar Campus, Mumbai Campus" 
                    value={editForm.nfsuCampus} 
                    onChange={handleFormChange} 
                    className="h-9 text-sm" 
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="admissionAcademicYear">
                    Admission / Academic Year
                  </label>
                  <Input 
                    id="admissionAcademicYear" 
                    placeholder="e.g. 2024-25, 2025-26, 2026-27" 
                    value={editForm.admissionAcademicYear} 
                    onChange={handleFormChange} 
                    className="h-9 text-sm" 
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="feePaymentCategory">
                    Fee Payment Category / Funding Type
                  </label>
                  <Select 
                    value={editForm.feePaymentCategory || "not_specified"} 
                    onValueChange={(val) => handleFormSelectChange("feePaymentCategory", !val || val === "not_specified" ? "" : val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select funding type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_specified">Not Specified</SelectItem>
                      {FEE_PAYMENT_CATEGORY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground">
                    Tuition Fees
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input 
                        id="tuitionFeeAmount" 
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount (leave blank if not specified)" 
                        value={editForm.tuitionFeeAmount} 
                        onChange={handleFormChange} 
                        className="h-9 text-sm" 
                      />
                    </div>
                    <div>
                      <Select 
                        value={editForm.tuitionFeeCurrency || "INR"} 
                        onValueChange={(val) => handleFormSelectChange("tuitionFeeCurrency", val || "INR")}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEE_CURRENCY_OPTIONS.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground">
                    Hostel Fees
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input 
                        id="hostelFeeAmount" 
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount (leave blank if not specified)" 
                        value={editForm.hostelFeeAmount} 
                        onChange={handleFormChange} 
                        className="h-9 text-sm" 
                      />
                    </div>
                    <div>
                      <Select 
                        value={editForm.hostelFeeCurrency || "INR"} 
                        onValueChange={(val) => handleFormSelectChange("hostelFeeCurrency", val || "INR")}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEE_CURRENCY_OPTIONS.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {editForm.admissionCategory === "other" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="admissionCategoryOther">
                      Please specify Custom Admission Category <span className="text-destructive">*</span>
                    </label>
                    <Input 
                      id="admissionCategoryOther" 
                      placeholder="e.g. Bilateral Government Scholarship" 
                      value={editForm.admissionCategoryOther} 
                      onChange={handleFormChange} 
                      className="h-9 text-sm" 
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="admissionDate">Admission Date</label>
                  <DatePicker
                    id="admissionDate"
                    value={editForm.admissionDate}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, admissionDate: e.target.value }));
                      setIsDirty(true);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="expectedGraduation">Expected Graduation Date</label>
                  <DatePicker
                    id="expectedGraduation"
                    value={editForm.expectedGraduation}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, expectedGraduation: e.target.value }));
                      setIsDirty(true);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="status">Enrollment Status</label>
                  <Select value={editForm.status} onValueChange={(val) => handleFormSelectChange("status", val || "active")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="graduated">Graduated</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="academicStatus">Academic Standing</label>
                  <Select value={editForm.academicStatus} onValueChange={(val) => handleFormSelectChange("academicStatus", val || "good_standing")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good_standing">Good Standing</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1.5">
                <span className="text-[11px] text-muted-foreground block font-medium">Current Semester Progression</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground font-mono">Semester {student?.currentSemester || 1} of {student?.totalSemesters || 8}</span>
                  <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    Automatically Managed
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Calculated automatically from admission date and course structure. To record exceptions, use the <strong>Academic Adjustment</strong> workflow.
                </p>
              </div>
            </div>

            {/* Contact Coordinates Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Phone className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Contact & Residential Coordinates</h4>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="email">Institutional Email Address</label>
                <Input id="email" type="email" value={editForm.email} onChange={handleFormChange} className="h-9 text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="phoneHome">Home Country Phone</label>
                  <Input id="phoneHome" value={editForm.phoneHome} onChange={handleFormChange} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="phoneLocal">Local Host Phone</label>
                  <Input id="phoneLocal" value={editForm.phoneLocal} onChange={handleFormChange} className="h-9 text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="permanentAddress">Permanent Address</label>
                <Textarea id="permanentAddress" value={editForm.permanentAddress} onChange={handleFormChange} placeholder="e.g. 123 Main Street, Kathmandu, Nepal" className="min-h-16 text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="presentAddress">Present / Current Address</label>
                <Textarea id="presentAddress" value={editForm.presentAddress !== undefined ? editForm.presentAddress : editForm.localAddress} onChange={(e) => setEditForm(p => ({ ...p, presentAddress: e.target.value, localAddress: e.target.value }))} placeholder="e.g. Hostel Block B, NFSU Campus, Gandhinagar, Gujarat, India" className="min-h-16 text-sm" />
              </div>
            </div>

            {/* Family Details Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Users className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Family Information</h4>
              </div>

              {/* Father Details */}
              <div className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-3">
                <span className="text-xs font-bold text-foreground block">Father Details</span>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="fatherName">Father Full Name</label>
                  <Input id="fatherName" value={editForm.fatherName} onChange={handleFormChange} placeholder="e.g. Robert Smith" className="h-9 text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="fatherMobile">Father Mobile Number</label>
                    <Input id="fatherMobile" value={editForm.fatherMobile} onChange={handleFormChange} placeholder="e.g. +44 7911 123456" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="fatherWhatsapp">Father WhatsApp Number</label>
                    <Input id="fatherWhatsapp" value={editForm.fatherWhatsapp} onChange={handleFormChange} placeholder="e.g. +44 7911 123456" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="fatherEmail">Father Email ID</label>
                  <Input id="fatherEmail" type="email" value={editForm.fatherEmail} onChange={handleFormChange} placeholder="e.g. father@example.com" className="h-9 text-sm" />
                </div>
              </div>

              {/* Mother Details */}
              <div className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-3">
                <span className="text-xs font-bold text-foreground block">Mother Details</span>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="motherName">Mother Full Name</label>
                  <Input id="motherName" value={editForm.motherName} onChange={handleFormChange} placeholder="e.g. Sarah Smith" className="h-9 text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="motherMobile">Mother Mobile Number</label>
                    <Input id="motherMobile" value={editForm.motherMobile} onChange={handleFormChange} placeholder="e.g. +44 7911 654321" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="motherWhatsapp">Mother WhatsApp Number</label>
                    <Input id="motherWhatsapp" value={editForm.motherWhatsapp} onChange={handleFormChange} placeholder="e.g. +44 7911 654321" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="motherEmail">Mother Email ID</label>
                  <Input id="motherEmail" type="email" value={editForm.motherEmail} onChange={handleFormChange} placeholder="e.g. mother@example.com" className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* Emergency Liaison Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Emergency Liaison Contact</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactName">Contact Name</label>
                  <Input id="emergencyContactName" value={editForm.emergencyContactName} onChange={handleFormChange} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactRelation">Relationship Type</label>
                  <Select value={editForm.emergencyContactRelation} onValueChange={(val) => handleFormSelectChange("emergencyContactRelation", val || "parent")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactPhone">Primary Phone</label>
                  <Input id="emergencyContactPhone" value={editForm.emergencyContactPhone} onChange={handleFormChange} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactEmail">Email Address</label>
                  <Input id="emergencyContactEmail" type="email" value={editForm.emergencyContactEmail} onChange={handleFormChange} className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* Legal & Compliance Documents Quick Management */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Legal & Compliance Documents</h4>
                </div>
                <span className="text-[11px] text-muted-foreground">Passport, Visa, eFRRO</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Passport Card */}
                {(() => {
                  const hasPassport = isDocRecorded(student?.passport);
                  return (
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                            <FileText className="h-3.5 w-3.5 text-primary" /> Passport
                          </span>
                          <Badge variant="outline" className="text-[9px]">
                            {hasPassport ? (student?.passport?.versionLabel || "Original") : "Not Recorded"}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          {hasPassport ? `${student?.passport?.number} (Exp: ${student?.passport?.expiryDate ? AcademicProgressionEngine.formatDisplayDate(student.passport.expiryDate) : "—"})` : "No passport details added"}
                        </p>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        {!hasPassport ? (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => {
                              handleOpenAddDocDialog("passport");
                            }}
                            className="h-7 text-[11px] w-full gap-1 font-semibold"
                          >
                            <Plus className="h-3 w-3" /> Add Passport
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleOpenEditDocDialog("passport");
                              }}
                              className="h-7 text-[11px] flex-1 gap-1"
                            >
                              <Edit3 className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => {
                                handleOpenRenewDialog("passport");
                              }}
                              className="h-7 text-[11px] flex-1 gap-1 font-semibold"
                            >
                              <RefreshCw className="h-3 w-3" /> Renew
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Visa Card */}
                {(() => {
                  const hasVisa = isDocRecorded(student?.visa);
                  return (
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                            <FileCheck2 className="h-3.5 w-3.5 text-primary" /> Student Visa
                          </span>
                          <Badge variant="outline" className="text-[9px]">
                            {hasVisa ? (student?.visa?.versionLabel || "Original") : "Not Recorded"}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          {hasVisa ? `${student?.visa?.number} (Exp: ${student?.visa?.expiryDate ? AcademicProgressionEngine.formatDisplayDate(student.visa.expiryDate) : "—"})` : "No visa details added"}
                        </p>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        {!hasVisa ? (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => {
                              handleOpenAddDocDialog("visa");
                            }}
                            className="h-7 text-[11px] w-full gap-1 font-semibold"
                          >
                            <Plus className="h-3 w-3" /> Add Visa
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleOpenEditDocDialog("visa");
                              }}
                              className="h-7 text-[11px] flex-1 gap-1"
                            >
                              <Edit3 className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => {
                                handleOpenRenewDialog("visa");
                              }}
                              className="h-7 text-[11px] flex-1 gap-1 font-semibold"
                            >
                              <RefreshCw className="h-3 w-3" /> Renew
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* eFRRO Card */}
                {(() => {
                  const hasEfrro = isDocRecorded(student?.efrro);
                  return (
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> eFRRO / Permit
                          </span>
                          <Badge variant="outline" className="text-[9px]">
                            {hasEfrro ? (student?.efrro?.versionLabel || "Original") : "Not Recorded"}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          {hasEfrro ? `${student?.efrro?.number} (Exp: ${student?.efrro?.expiryDate ? AcademicProgressionEngine.formatDisplayDate(student.efrro.expiryDate) : "—"})` : "No eFRRO details added"}
                        </p>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        {!hasEfrro ? (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => {
                              handleOpenAddDocDialog("efrro");
                            }}
                            className="h-7 text-[11px] w-full gap-1 font-semibold"
                          >
                            <Plus className="h-3 w-3" /> Add eFRRO
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleOpenEditDocDialog("efrro");
                              }}
                              className="h-7 text-[11px] flex-1 gap-1"
                            >
                              <Edit3 className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => {
                                handleOpenRenewDialog("efrro");
                              }}
                              className="h-7 text-[11px] flex-1 gap-1 font-semibold"
                            >
                              <RefreshCw className="h-3 w-3" /> Renew
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Consular & Embassy Information Section */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                <Building className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Consular & Embassy Information</h4>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="embassyName">Consulate / Embassy Name</label>
                <Input 
                  id="embassyName" 
                  value={editForm.embassyName} 
                  onChange={handleFormChange} 
                  placeholder="e.g. Embassy of Germany / Consulate General"
                  className="h-9 text-sm" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="embassyAddress">Embassy / Consulate Address</label>
                <Textarea 
                  id="embassyAddress" 
                  value={editForm.embassyAddress} 
                  onChange={handleFormChange} 
                  placeholder="Street address, diplomatic enclave, postal details..."
                  className="min-h-16 text-sm" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="embassyCity">City</label>
                  <Input 
                    id="embassyCity" 
                    value={editForm.embassyCity} 
                    onChange={handleFormChange} 
                    placeholder="e.g. New Delhi / Mumbai"
                    className="h-9 text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="embassyCountry">Country</label>
                  <Input 
                    id="embassyCountry" 
                    value={editForm.embassyCountry} 
                    onChange={handleFormChange} 
                    placeholder="e.g. Germany"
                    className="h-9 text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="embassyPhone">Consular Phone Number</label>
                  <Input 
                    id="embassyPhone" 
                    value={editForm.embassyPhone} 
                    onChange={handleFormChange} 
                    placeholder="e.g. +91 11 4419 9199"
                    className="h-9 text-sm" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="embassyEmail">Consular Email</label>
                  <Input 
                    id="embassyEmail" 
                    type="email" 
                    value={editForm.embassyEmail} 
                    onChange={handleFormChange} 
                    placeholder="e.g. consular@embassy.de"
                    className="h-9 text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="embassyWebsite">Official Consular Website</label>
                <Input 
                  id="embassyWebsite" 
                  value={editForm.embassyWebsite} 
                  onChange={handleFormChange} 
                  placeholder="e.g. https://india.diplo.de"
                  className="h-9 text-sm" 
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => handleCloseDialog(false)}>Cancel</Button>
              <AsyncActionButton
                type="submit"
                size="sm"
                isLoading={isSaving}
                isSuccess={saveSuccess}
                isError={saveError}
                idleText="Save Details"
                loadingText="Saving changes..."
                successText="Changes saved"
                errorText="Try Again"
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ACADEMIC ADJUSTMENT DIALOG */}
      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent className="sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Record Academic Adjustment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAdjustment} className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground font-caption">
              Adjust progression for exceptional circumstances (repeating a semester, medical/academic leave, program transfer, or authorized override).
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="adjustmentType">
                Adjustment Type *
              </label>
              <Select 
                value={adjustmentForm.adjustmentType} 
                onValueChange={(val) => setAdjustmentForm(prev => ({ ...prev, adjustmentType: (val as "semester_override" | "semester_repeat" | "academic_leave" | "course_transfer" | "extension" | "admission_date_correction") || "semester_override" }))}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semester_override">Manual Semester Override</SelectItem>
                  <SelectItem value="semester_repeat">Repeat Semester</SelectItem>
                  <SelectItem value="academic_leave">Academic Leave / Break</SelectItem>
                  <SelectItem value="course_transfer">Course / Program Transfer</SelectItem>
                  <SelectItem value="extension">Course Extension</SelectItem>
                  <SelectItem value="admission_date_correction">Admission Date Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="adjustmentEffectiveDate">
                  Effective Date *
                </label>
                <DatePicker
                  id="adjustmentEffectiveDate"
                  value={adjustmentForm.effectiveDate}
                  onChange={(e) => {
                    setAdjustmentForm(prev => ({ ...prev, effectiveDate: e.target.value }));
                    setAdjustmentErrors(prev => ({ ...prev, effectiveDate: "" }));
                  }}
                  error={adjustmentErrors.effectiveDate}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="adjustedSemester">
                  Adjusted Semester *
                </label>
                <Input
                  id="adjustedSemester"
                  type="number"
                  min={1}
                  max={student?.totalSemesters || 20}
                  value={adjustmentForm.adjustedSemester}
                  onChange={(e) => setAdjustmentForm(prev => ({ ...prev, adjustedSemester: Number(e.target.value) }))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {adjustmentForm.adjustmentType === "course_transfer" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">New Academic Program *</label>
                <SearchableProgramSelector
                  id="adjustmentNewProgram"
                  programs={academicPrograms}
                  value={adjustmentForm.newProgramCode}
                  onChange={(p) => {
                    setAdjustmentForm(prev => ({
                      ...prev,
                      newProgramCode: p?.programCode || p?.programName || ""
                    }));
                  }}
                  placeholder="Select destination program..."
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="adjustmentReason">
                Reason for Adjustment *
              </label>
              <Textarea
                id="adjustmentReason"
                value={adjustmentForm.reason}
                onChange={(e) => {
                  setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }));
                  setAdjustmentErrors(prev => ({ ...prev, reason: "" }));
                }}
                placeholder="e.g. Approved for semester repeat following medical board review ref #MED-2026-89..."
                className={`min-h-16 text-xs rounded-xl ${adjustmentErrors.reason ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {adjustmentErrors.reason && (
                <p className="text-[10px] text-destructive font-caption font-medium">{adjustmentErrors.reason}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="adjustmentNotes">
                Additional Notes (Optional)
              </label>
              <Input
                id="adjustmentNotes"
                value={adjustmentForm.notes}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Dean Approval Ref #2026-44"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAdjustmentDialogOpen(false)} className="text-xs rounded-xl">
                Cancel
              </Button>
              <AsyncActionButton
                type="submit"
                size="sm"
                className="text-xs rounded-xl"
                isLoading={isSavingAdjustment}
                isSuccess={saveAdjustmentSuccess}
                isError={saveAdjustmentError}
                idleText="Record Adjustment"
                loadingText="Recording..."
                successText="Recorded"
                errorText="Try Again"
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ISCMS Unsaved Changes Confirmation Modal */}
      <ConfirmationDialog
        open={isConfirmDiscardOpen}
        title="Discard Unsaved Changes?"
        description="You have unsaved modifications in this student profile. Are you sure you want to discard your input?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="warning"
        icon="warning"
        onClose={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />

      {/* Add / Edit Document Dialog Modal */}
      <Dialog open={addEditDocDialogOpen} onOpenChange={setAddEditDocDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {addEditMode === "add" ? (
                <Plus className="h-4 w-4 text-primary" />
              ) : (
                <Edit3 className="h-4 w-4 text-primary" />
              )}
              {addEditMode === "add" ? "Add" : "Edit"}{" "}
              {addEditDocType === "passport"
                ? "Passport Details"
                : addEditDocType === "visa"
                ? "Student Visa Details"
                : "eFRRO / Permit Details"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {addEditMode === "add"
                ? "Enter original document details. This document will become the active original record in compliance tracking."
                : "Update or correct current document details without creating a new renewal."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAddEditDoc} className="space-y-4 pt-2">
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {addEditDocType === "passport" ? "Passport Number" : addEditDocType === "visa" ? "Visa Number" : "eFRRO Number"} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={addEditForm.documentNumber}
                  onChange={(e) => setAddEditForm(prev => ({ ...prev, documentNumber: e.target.value }))}
                  placeholder={addEditDocType === "passport" ? "e.g. A12345678" : addEditDocType === "visa" ? "e.g. V1234567" : "e.g. 24010198"}
                  className="h-9 text-xs font-mono"
                />
                {addEditErrors.documentNumber && (
                  <p className="text-[11px] text-destructive">{addEditErrors.documentNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Issue Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={addEditForm.issueDate}
                    onChange={(e) => setAddEditForm(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="h-9 text-xs"
                  />
                  {addEditErrors.issueDate && (
                    <p className="text-[11px] text-destructive">{addEditErrors.issueDate}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Expiration Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={addEditForm.expiryDate}
                    onChange={(e) => setAddEditForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="h-9 text-xs"
                  />
                  {addEditErrors.expiryDate && (
                    <p className="text-[11px] text-destructive">{addEditErrors.expiryDate}</p>
                  )}
                </div>
              </div>

              {addEditDocType === "passport" && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Place of Issue / Country (Optional)</label>
                  <Input
                    value={addEditForm.placeOfIssue}
                    onChange={(e) => setAddEditForm(prev => ({ ...prev, placeOfIssue: e.target.value }))}
                    placeholder="e.g. London, United Kingdom"
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {addEditDocType === "visa" && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Visa Classification / Type (Optional)</label>
                  <Input
                    value={addEditForm.visaType}
                    onChange={(e) => setAddEditForm(prev => ({ ...prev, visaType: e.target.value }))}
                    placeholder="e.g. Student (S-1)"
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Attach Document File (Optional - PDF or Image)</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setAddEditForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="h-9 text-xs file:text-xs file:font-semibold file:text-primary cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground">Document metadata can be saved without a physical file. Physical file can be attached anytime.</p>
              </div>

              {addEditMode === "edit" && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Reason for Update / Correction (Optional)</label>
                  <Input
                    value={addEditForm.reason}
                    onChange={(e) => setAddEditForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Corrected typo in expiry date"
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Administrative Notes (Optional)</label>
                <Textarea
                  value={addEditForm.notes}
                  onChange={(e) => setAddEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Document submitted upon arrival."
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddEditDocDialogOpen(false)}
                disabled={isSavingDoc}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingDoc}
                className="text-xs rounded-xl font-semibold gap-1.5"
              >
                {isSavingDoc ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {addEditMode === "add" ? <Plus className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                    {addEditMode === "add" ? "Save Original Details" : "Save Changes"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renew Document Dialog Modal */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Renew {renewDocType === "passport" ? "Passport" : renewDocType === "visa" ? "Student Visa" : "eFRRO / Permit"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record a renewed document version. The previous version will be preserved in history and this new version will become active immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRenew} className="space-y-4 pt-2">
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Document Number <span className="text-destructive">*</span>
                </label>
                <Input
                  value={renewForm.documentNumber}
                  onChange={(e) => setRenewForm(prev => ({ ...prev, documentNumber: e.target.value }))}
                  placeholder="e.g. A12345678"
                  className="h-9 text-xs"
                />
                {renewErrors.documentNumber && (
                  <p className="text-[11px] text-destructive">{renewErrors.documentNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Issue Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={renewForm.issueDate}
                    onChange={(e) => setRenewForm(prev => ({ ...prev, issueDate: e.target.value }))}
                    className="h-9 text-xs"
                  />
                  {renewErrors.issueDate && (
                    <p className="text-[11px] text-destructive">{renewErrors.issueDate}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Expiration Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={renewForm.expiryDate}
                    onChange={(e) => setRenewForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="h-9 text-xs"
                  />
                  {renewErrors.expiryDate && (
                    <p className="text-[11px] text-destructive">{renewErrors.expiryDate}</p>
                  )}
                </div>
              </div>

              {renewDocType === "passport" && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Place of Issue (Optional)</label>
                  <Input
                    value={renewForm.placeOfIssue}
                    onChange={(e) => setRenewForm(prev => ({ ...prev, placeOfIssue: e.target.value }))}
                    placeholder="e.g. London, United Kingdom"
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {renewDocType === "visa" && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Visa Category / Type (Optional)</label>
                  <Input
                    value={renewForm.visaType}
                    onChange={(e) => setRenewForm(prev => ({ ...prev, visaType: e.target.value }))}
                    placeholder="e.g. Student (S-1)"
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Attach Document File (Optional - PDF or Image)</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setRenewForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  className="h-9 text-xs file:text-xs file:font-semibold file:text-primary cursor-pointer"
                />
                <p className="text-[10px] text-muted-foreground">Stored securely in document storage with encrypted administrator access.</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Administrative Notes / Remarks (Optional)</label>
                <Textarea
                  value={renewForm.notes}
                  onChange={(e) => setRenewForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Received renewed document copy via university compliance email."
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/40">
              <Button type="button" variant="outline" size="sm" onClick={() => setRenewDialogOpen(false)} disabled={isRenewing} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isRenewing} className="text-xs rounded-xl font-semibold gap-1.5">
                {isRenewing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Recording Renewal...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Record Renewal
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Version History Modal */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              {historyDocType === "passport" ? "Passport" : historyDocType === "visa" ? "Student Visa" : "eFRRO / Permit"} Version History
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Complete chronological audit trail of all recorded document versions.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            {isLoadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Loading version history...</span>
              </div>
            ) : historyVersions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                No recorded version history for this document yet.
              </div>
            ) : (
              <div className="space-y-3">
                {historyVersions.map((ver) => (
                  <div
                    key={ver.id}
                    className={`p-4 rounded-xl border text-xs transition-colors ${
                      ver.isActive
                        ? "bg-primary/5 border-primary/30 shadow-xs"
                        : "bg-muted/10 border-border/40 opacity-90"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={ver.isActive ? "default" : "outline"}
                          className={`text-xs font-bold ${
                            ver.isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {ver.versionLabel}
                        </Badge>
                        {ver.isActive && (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                            Current Active
                          </Badge>
                        )}
                        {!ver.isActive && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Historical / Superseded
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Recorded: {AcademicProgressionEngine.formatDisplayDate(ver.recordedDate)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Document Number</span>
                        <span className="font-semibold text-foreground font-mono">{ver.documentNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Issue Date</span>
                        <span className="font-medium text-foreground">{AcademicProgressionEngine.formatDisplayDate(ver.issueDate)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Expiry Date</span>
                        <span className="font-medium text-foreground">{AcademicProgressionEngine.formatDisplayDate(ver.expiryDate)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Attachment</span>
                        {ver.fileDownloadUrl ? (
                          <a
                            href={ver.fileDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[11px]"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View File
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">No file attached</span>
                        )}
                      </div>
                    </div>

                    {(ver.placeOfIssue || ver.visaType || ver.notes) && (
                      <div className="mt-2.5 pt-2 border-t border-border/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        {ver.placeOfIssue && (
                          <div>
                            <span className="text-muted-foreground">Place of Issue: </span>
                            <span className="text-foreground">{ver.placeOfIssue}</span>
                          </div>
                        )}
                        {ver.visaType && (
                          <div>
                            <span className="text-muted-foreground">Visa Category: </span>
                            <span className="text-foreground">{ver.visaType}</span>
                          </div>
                        )}
                        {ver.notes && (
                          <div className="sm:col-span-2">
                            <span className="text-muted-foreground">Notes: </span>
                            <span className="text-foreground italic">{ver.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={() => setHistoryDialogOpen(false)} className="text-xs rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Reminder Dispatch Preview & Confirmation Modal */}
      <DispatchReminderDialog
        isOpen={dispatchDialogState.isOpen}
        onClose={closeDispatchDialog}
        studentId={studentId}
        docType={dispatchDialogState.docType}
        thresholdDays={dispatchDialogState.thresholdDays}
        ruleId={dispatchDialogState.ruleId}
        ruleName={dispatchDialogState.ruleName}
        onDispatched={async () => {
          await loadReminderSchedule();
        }}
      />
    </div>
  );
}
