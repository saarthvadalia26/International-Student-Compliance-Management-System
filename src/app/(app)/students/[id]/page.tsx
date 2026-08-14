"use client";

import * as React from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Globe, 
  GraduationCap, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Check, 
  X,
  Building,
  Loader2
} from "lucide-react";
import { getStudentDetailsAction, updateStudentAction, updateDocumentVerificationAction } from "@/app/(app)/students/actions";
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
import { getActiveAcademicProgramsAction } from "@/app/(app)/settings/academic-programs-actions";
import { AcademicProgram } from "@/domain/academic-programs/types";

export interface StudentDocument {
  number: string;
  issueDate: string;
  expiryDate: string;
  issuePlace?: string;
  visaType?: string;
  verificationStatus: "not_uploaded" | "pending" | "verified" | "rejected";
  hasUploadedDocument?: boolean;
  uploadedAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  filePath?: string | null;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phoneHome: string;
  phoneLocal?: string;
  permanentAddress: string;
  localAddress?: string;
  currentSemester: number;
  academicStatus: "good_standing" | "probation" | "suspended";
  status: "active" | "suspended" | "graduated" | "withdrawn";
  registrationNumber: string;
  nationalityCode: string;
  nationalityName: string;
  programName: string;
  programCode: string;
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
    address: string;
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

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStudentData();
  }, [loadStudentData]);

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
    fullName: "",
    email: "",
    program: "",
    phoneHome: "",
    phoneLocal: "",
    permanentAddress: "",
    localAddress: "",
    currentSemester: 1,
    academicStatus: "good_standing" as StudentProfile["academicStatus"],
    status: "active" as StudentProfile["status"]
  });

  const openEditDialog = () => {
    if (student) {
      setEditForm({
        fullName: student.fullName,
        email: student.email,
        program: student.programName || student.programCode || "",
        phoneHome: student.phoneHome,
        phoneLocal: student.phoneLocal || "",
        permanentAddress: student.permanentAddress,
        localAddress: student.localAddress || "",
        currentSemester: student.currentSemester,
        academicStatus: student.academicStatus,
        status: student.status
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      toast.error("Validation Error", { description: "Full Name and Email fields are required." });
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      const res = await updateStudentAction(studentId, {
        fullName: editForm.fullName,
        email: editForm.email,
        phoneHome: editForm.phoneHome,
        phoneLocal: editForm.phoneLocal,
        permanentAddress: editForm.permanentAddress,
        localAddress: editForm.localAddress,
        programCode: editForm.program,
        currentSemester: Number(editForm.currentSemester) || 1,
        academicStatus: editForm.academicStatus,
        status: editForm.status
      });

      if (res.success) {
        setSaveSuccess(true);
        toast.success("Profile Updated", { description: "Student information updated successfully in database." });
        await loadStudentData();
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
        const confirmClose = window.confirm("You have unsaved changes. Are you sure you want to discard them?");
        if (!confirmClose) return;
      }
      setIsEditDialogOpen(false);
      setIsDirty(false);
    } else {
      openEditDialog();
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



  // Document verification handler
  const handleVerifyDocument = async (docType: "passport" | "visa" | "efrro", status: "verified" | "rejected") => {
    let rejectionReason: string | undefined;
    if (status === "rejected") {
      const reason = window.prompt("Enter reason for document rejection:");
      if (reason === null) return; // cancelled
      rejectionReason = reason.trim() || "Document rejected by administrator during compliance check";
    }

    try {
      const res = await updateDocumentVerificationAction(
        studentId,
        docType,
        null,
        status,
        rejectionReason
      );

      if (res.success) {
        toast.success(`Document marked as ${status}`, {
          description: `Compliance standing updated successfully.`
        });
        await loadStudentData();
      } else {
        toast.error("Verification Update Failed", {
          description: res.error || "Unable to update document verification status."
        });
      }
    } catch (err) {
      toast.error("Database Error", {
        description: err instanceof Error ? err.message : "Unable to communicate with database."
      });
    }
  };

  const getComplianceHeaderBadge = (status: StudentProfile["complianceStatus"]) => {
    switch (status) {
      case "compliant":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold px-3 py-1 text-sm h-7 rounded-md">Compliant</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold px-3 py-1 text-sm h-7 rounded-md">Warning State</Badge>;
      case "non_compliant":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold px-3 py-1 text-sm h-7 rounded-md">Non-Compliant</Badge>;
      case "expired":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-semibold px-3 py-1 text-sm h-7 rounded-md">Expired / Suspended</Badge>;
    }
  };

  const getDocStatusIcon = (doc: StudentDocument | undefined, daysLeft?: number) => {
    if (!doc || !doc.hasUploadedDocument || doc.verificationStatus === "not_uploaded") {
      return <FileText className="h-5 w-5 text-muted-foreground/60" />;
    }
    
    const isExpired = daysLeft !== undefined && daysLeft < 0;
    if (isExpired) return <XCircle className="h-5 w-5 text-rose-500" />;
    if (doc.verificationStatus === "rejected") return <XCircle className="h-5 w-5 text-red-500" />;
    if (doc.verificationStatus === "pending") return <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />;
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/students" 
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students Directory
        </Link>
      </div>

      {/* Hero Profile Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 p-6 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
        <div className="flex items-start gap-4">
          <CountryFlag countryCode={student.nationalityCode} size="lg" className="mt-1 shrink-0 rounded-md border" />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-h1 font-bold text-foreground">{student.fullName}</h1>
              <Badge variant="outline" className="text-xs font-mono">
                {student.registrationNumber}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground font-caption">
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {student.nationalityName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {student.programName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 capitalize">
                Semester {student.currentSemester} ({student.academicStatus.replace("_", " ")})
              </span>
            </div>
          </div>
        </div>

        {/* Global Compliance Status & Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-caption">Compliance Standing:</span>
            {getComplianceHeaderBadge(student.complianceStatus)}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-8"
              onClick={openEditDialog}
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation Controls */}
      <div className="flex border-b border-border/60 gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveSubTab("immigration")}
          className={`pb-3 relative transition-colors ${
            activeSubTab === "immigration" 
              ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Immigration & Documents
        </button>
        <button
          onClick={() => setActiveSubTab("academic")}
          className={`pb-3 relative transition-colors ${
            activeSubTab === "academic" 
              ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Academic Details
        </button>
        <button
          onClick={() => setActiveSubTab("contact")}
          className={`pb-3 relative transition-colors ${
            activeSubTab === "contact" 
              ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Contact & Addresses
        </button>
      </div>

      {/* Main Grid: Details vs Right Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Immigration documents */}
          {activeSubTab === "immigration" && (
            <div className="space-y-4">
              {/* PASSPORT DOCUMENT CARD */}
              <Card className="border border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20">
                  <div className="flex items-center gap-2">
                    {getDocStatusIcon(student.passport, student.daysToPassportExpiry)}
                    <div>
                      <CardTitle className="text-sm font-semibold">Passport Document Information</CardTitle>
                      <CardDescription className="text-[10px] font-caption">Identity verification and international travel documentation.</CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {student.passport.hasUploadedDocument && student.passport.verificationStatus !== "not_uploaded" ? (
                      <Badge 
                        variant={student.passport.verificationStatus === "verified" ? "secondary" : student.passport.verificationStatus === "rejected" ? "destructive" : "secondary"}
                        className={`text-[10px] h-5 capitalize ${
                          student.passport.verificationStatus === "verified" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          student.passport.verificationStatus === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                          "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {student.passport.verificationStatus === "pending" ? "Pending Verification" : student.passport.verificationStatus}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground border-border/60">
                        Not Uploaded
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Passport Number</span>
                    <span className="font-semibold text-foreground block">{student.passport.number || "Not Recorded"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Place of Issuance</span>
                    <span className="font-semibold text-foreground block">{student.passport.issuePlace || "N/A"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Issue Date</span>
                    <span className="font-semibold text-foreground block">{student.passport.issueDate || "Not Recorded"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Expiration Date</span>
                    <span className={`font-semibold block ${student.daysToPassportExpiry !== undefined && student.daysToPassportExpiry < 0 ? "text-rose-600" : "text-foreground"}`}>
                      {student.passport.expiryDate || "Not Recorded"}{" "}
                      {student.passport.expiryDate && student.daysToPassportExpiry !== undefined && (
                        <span className="text-[10px] font-medium font-caption">
                          ({student.daysToPassportExpiry < 0 ? "Expired" : `${student.daysToPassportExpiry} days left`})
                        </span>
                      )}
                    </span>
                  </div>

                  {student.passport.hasUploadedDocument ? (
                    <div className="sm:col-span-2 pt-3 border-t border-border/40 flex items-center justify-between">
                      <Link 
                        href={`/students/${student.id}/passport`} 
                        className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3.5 w-3.5" /> View Uploaded Passport Document
                      </Link>

                      {student.passport.verificationStatus === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50 border-rose-200 dark:hover:bg-rose-950/20"
                            onClick={() => handleVerifyDocument("passport", "rejected")}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Reject Upload
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-7 text-[11px] px-2"
                            onClick={() => handleVerifyDocument("passport", "verified")}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve Verification
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="sm:col-span-2 pt-3 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">No physical document scan uploaded yet.</span>
                      <Link href={`/students/${student.id}/passport`} passHref>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]">
                          Upload Passport PDF
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* VISA DOCUMENT CARD */}
              <Card className="border border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20">
                  <div className="flex items-center gap-2">
                    {getDocStatusIcon(student.visa, student.daysToVisaExpiry)}
                    <div>
                      <CardTitle className="text-sm font-semibold">Visa Document Details</CardTitle>
                      <CardDescription className="text-[10px] font-caption">Verification of active Student Visa validity.</CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {student.visa.hasUploadedDocument && student.visa.verificationStatus !== "not_uploaded" ? (
                      <Badge 
                        variant={student.visa.verificationStatus === "verified" ? "secondary" : student.visa.verificationStatus === "rejected" ? "destructive" : "secondary"}
                        className={`text-[10px] h-5 capitalize ${
                          student.visa.verificationStatus === "verified" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          student.visa.verificationStatus === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                          "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}
                      >
                        {student.visa.verificationStatus === "pending" ? "Pending Verification" : student.visa.verificationStatus}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground border-border/60">
                        Not Uploaded
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Visa Number</span>
                    <span className="font-semibold text-foreground block">{student.visa.number || "Not Recorded"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Visa Type Classification</span>
                    <span className="font-semibold text-foreground block">{student.visa.visaType || "Student (S-1)"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Issue Date</span>
                    <span className="font-semibold text-foreground block">{student.visa.issueDate || "Not Recorded"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground block font-caption">Expiration Date</span>
                    <span className={`font-semibold block ${student.daysToVisaExpiry !== undefined && student.daysToVisaExpiry < 0 ? "text-rose-600" : "text-foreground"}`}>
                      {student.visa.expiryDate || "Not Recorded"}{" "}
                      {student.visa.expiryDate && student.daysToVisaExpiry !== undefined && (
                        <span className="text-[10px] font-medium font-caption">
                          ({student.daysToVisaExpiry < 0 ? `Expired ${Math.abs(student.daysToVisaExpiry)} days ago` : `${student.daysToVisaExpiry} days left`})
                        </span>
                      )}
                    </span>
                  </div>

                  {student.visa.hasUploadedDocument ? (
                    <div className="sm:col-span-2 pt-3 border-t border-border/40 flex items-center justify-between">
                      <Link 
                        href={`/students/${student.id}/visa`} 
                        className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3.5 w-3.5" /> View Uploaded Visa Document
                      </Link>

                      {student.visa.verificationStatus === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50 border-rose-200 dark:hover:bg-rose-950/20"
                            onClick={() => handleVerifyDocument("visa", "rejected")}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Reject Upload
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-7 text-[11px] px-2"
                            onClick={() => handleVerifyDocument("visa", "verified")}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve Verification
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="sm:col-span-2 pt-3 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">No physical document scan uploaded yet.</span>
                      <Link href={`/students/${student.id}/visa`} passHref>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]">
                          Upload Visa PDF
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* EFRRO REGISTRATION CARD */}
              {student.efrro ? (
                <Card className="border border-border/60 shadow-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20">
                    <div className="flex items-center gap-2">
                      {getDocStatusIcon(student.efrro, student.daysToEfrroExpiry)}
                      <div>
                        <CardTitle className="text-sm font-semibold">eFRRO / Residential Permit Certificate</CardTitle>
                        <CardDescription className="text-[10px] font-caption">Local registration status with Indian Immigration services.</CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {student.efrro.hasUploadedDocument && student.efrro.verificationStatus !== "not_uploaded" ? (
                        <Badge 
                          variant={student.efrro.verificationStatus === "verified" ? "secondary" : student.efrro.verificationStatus === "rejected" ? "destructive" : "secondary"}
                          className={`text-[10px] h-5 capitalize ${
                            student.efrro.verificationStatus === "verified" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                            student.efrro.verificationStatus === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                            "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {student.efrro.verificationStatus === "pending" ? "Pending Verification" : student.efrro.verificationStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground border-border/60">
                          Not Uploaded
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 grid gap-4 sm:grid-cols-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground block font-caption">Certificate Number</span>
                      <span className="font-semibold text-foreground block">{student.efrro.number || "Not Recorded"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground block font-caption">Issue Date</span>
                      <span className="font-semibold text-foreground block">{student.efrro.issueDate || "Not Recorded"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground block font-caption">Expiration Date</span>
                      <span className={`font-semibold block ${student.daysToEfrroExpiry !== undefined && student.daysToEfrroExpiry < 0 ? "text-rose-600" : "text-foreground"}`}>
                        {student.efrro.expiryDate || "Not Recorded"}{" "}
                        {student.efrro.expiryDate && student.daysToEfrroExpiry !== undefined && (
                          <span className="text-[10px] font-medium font-caption">
                            ({student.daysToEfrroExpiry < 0 ? "Expired" : `${student.daysToEfrroExpiry} days left`})
                          </span>
                        )}
                      </span>
                    </div>

                    {student.efrro.hasUploadedDocument ? (
                      <div className="sm:col-span-2 pt-3 border-t border-border/40 flex items-center justify-between">
                        <Link 
                          href={`/students/${student.id}/efrro`} 
                          className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-3.5 w-3.5" /> View Uploaded eFRRO Document
                        </Link>

                        {student.efrro.verificationStatus === "pending" && (
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50 border-rose-200 dark:hover:bg-rose-950/20"
                              onClick={() => handleVerifyDocument("efrro", "rejected")}
                            >
                              <X className="mr-1 h-3.5 w-3.5" /> Reject Upload
                            </Button>
                            <Button 
                              size="sm" 
                              className="h-7 text-[11px] px-2"
                              onClick={() => handleVerifyDocument("efrro", "verified")}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" /> Approve Verification
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="sm:col-span-2 pt-3 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">No physical document scan uploaded yet.</span>
                        <Link href={`/students/${student.id}/efrro`} passHref>
                          <Button size="sm" variant="outline" className="h-7 text-[11px]">
                            Upload eFRRO PDF
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
            <Card className="border border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Academic standing details</CardTitle>
                <CardDescription className="text-[10px] font-caption">Student enrollment dates, courses, and current status checks.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-caption">Registered School</span>
                  <span className="font-semibold text-foreground block">{student.school}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-caption">Program Curriculum</span>
                  <span className="font-semibold text-foreground block">{student.programName} ({student.programCode})</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-caption">Admission Date</span>
                  <span className="font-semibold text-foreground block">{student.admissionDate}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-caption">Expected Graduation</span>
                  <span className="font-semibold text-foreground block">{student.expectedGraduation}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-caption">Current Semester</span>
                  <span className="font-semibold text-foreground block">{student.currentSemester} / 8</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-caption">Academic Status</span>
                  <span className="font-semibold text-foreground block capitalize">{student.academicStatus.replace("_", " ")}</span>
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
                    <span className="font-semibold text-foreground block">{student.phoneLocal || "Not Provided"}</span>
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
                    <span className="font-medium text-foreground block leading-relaxed">{student.localAddress || "Not Provided"}</span>
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

        {/* Right Column content (emergency contacts + notifications list) */}
        <div className="space-y-6">
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

          {/* Embassy Details */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consular Embassy Info</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground block font-caption">Consulate Name</span>
                <span className="font-semibold text-foreground block flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-muted-foreground" /> {student.embassy.name}
                </span>
              </div>
              {student.embassy.phone && (
                <div className="space-y-0.5">
                  <span className="text-muted-foreground block font-caption">Embassy Helpline</span>
                  <span className="font-semibold text-foreground block flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {student.embassy.phone}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                <span className="text-muted-foreground block font-caption">Embassy Address</span>
                <span className="font-medium text-foreground block leading-normal">{student.embassy.address}</span>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Reminders checklist */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reminder Dispatch Flow</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-caption">90-Day Early Warning</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/5 text-emerald-600 border-emerald-500/10">Dispatched</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-caption">60-Day Administrative</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/5 text-emerald-600 border-emerald-500/10">Dispatched</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-caption">30-Day Urgent Renewal</span>
                  {student.complianceStatus === "warning" || student.complianceStatus === "non_compliant" || student.complianceStatus === "expired" ? (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/5 text-amber-600 border-amber-500/10">Triggered</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-caption">15-Day Critical Warning</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Student Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Edit Student Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="email">Email Address</label>
                <Input id="email" type="email" value={editForm.email} onChange={handleFormChange} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="currentSemester">Current Semester</label>
                <Input id="currentSemester" type="number" min={1} max={20} value={editForm.currentSemester} onChange={(e) => setEditForm(prev => ({ ...prev, currentSemester: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
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

            <DialogFooter className="pt-2">
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
    </div>
  );
}
