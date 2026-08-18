"use client";

import * as React from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Globe, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Check, 
  X,
  Building,
  Loader2,
  Bell,
  Calendar,
  Send,
  RotateCw,
  ExternalLink,
  Edit3,
  ShieldCheck,
  CalendarDays,
  Clock,
  History,
  UploadCloud,
  SlidersHorizontal,
  Sparkles,
  Layers,
  GraduationCap,
  Info
} from "lucide-react";
import { 
  getStudentDetailsAction, 
  updateStudentAction, 
  updateDocumentVerificationAction,
  updateDocumentMetadataAction,
  updateExpiryDateAction,
  getStudentReminderScheduleAction,
  triggerReminderDispatchAction,
  recordAcademicAdjustmentAction
} from "@/app/(app)/students/actions";
import { AcademicProgressionEngine } from "@/domain/academic/services/semester-progression.service";
import { CountryFlag } from "@/components/ui/country-flag";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RejectionDialog } from "@/components/ui/rejection-dialog";
import { getActiveAcademicProgramsAction } from "@/app/(app)/settings/academic-programs-actions";
import { AcademicProgram, getAcademicLevelLabel } from "@/domain/academic-programs/types";
import { CalendarDateEngine } from "@/domain/notifications/services/calendar-date";
import { ExpiryReminderEngine } from "@/domain/notifications/services/reminder-engine.service";
import { 
  StudentReminderScheduleResponse, 
  ReminderStatus 
} from "@/domain/notifications/types/reminder.types";
import { DocumentUploadDialog, AllowEarlyUploadDialog } from "@/features/compliance/components/document-dialogs";
import { DispatchReminderDialog } from "@/features/compliance/components/dispatch-reminder-dialog";
import { DOCUMENT_CONFIGS, getDocumentTheme } from "@/features/compliance/constants/constants";
import { StudentDocumentCard } from "@/features/compliance/components/student-document-card";
import { DocumentReminderSchedule } from "@/features/compliance/components/document-reminder-schedule";
import { ProfileCompletionEngine, ProfileCompletionResult } from "@/domain/students/services/profile-completion.service";

export interface StudentDocument {
  number: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue?: string;
  visaType?: string;
  versionNumber?: number | null;
  verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected";
  hasUploadedDocument: boolean;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  filePath?: string | null;
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
  programName: string;
  programCode: string;
  academicLevel?: string | null;
  academicLevelLabel?: string | null;
  school: string;
  admissionDate: string;
  expectedGraduation: string;
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
  const [activeSubTab, setActiveSubTab] = React.useState<"immigration" | "academic" | "contact">("immigration");

  // Academic Programs State
  const [academicPrograms, setAcademicPrograms] = React.useState<AcademicProgram[]>([]);

  // Expiry-Driven Reminder Schedule State
  const [reminderSchedule, setReminderSchedule] = React.useState<StudentReminderScheduleResponse | null>(null);
  const [selectedReminderDoc, setSelectedReminderDoc] = React.useState<"passport" | "visa" | "efrro">("passport");
  const [isLoadingReminders, setIsLoadingReminders] = React.useState(true);
  const [isDispatchingReminder, setIsDispatchingReminder] = React.useState<string | null>(null);

  // Unsaved Changes Confirmation Dialog State
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = React.useState(false);

  // Document Rejection Dialog State
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [rejectDocType, setRejectDocType] = React.useState<"passport" | "visa" | "efrro" | null>(null);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [approvingDocType, setApprovingDocType] = React.useState<"passport" | "visa" | "efrro" | null>(null);

  // Renewal / New Version Upload Dialog State
  const [isRenewalUploadOpen, setIsRenewalUploadOpen] = React.useState(false);
  const [renewalDocType, setRenewalDocType] = React.useState<"passport" | "visa" | "efrro" | null>(null);

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

  const openRenewalDialog = (docType: "passport" | "visa" | "efrro") => {
    setRenewalDocType(docType);
    setIsRenewalUploadOpen(true);
  };

  // Staff Early Document Upload Exception Dialog State
  const [isEarlyUploadDialogOpen, setIsEarlyUploadDialogOpen] = React.useState(false);
  const [earlyUploadDocType, setEarlyUploadDocType] = React.useState<"passport" | "visa" | "efrro" | null>(null);

  // First-Class "Update Expiry Date" Dialog State
  const [isExpiryDialogOpen, setIsExpiryDialogOpen] = React.useState(false);
  const [expiryDocType, setExpiryDocType] = React.useState<"passport" | "visa" | "efrro" | null>(null);
  const [currentDocNumberDisplay, setCurrentDocNumberDisplay] = React.useState("");
  const [currentVersionNumberDisplay, setCurrentVersionNumberDisplay] = React.useState(1);
  const [currentIssueDateDisplay, setCurrentIssueDateDisplay] = React.useState("");
  const [currentExpiryDateDisplay, setCurrentExpiryDateDisplay] = React.useState("");
  const [expiryIssueDate, setExpiryIssueDate] = React.useState("");
  const [newExpiryDate, setNewExpiryDate] = React.useState("");
  const [expiryReason, setExpiryReason] = React.useState("");
  const [expiryErrors, setExpiryErrors] = React.useState<Record<string, string>>({});
  const [isSavingExpiry, setIsSavingExpiry] = React.useState(false);
  const [saveExpirySuccess, setSaveExpirySuccess] = React.useState(false);
  const [saveExpiryError, setSaveExpiryError] = React.useState(false);

