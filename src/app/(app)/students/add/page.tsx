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
  Loader2, 
  Save, 
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { NationalitySelector } from "@/components/ui/nationality-selector";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { RegisterStudentValidationSchema } from "@/services/validation/student-validation";

export default function StudentRegistrationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"personal" | "academic" | "contact" | "documents">("personal");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittingSuccess, setSubmittingSuccess] = React.useState(false);
  const [submittingError, setSubmittingError] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
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
    emergencyContactRelation: "",
    emergencyContactPhone: "",
    passportNumber: "",
    passportExpiry: "",
    visaNumber: "",
    visaExpiry: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Zod payload assembly
    const validationPayload = {
      registrationNumber: `ISCMS-${Date.now().toString().slice(-4)}`,
      fullName: formData.fullName,
      nationalityCode: formData.nationality,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      email: formData.email,
      phoneHome: formData.phoneHome,
      phoneLocal: formData.phoneLocal || undefined,
      permanentAddress: formData.permanentAddress,
      localAddress: formData.localAddress || undefined,
      programCode: formData.program,
      admissionDate: formData.admissionDate,
      expectedGraduation: formData.expectedGraduation,
      currentSemester: 1,
      relationshipType: formData.emergencyContactRelation || "parent",
      relationshipName: formData.emergencyContactName,
      relationshipPhone: formData.emergencyContactPhone
    };

    const result = RegisterStudentValidationSchema.safeParse(validationPayload);
    if (!result.success) {
      const errorMsg = result.error.issues[0]?.message || "Validation checks failed.";
      toast.error("Form Validation Failed", {
        description: errorMsg,
      });
      return;
    }

    setIsSubmitting(true);
    setSubmittingSuccess(false);
    setSubmittingError(false);

    try {
      // TODO: Implement actual database insert
      setSubmittingError(true);
      toast.error("Database integration required to register student.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="font-h1 tracking-tight text-foreground text-2xl">Register International Student</h1>
        <p className="font-caption text-muted-foreground">
          Complete personal records, enrollment criteria, and initialize mandatory document audits.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Sidebar Tabs navigation */}
        <div className="md:col-span-1 space-y-1.5">
          <button
            onClick={() => setActiveTab("personal")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === "personal" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <User className="h-4 w-4 shrink-0" /> Personal Identity
          </button>
          
          <button
            onClick={() => setActiveTab("academic")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === "academic" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <GraduationCap className="h-4 w-4 shrink-0" /> Academic Profile
          </button>
          
          <button
            onClick={() => setActiveTab("contact")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === "contact" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <PhoneCall className="h-4 w-4 shrink-0" /> Emergency Contact
          </button>
          
          <button
            onClick={() => setActiveTab("documents")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              activeTab === "documents" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <FileCheck className="h-4 w-4 shrink-0" /> Document Checklist
          </button>

          <div className="mt-8 p-3 rounded-lg border border-amber-500/10 bg-amber-500/5 text-[11px] text-amber-600 dark:text-amber-400 font-caption space-y-1">
            <div className="flex items-center gap-1 font-semibold">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Statutory Audit Warning
            </div>
            <p className="leading-relaxed">
              Verify passport details directly from official documents. Names must match passport spelling exactly to pass eFRRO verification audits.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <Card className="md:col-span-3 border border-border/60 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit}>
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
                      Full Name (as per Passport) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="fullName"
                      placeholder="e.g. Elena Rostova"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="nationality">
                      Nationality <span className="text-rose-500">*</span>
                    </label>
                    <NationalitySelector 
                      value={formData.nationality} 
                      onChange={(v) => handleSelectChange("nationality", v)} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="gender">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <Select value={formData.gender} onValueChange={(v) => handleSelectChange("gender", v || "")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="dateOfBirth">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-9 text-sm"
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="program">
                      Academic Program <span className="text-rose-500">*</span>
                    </label>
                    <Select value={formData.program} onValueChange={(v) => handleSelectChange("program", v || "")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTECH_CSE">B.Tech in Computer Science</SelectItem>
                        <SelectItem value="CS_PHD">Ph.D. in Computer Science</SelectItem>
                        <SelectItem value="BBA_HONS">Bachelor of Business Administration</SelectItem>
                        <SelectItem value="MS_BT">M.Sc. in Biotechnology</SelectItem>
                        <SelectItem value="MTECH_VLSI">M.Tech in VLSI Design</SelectItem>
                      </SelectContent>
                    </Select>
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
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="admissionDate">
                      Admission Date
                    </label>
                    <Input
                      id="admissionDate"
                      type="date"
                      value={formData.admissionDate}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="expectedGraduation">
                      Expected Graduation Date
                    </label>
                    <Input
                      id="expectedGraduation"
                      type="date"
                      value={formData.expectedGraduation}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
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
                    <label className="text-xs font-medium text-foreground" htmlFor="email">
                      Student Institutional Email <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@university.edu"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-9 text-sm"
                    />
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
                      className="h-9 text-sm"
                    />
                  </div>

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
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactRelation">
                      Relationship Type
                    </label>
                    <Select value={formData.emergencyContactRelation} onValueChange={(v) => handleSelectChange("emergencyContactRelation", v || "")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="local_sponsor">Local Sponsor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="emergencyContactPhone">
                      Emergency Contact Phone Number
                    </label>
                    <Input
                      id="emergencyContactPhone"
                      placeholder="Country code prefixed"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            )}

            {/* Document Verification Tab */}
            {activeTab === "documents" && (
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-h2 font-semibold">Immigration Document Auditing (Metadata Initialization)</h2>
                  <p className="text-[11px] text-muted-foreground font-caption">Pre-initialize passport and visa profiles to trigger compliance warnings.</p>
                </div>
                <Separator className="my-2" />
                
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
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="passportExpiry">
                      Passport Expiration Date
                    </label>
                    <Input
                      id="passportExpiry"
                      type="date"
                      value={formData.passportExpiry}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-9 text-sm"
                    />
                  </div>

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
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground" htmlFor="visaExpiry">
                      Visa Expiration Date
                    </label>
                    <Input
                      id="visaExpiry"
                      type="date"
                      value={formData.visaExpiry}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="h-9 text-sm"
                    />
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
              
              <div className="flex items-center gap-2">
                {activeTab !== "documents" ? (
                  <Button 
                    type="button" 
                    size="sm" 
                    className="h-9 text-xs"
                    onClick={() => {
                      if (activeTab === "personal") setActiveTab("academic");
                      else if (activeTab === "academic") setActiveTab("contact");
                      else if (activeTab === "contact") setActiveTab("documents");
                    }}
                  >
                    Next Section
                  </Button>
                ) : (
                  <AsyncActionButton
                    type="submit"
                    size="sm"
                    className="h-9 text-xs"
                    isLoading={isSubmitting}
                    isSuccess={submittingSuccess}
                    isError={submittingError}
                    idleText="Save & Register"
                    loadingText="Saving Student..."
                    successText="Changes saved"
                    errorText="Try Again"
                  />
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