  // Document Metadata Update Dialog State
  const [isDocMetadataOpen, setIsDocMetadataOpen] = React.useState(false);
  const [editingDocType, setEditingDocType] = React.useState<"passport" | "visa" | "efrro" | null>(null);
  const [docMetadataForm, setDocMetadataForm] = React.useState({
    documentNumber: "",
    placeOfIssue: "",
    visaType: "Student (S-1)",
    issueDate: "",
    expiryDate: "",
    changeReason: ""
  });
  const [docMetadataErrors, setDocMetadataErrors] = React.useState<Record<string, string>>({});
  const [isSavingDocMetadata, setIsSavingDocMetadata] = React.useState(false);
  const [saveDocSuccess, setSaveDocSuccess] = React.useState(false);
  const [saveDocError, setSaveDocError] = React.useState(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudentData();
    loadReminderSchedule();
  }, [loadStudentData, loadReminderSchedule]);

  React.useEffect(() => {
    async function loadPrograms() {
      const res = await getActiveAcademicProgramsAction();
      if (res.success && res.programs) {
        setAcademicPrograms(res.programs);
      }
    }
    loadPrograms();
  }, []);

  // Edit Profile States
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    registrationNumber: "",
    fullName: "",
    email: "",
    program: "",
    phoneHome: "",
    phoneLocal: "",
    permanentAddress: "",
    localAddress: "",
    currentSemester: 1,
    academicStatus: "good_standing" as StudentProfile["academicStatus"],
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
        program: student.programName || student.programCode || "",
        phoneHome: student.phoneHome,
        phoneLocal: student.phoneLocal || "",
        permanentAddress: student.permanentAddress,
        localAddress: student.localAddress || "",
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
      dateOfBirth: null,
      gender: null,
      programCode: student.programCode,
      admissionDate: student.admissionDate,
      expectedGraduation: student.expectedGraduation,
      email: student.email,
      phoneHome: student.phoneHome,
      permanentAddress: student.permanentAddress,
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

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      const res = await updateStudentAction(studentId, {
        registrationNumber: editForm.registrationNumber?.trim() || null,
        fullName: editForm.fullName.trim(),
        email: editForm.email?.trim() || undefined,
        phoneHome: editForm.phoneHome?.trim() || undefined,
        phoneLocal: editForm.phoneLocal?.trim() || undefined,
        permanentAddress: editForm.permanentAddress?.trim() || undefined,
        localAddress: editForm.localAddress?.trim() || undefined,
        programCode: editForm.program?.trim() || undefined,
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

  // FIRST-CLASS "UPDATE EXPIRY DATE" HANDLERS
  const openExpiryDialog = (docType: "passport" | "visa" | "efrro") => {
    if (!student) return;
    const doc = docType === "passport" ? student.passport : docType === "visa" ? student.visa : student.efrro;
    
    setExpiryDocType(docType);
    setCurrentDocNumberDisplay(doc?.number && doc.number !== "Not provided" && doc.number !== "Not Recorded" ? doc.number : "Not Recorded");
    setCurrentVersionNumberDisplay(doc?.versionNumber || 1);
    setCurrentIssueDateDisplay(doc?.issueDate ? formatDisplayDate(doc.issueDate) : "Not Recorded");
    setCurrentExpiryDateDisplay(doc?.expiryDate ? formatDisplayDate(doc.expiryDate) : "Not Recorded");
    setExpiryIssueDate(doc?.issueDate ? doc.issueDate.split("T")[0] : "");
    setNewExpiryDate(doc?.expiryDate ? doc.expiryDate.split("T")[0] : "");
    setExpiryReason("");
    setExpiryErrors({});
    setIsExpiryDialogOpen(true);
  };

  const handleSaveExpiryDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiryDocType || !student) return;

    const errors: Record<string, string> = {};

    if (!expiryIssueDate || !expiryIssueDate.trim()) {
      errors.expiryIssueDate = "An issue date is required before updating the expiration date.";
    }

    if (!newExpiryDate || !newExpiryDate.trim()) {
      errors.newExpiryDate = "Please select a valid expiration date.";
    } else if (expiryIssueDate && new Date(newExpiryDate.trim()) <= new Date(expiryIssueDate.trim())) {
      errors.newExpiryDate = `The new expiration date must be strictly after the document issue date (${formatDisplayDate(expiryIssueDate)}).`;
    }

    if (!expiryReason || !expiryReason.trim()) {
      errors.expiryReason = "A reason for modifying the expiration date is required for compliance audit logging.";
    }

    if (Object.keys(errors).length > 0) {
      setExpiryErrors(errors);
      toast.error("Validation Error", { description: "Please resolve the highlighted field errors." });
      return;
    }

    setIsSavingExpiry(true);
    setSaveExpirySuccess(false);
    setSaveExpiryError(false);

    try {
      const docLabel = expiryDocType === "passport" ? "Passport" : expiryDocType === "visa" ? "Visa" : "eFRRO";
      const res = await updateExpiryDateAction({
        studentId,
        documentType: expiryDocType,
        newExpiryDate: newExpiryDate.trim(),
        issueDate: expiryIssueDate.trim(),
        reason: expiryReason.trim()
      });

      if (res.success) {
        setSaveExpirySuccess(true);
        toast.success(`${docLabel} Expiry Updated`, {
          description: `${docLabel} expiration date updated to ${formatDisplayDate(newExpiryDate)}. Reminder schedule recalculated.`
        });
        await Promise.all([loadStudentData(), loadReminderSchedule()]);
        setTimeout(() => {
          setIsExpiryDialogOpen(false);
          setExpiryDocType(null);
        }, 600);
      } else {
        setSaveExpiryError(true);
        toast.error("Update Failed", { description: res.error || `Unable to update ${docLabel} expiration date.` });
      }
    } catch (err) {
      setSaveExpiryError(true);
      toast.error("Database Error", {
        description: err instanceof Error ? err.message : "Unable to communicate with database."
      });
    } finally {
      setIsSavingExpiry(false);
    }
  };

  // FULL METADATA UPDATE HANDLERS
  const openDocMetadataDialog = (docType: "passport" | "visa" | "efrro") => {
    if (!student) return;
    const doc = docType === "passport" ? student.passport : docType === "visa" ? student.visa : student.efrro;
    
    setEditingDocType(docType);
    setDocMetadataForm({
      documentNumber: doc?.number && doc.number !== "Not provided" && doc.number !== "Not Recorded" ? doc.number : "",
      placeOfIssue: doc?.placeOfIssue || "",
      visaType: doc?.visaType || "Student (S-1)",
      issueDate: doc?.issueDate ? doc.issueDate.split("T")[0] : "",
      expiryDate: doc?.expiryDate ? doc.expiryDate.split("T")[0] : "",
      changeReason: ""
    });
    setDocMetadataErrors({});
    setIsDocMetadataOpen(true);
  };

  const handleSaveDocMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocType) return;

    const errors: Record<string, string> = {};
    if (!docMetadataForm.documentNumber.trim()) {
      errors.documentNumber = "Document number is required.";
    }
    if (!docMetadataForm.issueDate.trim()) {
      errors.issueDate = "Issue date is required.";
    }
    if (!docMetadataForm.expiryDate.trim()) {
      errors.expiryDate = "Expiration date is required.";
    } else if (docMetadataForm.issueDate.trim() && new Date(docMetadataForm.expiryDate) <= new Date(docMetadataForm.issueDate)) {
      errors.expiryDate = "Expiration date must be strictly after the issue date.";
    }

    if (!docMetadataForm.changeReason.trim()) {
      errors.changeReason = "A mandatory reason for correction is required for compliance audit logs.";
    }

    if (Object.keys(errors).length > 0) {
      setDocMetadataErrors(errors);
      toast.error("Validation Error", { description: "Please correct the highlighted fields before saving." });
      return;
    }

    setIsSavingDocMetadata(true);
    setSaveDocSuccess(false);
    setSaveDocError(false);

    try {
      const res = await updateDocumentMetadataAction({
        studentId,
        documentType: editingDocType,
        documentNumber: docMetadataForm.documentNumber.trim(),
        issueDate: docMetadataForm.issueDate.trim(),
        expiryDate: docMetadataForm.expiryDate.trim(),
        placeOfIssue: editingDocType === "passport" ? docMetadataForm.placeOfIssue.trim() : undefined,
        visaType: editingDocType === "visa" ? docMetadataForm.visaType.trim() : undefined,
        changeReason: docMetadataForm.changeReason.trim()
      });

      if (res.success) {
        setSaveDocSuccess(true);
        toast.success("Document Information Corrected", {
          description: `Active document record updated in-place and reminder schedule synchronized for ${editingDocType.toUpperCase()}.`
        });
        await Promise.all([loadStudentData(), loadReminderSchedule()]);
        setTimeout(() => {
          setIsDocMetadataOpen(false);
          setEditingDocType(null);
        }, 600);
      } else {
        setSaveDocError(true);
        toast.error("Correction Failed", { description: res.error || "Unable to update document details." });
      }
    } catch (err) {
      setSaveDocError(true);
      toast.error("Database Error", {
        description: err instanceof Error ? err.message : "Unable to communicate with database."
      });
    } finally {
      setIsSavingDocMetadata(false);
    }
  };

  // Verification & Rejection Handlers
  const handleOpenRejectDialog = (docType: "passport" | "visa" | "efrro") => {
    setRejectDocType(docType);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmRejection = async (reason: string) => {
    if (!rejectDocType) return;
    setIsRejecting(true);
    try {
      const res = await updateDocumentVerificationAction(
        studentId,
        rejectDocType,
        null,
        "rejected",
        reason
      );

      if (res.success) {
        toast.success("Document Rejected", {
          description: "Document marked as rejected and audit entry logged."
        });
        setIsRejectDialogOpen(false);
        setRejectDocType(null);
        await Promise.all([loadStudentData(), loadReminderSchedule()]);
      } else {
        toast.error("Rejection Failed", {
          description: res.error || "Unable to update document verification status."
        });
      }
    } catch (err) {
      toast.error("Database Error", {
        description: err instanceof Error ? err.message : "Unable to communicate with database."
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApproveDocument = async (docType: "passport" | "visa" | "efrro") => {
    setApprovingDocType(docType);
    try {
      const res = await updateDocumentVerificationAction(
        studentId,
        docType,
        null,
        "verified",
        undefined
      );

      if (res.success) {
        toast.success("Document Approved", {
          description: "Document verified successfully. Compliance standing updated."
        });
        await Promise.all([loadStudentData(), loadReminderSchedule()]);
      } else {
        toast.error("Verification Update Failed", {
          description: res.error || "Unable to update document verification status."
        });
      }
    } catch (err) {
      toast.error("Database Error", {
        description: err instanceof Error ? err.message : "Unable to communicate with database."
      });
    } finally {
      setApprovingDocType(null);
    }
  };

  const handleManualDispatch = async (docType: "passport" | "visa" | "efrro", thresholdDays: number, ruleId: string) => {
    setIsDispatchingReminder(ruleId);
    try {
      const res = await triggerReminderDispatchAction(studentId, docType, thresholdDays);
      if (res.success) {
        toast.success("Reminder Alert Dispatched", {
          description: `Dispatched ${thresholdDays}-day reminder for ${docType.toUpperCase()}.`
        });
        await loadReminderSchedule();
      } else {
        toast.error("Dispatch Failed", {
          description: res.error || "Unable to dispatch reminder notification."
        });
      }
    } catch (err) {
      toast.error("Dispatch Error", {
        description: err instanceof Error ? err.message : "Failed to dispatch reminder."
      });
    } finally {
      setIsDispatchingReminder(null);
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

  const getDocStatusIcon = (doc: StudentDocument, daysLeft?: number) => {
    if (!doc.hasUploadedDocument || doc.verificationStatus === "not_uploaded") {
      return <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/40 shrink-0" />;
    }
    if (doc.verificationStatus === "rejected") {
      return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    }
    if (doc.verificationStatus === "pending") {
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    if (daysLeft !== undefined && daysLeft < 0) {
      return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    }
    if (daysLeft !== undefined && daysLeft <= 30) {
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
  };

  const getReminderStatusBadge = (status: ReminderStatus, statusLabel?: string) => {
    switch (status) {
      case "DISPATCHED":
        return (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
            {statusLabel || "Dispatched"}
          </Badge>
        );
      case "DUE":
        if (statusLabel === "Passed") {
          return (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-4 text-muted-foreground/80 border-border/50 bg-muted/20 font-normal">
              Passed
            </Badge>
          );
        }
        if (statusLabel === "Due Today") {
          return (
            <Badge 
              variant="outline" 
              className="text-[9px] px-1.5 py-0.5 h-4 bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/50 font-bold animate-pulse"
            >
              Due Today
            </Badge>
          );
        }
        return (
          <Badge 
            variant="outline" 
            className={`text-[9px] px-1.5 py-0.5 h-4 ${
              statusLabel === "Due Now" 
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold" 
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
            }`}
          >
            {statusLabel || "Due"}
          </Badge>
        );
      case "FAILED":
        return <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 h-4 font-medium">Failed</Badge>;
      case "EXPIRED":
        return (
          <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 h-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">
            {statusLabel === "Passed" ? "Passed" : "Expired"}
          </Badge>
        );
      case "CANCELLED":
        return <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-4 text-muted-foreground border-border/60 bg-muted/20">Cancelled</Badge>;
      case "NOT_APPLICABLE":
        return <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-4 text-muted-foreground border-border/60">Not Available</Badge>;
      case "NOT_DUE":
      default:
        return <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 h-4 text-muted-foreground/80 border-border/50">Scheduled</Badge>;
    }
  };

  const formatDisplayDate = (dateStr?: string | null) => {
    if (!dateStr || dateStr.trim() === "" || dateStr === "Not provided" || dateStr === "Not Recorded") {
      return "Not provided";
    }
    return CalendarDateEngine.formatDateDisplay(dateStr);
  };

  const renderExpiryHealthBadge = (expiryDate?: string | null, daysRemaining?: number | null) => {
    if (!expiryDate || expiryDate === "Not provided" || expiryDate === "Not Recorded") {
      return (
        <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground border-border/60 bg-muted/20">
          No Expiry Recorded
        </Badge>
      );
    }

    const health = CalendarDateEngine.getExpiryHealth(daysRemaining);
    return (
      <Badge variant={health.badgeVariant} className={`text-[10px] h-5 font-medium ${health.colorClass}`}>
        {health.label}
      </Badge>
    );
  };

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
        <div className="flex items-center gap-2 shrink-0">
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
        {/* Left 2 Cols: Tabbed Content & Immigration Documents */}
        <div className="lg:col-span-2 space-y-6 w-full max-w-full min-w-0">
          {/* Sub-tabs for detailed drill-down */}
          <div className="flex border-b border-border/60 overflow-x-auto w-full max-w-full min-w-0">
            <button
              onClick={() => setActiveSubTab("immigration")}
              className={`py-2 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeSubTab === "immigration"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Legal & Immigration Papers
            </button>
            <button
              onClick={() => setActiveSubTab("academic")}
              className={`py-2 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeSubTab === "academic"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Academic Profile
            </button>
            <button
              onClick={() => setActiveSubTab("contact")}
              className={`py-2 px-4 text-xs font-medium border-b-2 transition-colors ${
                activeSubTab === "contact"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Contact & Addresses
            </button>
          </div>

          {/* Tab 1: Immigration Documents */}
          {activeSubTab === "immigration" && (
            <div className="space-y-5">
              {/* PASSPORT DOCUMENT CARD */}
              <StudentDocumentCard
                documentType="passport"
                title="PASSPORT DOCUMENT"
                description="Official primary international identity document."
                studentId={student.id}
                documentNumber={student.passport.number}
                issueDate={student.passport.issueDate}
                expiryDate={student.passport.expiryDate}
                placeOfIssue={student.passport.placeOfIssue}
                versionNumber={student.passport.versionNumber}
                verificationStatus={student.passport.verificationStatus}
                hasUploadedDocument={student.passport.hasUploadedDocument}
                verifiedAt={student.passport.verifiedAt}
                verifiedBy={student.passport.verifiedBy}
                rejectionReason={student.passport.rejectionReason}
                daysToExpiry={student.daysToPassportExpiry}
                activeEarlyAuthorization={student.passport.activeEarlyAuthorization}
                onUploadRenewalClick={() => openRenewalDialog("passport")}
                onCorrectExpiryClick={() => openExpiryDialog("passport")}
                onCorrectMetadataClick={() => openDocMetadataDialog("passport")}
                onAllowEarlyUploadClick={() => {
                  setEarlyUploadDocType("passport");
                  setIsEarlyUploadDialogOpen(true);
                }}
                onApproveClick={() => handleApproveDocument("passport")}
                onRejectClick={() => handleOpenRejectDialog("passport")}
                isApproving={approvingDocType === "passport"}
                isRejecting={isRejecting && rejectDocType === "passport"}
              />

              {/* VISA DOCUMENT CARD */}
              <StudentDocumentCard
                documentType="visa"
                title="VISA DOCUMENT"
                description="Verification of active Student Visa validity."
                studentId={student.id}
                documentNumber={student.visa.number}
                issueDate={student.visa.issueDate}
                expiryDate={student.visa.expiryDate}
                visaType={student.visa.visaType}
                versionNumber={student.visa.versionNumber}
                verificationStatus={student.visa.verificationStatus}
                hasUploadedDocument={student.visa.hasUploadedDocument}
                verifiedAt={student.visa.verifiedAt}
                verifiedBy={student.visa.verifiedBy}
                rejectionReason={student.visa.rejectionReason}
                daysToExpiry={student.daysToVisaExpiry}
                activeEarlyAuthorization={student.visa.activeEarlyAuthorization}
                onUploadRenewalClick={() => openRenewalDialog("visa")}
                onCorrectExpiryClick={() => openExpiryDialog("visa")}
                onCorrectMetadataClick={() => openDocMetadataDialog("visa")}
                onAllowEarlyUploadClick={() => {
                  setEarlyUploadDocType("visa");
                  setIsEarlyUploadDialogOpen(true);
                }}
                onApproveClick={() => handleApproveDocument("visa")}
                onRejectClick={() => handleOpenRejectDialog("visa")}
                isApproving={approvingDocType === "visa"}
                isRejecting={isRejecting && rejectDocType === "visa"}
              />

              {/* EFRRO REGISTRATION CARD */}
              {student.efrro ? (
                <StudentDocumentCard
                  documentType="efrro"
                  title="eFRRO / RESIDENTIAL PERMIT"
                  description="Local registration status with Indian Immigration services."
                  studentId={student.id}
                  documentNumber={student.efrro.number}
                  issueDate={student.efrro.issueDate}
                  expiryDate={student.efrro.expiryDate}
                  versionNumber={student.efrro.versionNumber}
                  verificationStatus={student.efrro.verificationStatus}
                  hasUploadedDocument={student.efrro.hasUploadedDocument}
                  verifiedAt={student.efrro.verifiedAt}
                  verifiedBy={student.efrro.verifiedBy}
                  rejectionReason={student.efrro.rejectionReason}
                  daysToExpiry={student.daysToEfrroExpiry}
                  activeEarlyAuthorization={student.efrro.activeEarlyAuthorization}
                  onUploadRenewalClick={() => openRenewalDialog("efrro")}
                  onCorrectExpiryClick={() => openExpiryDialog("efrro")}
                  onCorrectMetadataClick={() => openDocMetadataDialog("efrro")}
                  onAllowEarlyUploadClick={() => {
                    setEarlyUploadDocType("efrro");
                    setIsEarlyUploadDialogOpen(true);
                  }}
                  onApproveClick={() => handleApproveDocument("efrro")}
                  onRejectClick={() => handleOpenRejectDialog("efrro")}
                  isApproving={approvingDocType === "efrro"}
                  isRejecting={isRejecting && rejectDocType === "efrro"}
                />
              ) : (
                <Card className="border border-border/60 shadow-sm bg-muted/10 p-6 text-center">
                  <Globe className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="font-medium text-sm text-foreground">eFRRO Exemption Active</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 font-caption">
                    Based on international bilateral treaties, students from {student.nationalityName} are exempted from mandatory eFRRO Residential Permit filings.
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Academic Profile */}
          {activeSubTab === "academic" && (
            <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Academic Standing & Semester Progression
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Automated curriculum progression, enrollment timeline, and adjustment history.
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block text-[11px] font-medium">Enrollment Number</span>
                    <span className="font-semibold text-foreground block font-mono">
                      {student.registrationNumber && student.registrationNumber !== "Not provided" ? student.registrationNumber : "Not provided"}
                    </span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block text-[11px] font-medium">Registered School</span>
                    <span className="font-semibold text-foreground block">{student.school}</span>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block text-[11px] font-medium">Program Curriculum</span>
                    <span className="font-semibold text-foreground block">{student.programName}</span>
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span className="text-[10px] font-mono text-muted-foreground block">Code: {student.programCode}</span>
                      {student.academicLevelLabel && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                          {student.academicLevelLabel}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block text-[11px] font-medium">Curriculum Structure</span>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{student.totalSemesters || 8} Semesters</span>
                      <span className="text-muted-foreground text-[11px] font-normal">({student.semesterDuration || 6} {student.semesterDurationUnit || "mo"}/sem)</span>
                    </div>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block text-[11px] font-medium">Admission Date</span>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{AcademicProgressionEngine.formatDisplayDate(student.admissionDate)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="text-muted-foreground block text-[11px] font-medium">Current Semester</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground font-mono">
                        Semester {student.currentSemester} of {student.totalSemesters || 8}
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30 flex items-center gap-1 px-1.5 py-0.5">
                        <Sparkles className="h-2.5 w-2.5" />
                        Automatically calculated
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Automatically calculated from admission date ({AcademicProgressionEngine.formatDisplayDate(student.admissionDate)}) and {student.semesterDuration || 6}-{student.semesterDurationUnit || "month"} intervals.
                    </p>
                  </div>

                  <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-muted-foreground block text-[11px] font-medium">Expected Graduation</span>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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

          {/* Contact Details */}
          {activeSubTab === "contact" && (
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Contact & Host Country Address</CardTitle>
                <CardDescription className="text-[10px] font-caption">Home country addresses and temporary host coordinates.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Institutional Email</span>
                    <span className="font-semibold text-foreground block">{student.email}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Home Country Phone</span>
                    <span className="font-semibold text-foreground block">{student.phoneHome}</span>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-muted-foreground block font-caption">Local Phone (Host)</span>
                    <span className="font-semibold text-foreground block">{student.phoneLocal || "Not provided"}</span>
                  </div>
                </div>

                <Separator />
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Permanent Home Address</span>
                    <span className="font-medium text-foreground block leading-relaxed">{student.permanentAddress}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Local Address (Host Country Hostel/Rent)</span>
                    <span className="font-medium text-foreground block leading-relaxed">{student.localAddress || "Not provided"}</span>
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
                  <p className="text-[10px] text-muted-foreground">
                    Administrators can update the mobile number or disable portal access via the Edit Profile action.
                  </p>
                </div>
              </CardContent>
            </Card>
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

      {/* FIRST-CLASS "UPDATE EXPIRY DATE" DIALOG */}
      <Dialog open={isExpiryDialogOpen} onOpenChange={setIsExpiryDialogOpen}>
        <DialogContent className="sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Update {expiryDocType ? expiryDocType.toUpperCase() : "Document"} Expiration Date
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveExpiryDate} className="space-y-4 py-2 text-xs">
            {/* Current Document Summary Card */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-caption uppercase tracking-wider font-semibold">
                  Current Active Document
                </span>
                <Badge variant="outline" className="text-[9px] h-4 font-mono">
                  v{currentVersionNumberDisplay}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-caption block">Document Number</span>
                  <span className="font-mono font-semibold text-foreground">{currentDocNumberDisplay}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-caption block">Current Expiry</span>
                  <span className="font-mono font-semibold text-foreground">{currentExpiryDateDisplay}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground font-caption block">Current Issue Date</span>
                  <span className="font-medium text-foreground">{currentIssueDateDisplay}</span>
                </div>
              </div>
            </div>

            {/* Document Issue Date (Preserved or Required) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground" htmlFor="expiryIssueDate">
                  Document Issue Date *
                </label>
                <span className="text-[10px] text-muted-foreground font-caption">
                  {currentIssueDateDisplay !== "Not Recorded" ? "(Preserved from active record)" : "(Required to validate expiry)"}
                </span>
              </div>
              <DatePicker
                id="expiryIssueDate"
                value={expiryIssueDate}
                onChange={(e) => {
                  setExpiryIssueDate(e.target.value);
                  setExpiryErrors(prev => ({ ...prev, expiryIssueDate: "", newExpiryDate: "" }));
                }}
                error={expiryErrors.expiryIssueDate}
                placeholder="Select document issue date..."
              />
              {expiryErrors.expiryIssueDate && (
                <p className="text-[10px] text-destructive font-caption font-medium">{expiryErrors.expiryIssueDate}</p>
              )}
            </div>

            {/* New Expiration Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="newExpiryDate">
                New Expiration Date *
              </label>
              <DatePicker
                id="newExpiryDate"
                value={newExpiryDate}
                onChange={(e) => {
                  setNewExpiryDate(e.target.value);
                  setExpiryErrors(prev => ({ ...prev, newExpiryDate: "" }));
                }}
                error={expiryErrors.newExpiryDate}
                placeholder="Select new expiration date..."
              />
              {expiryErrors.newExpiryDate && (
                <p className="text-[10px] text-destructive font-caption font-medium">{expiryErrors.newExpiryDate}</p>
              )}
            </div>

            {/* Mandatory Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="expiryReason">
                Reason for Expiry Modification *
              </label>
              <Textarea
                id="expiryReason"
                value={expiryReason}
                onChange={(e) => {
                  setExpiryReason(e.target.value);
                  setExpiryErrors(prev => ({ ...prev, expiryReason: "" }));
                }}
                placeholder="e.g. Visa extension endorsed by FRRO; passport validity extended by Embassy..."
                className={`min-h-18 text-xs ${expiryErrors.expiryReason ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {expiryErrors.expiryReason && (
                <p className="text-[10px] text-destructive font-caption font-medium">{expiryErrors.expiryReason}</p>
              )}
              <p className="text-[10px] text-muted-foreground font-caption">
                This modification corrects the active document expiration date in-place with audit log traceability. To submit a newly issued renewal document with file evidence, use &quot;Upload New Document&quot;.
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsExpiryDialogOpen(false)}>
                Cancel
              </Button>
              <AsyncActionButton
                type="submit"
                size="sm"
                isLoading={isSavingExpiry}
                isSuccess={saveExpirySuccess}
                isError={saveExpiryError}
                idleText="Save Expiration Date"
                loadingText="Updating expiry..."
                successText="Expiry date updated"
                errorText="Try Again"
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FULL METADATA CORRECTION DIALOG */}
      <Dialog open={isDocMetadataOpen} onOpenChange={setIsDocMetadataOpen}>
        <DialogContent className="sm:max-w-md w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              Correct {editingDocType ? editingDocType.toUpperCase() : "Document"} Information
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveDocMetadata} className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground font-caption">
              Use this option only when the information recorded for the existing document is incorrect. This updates the current active record in-place without creating a new document version.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="documentNumber">
                {editingDocType === "passport" ? "Passport Number" : editingDocType === "visa" ? "Visa Number" : "Certificate Number"} *
              </label>
              <Input
                id="documentNumber"
                value={docMetadataForm.documentNumber}
                onChange={(e) => {
                  setDocMetadataForm(prev => ({ ...prev, documentNumber: e.target.value }));
                  setDocMetadataErrors(prev => ({ ...prev, documentNumber: "" }));
                }}
                className={`h-9 text-sm font-mono ${docMetadataErrors.documentNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="e.g. A-12345678"
              />
              {docMetadataErrors.documentNumber && (
                <p className="text-[10px] text-destructive font-caption">{docMetadataErrors.documentNumber}</p>
              )}
            </div>

            {editingDocType === "passport" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="placeOfIssue">Place of Issue</label>
                <Input
                  id="placeOfIssue"
                  value={docMetadataForm.placeOfIssue}
                  onChange={(e) => setDocMetadataForm(prev => ({ ...prev, placeOfIssue: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="e.g. Berlin / Embassy of Germany, New Delhi"
                />
              </div>
            )}

            {editingDocType === "visa" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="visaType">Visa Classification</label>
                <Select 
                  value={docMetadataForm.visaType} 
                  onValueChange={(val) => setDocMetadataForm(prev => ({ ...prev, visaType: val || "Student (S-1)" }))}
                >
                  <SelectTrigger className="h-9 text-xs">
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
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="docIssueDate">Issue Date *</label>
                <DatePicker
                  id="docIssueDate"
                  value={docMetadataForm.issueDate}
                  onChange={(e) => {
                    setDocMetadataForm(prev => ({ ...prev, issueDate: e.target.value }));
                    setDocMetadataErrors(prev => ({ ...prev, issueDate: "", expiryDate: "" }));
                  }}
                  error={docMetadataErrors.issueDate}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="docExpiryDate">Expiration Date *</label>
                <DatePicker
                  id="docExpiryDate"
                  value={docMetadataForm.expiryDate}
                  onChange={(e) => {
                    setDocMetadataForm(prev => ({ ...prev, expiryDate: e.target.value }));
                    setDocMetadataErrors(prev => ({ ...prev, expiryDate: "" }));
                  }}
                  error={docMetadataErrors.expiryDate}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="changeReason">Reason for Correction *</label>
              <Textarea
                id="changeReason"
                value={docMetadataForm.changeReason}
                onChange={(e) => {
                  setDocMetadataForm(prev => ({ ...prev, changeReason: e.target.value }));
                  setDocMetadataErrors(prev => ({ ...prev, changeReason: "" }));
                }}
                placeholder="e.g. Corrected typo in expiration date following physical document audit..."
                className={`min-h-16 text-sm ${docMetadataErrors.changeReason ? "border-destructive" : ""}`}
              />
              {docMetadataErrors.changeReason && (
                <p className="text-[10px] text-destructive font-caption">{docMetadataErrors.changeReason}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDocMetadataOpen(false)}>
                Cancel
              </Button>
              <AsyncActionButton
                type="submit"
                size="sm"
                isLoading={isSavingDocMetadata}
                isSuccess={saveDocSuccess}
                isError={saveDocError}
                idleText="Save Correction"
                loadingText="Updating metadata..."
                successText="Saved"
                errorText="Try Again"
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* GENUINE RENEWAL / REPLACEMENT UPLOAD MODAL */}
      {renewalDocType && (
        <DocumentUploadDialog
          config={DOCUMENT_CONFIGS[renewalDocType]}
          studentId={studentId}
          isOpen={isRenewalUploadOpen}
          onOpenChange={setIsRenewalUploadOpen}
          onSuccess={async () => {
            await Promise.all([loadStudentData(), loadReminderSchedule()]);
          }}
        />
      )}

      {/* Edit Student Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Edit Student Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="registrationNumber">University Enrollment Number</label>
              <Input 
                id="registrationNumber" 
                placeholder="e.g. NFSU/2026/CS/101 (leave empty if not yet assigned)" 
                value={editForm.registrationNumber} 
                onChange={handleFormChange} 
                className="h-9 text-sm font-mono" 
              />
              <p className="text-[10px] text-muted-foreground font-caption">
                Externally issued by the university academic registrar.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="fullName">Full Name</label>
              <Input id="fullName" value={editForm.fullName} onChange={handleFormChange} className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="program">Academic Program</label>
              <Select value={editForm.program} onValueChange={(val) => handleFormSelectChange("program", val || "")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Program" />
                </SelectTrigger>
                <SelectContent>
                  {academicPrograms.map((p) => (
                    <SelectItem key={p.id} value={p.programName}>
                      {p.programName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="email">Email Address</label>
              <Input id="email" type="email" value={editForm.email} onChange={handleFormChange} className="h-9 text-sm" />
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1.5">
              <span className="text-[11px] text-muted-foreground block font-medium">Current Semester Progression</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground font-mono">Semester {student?.currentSemester || 1} of {student?.totalSemesters || 8}</span>
                <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  Automatically Managed
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Automatically calculated from admission date ({AcademicProgressionEngine.formatDisplayDate(student?.admissionDate)}) and course configuration. To record exceptions, use the <strong>Academic Adjustment</strong> workflow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="phoneHome">Home Phone</label>
                <Input id="phoneHome" value={editForm.phoneHome} onChange={handleFormChange} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="phoneLocal">Local Phone</label>
                <Input id="phoneLocal" value={editForm.phoneLocal} onChange={handleFormChange} className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="permanentAddress">Permanent Address</label>
              <Textarea id="permanentAddress" value={editForm.permanentAddress} onChange={handleFormChange} className="min-h-16 text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="localAddress">Local Address</label>
              <Textarea id="localAddress" value={editForm.localAddress} onChange={handleFormChange} className="min-h-16 text-sm" />
            </div>

            {/* Consular & Embassy Information Section */}
            <div className="pt-3 border-t border-border/60 space-y-3">
              <div className="flex items-center gap-2">
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-xs font-medium text-foreground" htmlFor="embassyEmail">Consular Email Address</label>
                  <Input 
                    id="embassyEmail" 
                    type="email" 
                    value={editForm.embassyEmail} 
                    onChange={handleFormChange} 
                    placeholder="e.g. visa@newd.diplo.de"
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

            <div className="grid grid-cols-2 gap-3">
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
                <Select 
                  value={adjustmentForm.newProgramCode} 
                  onValueChange={(val) => setAdjustmentForm(prev => ({ ...prev, newProgramCode: val || "" }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select Destination Program" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicPrograms.map((p) => (
                      <SelectItem key={p.id} value={p.programCode || p.programName}>
                        {p.programName} ({p.totalSemesters || 8} Semesters)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* ISCMS Document Rejection Modal */}
      <RejectionDialog
        open={isRejectDialogOpen}
        title={`Reject ${rejectDocType ? rejectDocType.toUpperCase() : "Document"} Verification`}
        description="Please provide an explanation for rejecting this uploaded document. This note will be recorded in the student audit log and compliance history."
        placeholder="Explain reason for rejection (e.g. blurred scan, incorrect document details, expired document)..."
        confirmText="Reject Document"
        cancelText="Cancel"
        isLoading={isRejecting}
        onClose={() => {
          if (!isRejecting) {
            setIsRejectDialogOpen(false);
            setRejectDocType(null);
          }
        }}
        onConfirm={handleConfirmRejection}
      />

      {/* Staff Early Document Upload Exception Modal */}
      {earlyUploadDocType && (
        <AllowEarlyUploadDialog
          isOpen={isEarlyUploadDialogOpen}
          onOpenChange={(open) => {
            setIsEarlyUploadDialogOpen(open);
            if (!open) setEarlyUploadDocType(null);
          }}
          documentType={earlyUploadDocType}
          documentTitle={earlyUploadDocType === "passport" ? "Passport" : earlyUploadDocType === "visa" ? "Visa" : "eFRRO"}
          studentId={studentId}
          onSuccess={async () => {
            await loadStudentData();
          }}
        />
      )}

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
