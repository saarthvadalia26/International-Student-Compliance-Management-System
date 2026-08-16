"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  Building, 
  Bell, 
  Clock, 
  Database, 
  Lock, 
  Users,
  Loader2, 
  CheckCircle2, 
  ShieldAlert, 
  Archive, 
  HelpCircle,
  Play,
  Languages,
  Check,
  AlertTriangle,
  RotateCcw,
  Trash2,
  GraduationCap,
  ArrowLeft
} from "lucide-react";
import { UserManagementTab } from "@/components/settings/user-management-tab";
import { AcademicProgramsTab } from "@/components/settings/academic-programs-tab";
import { PlatformInfrastructureTab } from "@/components/settings/platform-infrastructure-tab";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useRealtime } from "@/providers/realtime-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import { 
  fetchRetentionPolicies, 
  updateRetentionPolicyAction, 
  runDocumentCleanupAction,
  globalSignOutAction,
  factoryResetAction,
  fetchDocumentUploadPoliciesAction, 
  updateDocumentUploadPoliciesAction,
  DocumentUploadPolicyConfig,
  fetchSystemPreferencesAction,
  updateSystemPreferencesAction
} from "./actions";
import { RetentionPolicy, CleanupExecutionReport } from "@/domain/retention/types";
import { EmergencyLogoutDialog } from "@/components/settings/emergency-logout-dialog";
import { Branding } from "@/config/branding";
import { ShieldCheck, FileCheck2, Globe2, Award } from "lucide-react";


export default function SettingsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading settings...</div>}>
      <SettingsPageContent />
    </React.Suspense>
  );
}

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserSupabase();
  const { theme, setTheme } = useTheme();
  const { isAdministrator } = useUserRole();
  const { broadcastSessionLogout } = useRealtime();

  // Emergency Logout dialog state
  const [isEmergencyLogoutOpen, setIsEmergencyLogoutOpen] = React.useState(false);

  // Active Tab navigation state
  const [activeTab, setActiveTab] = React.useState<"general" | "programs" | "notifications" | "retention" | "system" | "security" | "users">("general");

  const tabParam = searchParams ? searchParams.get("tab") : null;

  React.useEffect(() => {
    if (tabParam && ["general", "programs", "notifications", "retention", "system", "security", "users"].includes(tabParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam as "general" | "programs" | "notifications" | "retention" | "system" | "security" | "users");
    }
  }, [tabParam]);

  // General Settings State
  const [schoolName, setSchoolName] = React.useState(`${Branding.universityName} (${Branding.shortName})`);
  const [supportEmail, setSupportEmail] = React.useState(Branding.supportEmail);
  const [supportPhone, setSupportPhone] = React.useState(Branding.supportPhone);
  const [isSavingGeneral, setIsSavingGeneral] = React.useState(false);
  const [generalSuccess, setGeneralSuccess] = React.useState(false);
  const [generalError, setGeneralError] = React.useState(false);

  // Notification Configuration State
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = React.useState(true);
  const [isSavingNotifs, setIsSavingNotifs] = React.useState(false);
  const [notifsSuccess, setNotifsSuccess] = React.useState(false);
  const [notifsError, setNotifsError] = React.useState(false);
  const [previewLanguage, setPreviewLanguage] = React.useState("en");
  const [previewBody, setPreviewBody] = React.useState("");

  // Document Retention Policies State
  const [policies, setPolicies] = React.useState<RetentionPolicy[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = React.useState(true);
  const [isUpdatingPolicyId, setIsUpdatingPolicyId] = React.useState<string | null>(null);
  
  // Document Upload Window Policies State
  const [uploadPolicies, setUploadPolicies] = React.useState<DocumentUploadPolicyConfig[]>([
    { documentType: "passport", uploadWindowDays: 30, isActive: true },
    { documentType: "visa", uploadWindowDays: 30, isActive: true },
    { documentType: "efrro", uploadWindowDays: 30, isActive: true }
  ]);
  const [isSavingUploadPolicies, setIsSavingUploadPolicies] = React.useState(false);
  const [uploadPolicySuccess, setUploadPolicySuccess] = React.useState(false);
  const [uploadPolicyError, setUploadPolicyError] = React.useState(false);

  // System Preferences (Upload Limit) State
  const [maxUploadSizeMb, setMaxUploadSizeMb] = React.useState<number>(10);
  const [isSavingPreferences, setIsSavingPreferences] = React.useState(false);
  const [preferencesSuccess, setPreferencesSuccess] = React.useState(false);
  const [preferencesError, setPreferencesError] = React.useState(false);

  // Manual Cleanup overrides state
  const [cleanupReport, setCleanupReport] = React.useState<CleanupExecutionReport | null>(null);
  const [isRunningCleanup, setIsRunningCleanup] = React.useState(false);

  // Security password state
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
  const [passwordSuccess, setPasswordSuccess] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = React.useState(false);
  const [signOutSuccess, setSignOutSuccess] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState(false);

  // Factory Reset state
  const [resetPassword, setResetPassword] = React.useState("");
  const [resetConfirmText, setResetConfirmText] = React.useState("");
  const [isResettingFactory, setIsResettingFactory] = React.useState(false);
  const [resetStep, setResetStep] = React.useState<1 | 2 | 3>(1);

  const loadPolicies = async () => {
    try {
      setIsLoadingPolicies(true);
      const data = await fetchRetentionPolicies();
      setPolicies(data);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed loading document retention policies");
    } finally {
      setIsLoadingPolicies(false);
    }
  };

  const loadUploadPolicies = async () => {
    try {
      const res = await fetchDocumentUploadPoliciesAction();
      if (res.success && res.policies.length > 0) {
        setUploadPolicies(res.policies);
      }
    } catch {
      // ignore
    }
  };

  const loadSystemPreferences = async () => {
    try {
      const res = await fetchSystemPreferencesAction();
      if (res.success && res.preferences) {
        setMaxUploadSizeMb(res.preferences.maxUploadSizeMb || 10);
      }
    } catch {
      // ignore
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPreferences(true);
    setPreferencesSuccess(false);
    setPreferencesError(false);

    try {
      const res = await updateSystemPreferencesAction({
        maxUploadSizeBytes: maxUploadSizeMb * 1024 * 1024
      });
      if (res.success) {
        setPreferencesSuccess(true);
        toast.success(`Maximum document size updated to ${maxUploadSizeMb} MB.`, {
          description: "Student and Staff portals will immediately enforce this limit."
        });
      } else {
        setPreferencesError(true);
        toast.error(res.error || "Failed to update preferences.");
      }
    } catch (err: unknown) {
      setPreferencesError(true);
      toast.error(err instanceof Error ? err.message : "Failed to update preferences.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleSaveUploadPolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUploadPolicies(true);
    setUploadPolicySuccess(false);
    setUploadPolicyError(false);

    try {
      const res = await updateDocumentUploadPoliciesAction(uploadPolicies);
      if (res.success) {
        setUploadPolicySuccess(true);
        toast.success("Document upload pre-expiry windows updated successfully.");
      } else {
        setUploadPolicyError(true);
        toast.error(res.error || "Failed to update upload policies.");
      }
    } catch (err: unknown) {
      setUploadPolicyError(true);
      toast.error(err instanceof Error ? err.message : "Failed to update upload policies.");
    } finally {
      setIsSavingUploadPolicies(false);
    }
  };

  // Hydrate configurations state
  React.useEffect(() => {
    // Sync notifications triggers config
    const savedEmail = localStorage.getItem("isms_email_alerts");
    const savedWhatsapp = localStorage.getItem("isms_whatsapp_alerts");
    
    Promise.resolve().then(() => {
      if (savedEmail !== null) setEmailAlerts(savedEmail === "true");
      if (savedWhatsapp !== null) setWhatsappAlerts(savedWhatsapp === "true");
    });

    // Fetch retention policies
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPolicies();
    loadUploadPolicies();
    loadSystemPreferences();
  }, []);

  // Preview Language Template changer
  React.useEffect(() => {
    const templates: Record<string, string> = {
      en: "Dear student, Your eFRRO documents are expiring in 30 days. Please renew.",
      hi: "प्रिय छात्र, आपके eFRRO दस्तावेज़ 30 दिनों में समाप्त हो रहे हैं। कृपया नवीनीकरण करें।",
      es: "Estimado estudiante, Sus documentos de eFRRO vencen en 30 días. Por favor renueve.",
      fr: "Cher étudiant, Vos documents eFRRO expirent dans 30 jours. Veuillez renouveler.",
      ar: "عزيزي الطالب، ستنتهي صلاحية مستندات eFRRO الخاصة بك خلال 30 يومًا. يرجى التجديد.",
      zh: "尊敬的学生，您的 eFRRO 文件将在 30 天内过期。请尽快更新。"
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewBody(templates[previewLanguage] || templates.en);
  }, [previewLanguage]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralSuccess(false);
    setGeneralError(false);
    setTimeout(() => {
      setIsSavingGeneral(false);
      setGeneralSuccess(true);
      toast.success("Profile updated successfully.");
    }, 600);
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotifs(true);
    setNotifsSuccess(false);
    setNotifsError(false);
    setTimeout(() => {
      try {
        localStorage.setItem("isms_email_alerts", String(emailAlerts));
        localStorage.setItem("isms_whatsapp_alerts", String(whatsappAlerts));
        setIsSavingNotifs(false);
        setNotifsSuccess(true);
        toast.success("Profile updated successfully.");
      } catch (err) {
        setIsSavingNotifs(false);
        setNotifsError(true);
        toast.error("Unable to save changes. Please try again.");
      }
    }, 600);
  };

  const handleUpdatePolicy = async (policyId: string, updates: Partial<RetentionPolicy>) => {
    setIsUpdatingPolicyId(policyId);
    try {
      await updateRetentionPolicyAction({ id: policyId, ...updates });
      setPolicies(prev => prev.map(p => p.id === policyId ? { ...p, ...updates } : p));
      toast.success("Retention lifecycle rule updated");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(errMsg || "Failed updating rule configuration");
    } finally {
      setIsUpdatingPolicyId(null);
    }
  };

  const triggerCleanupRun = async (dryRun: boolean) => {
    setIsRunningCleanup(true);
    setCleanupReport(null);
    try {
      const report = await runDocumentCleanupAction(dryRun, "Administrative Interface");
      setCleanupReport(report);
      if (dryRun) {
        toast.success(`Dry-run scan completed. Scanned ${report.totalScanned} documents.`);
      } else {
        toast.success(`Live purge completed successfully.`);
        loadPolicies(); // Reload to refresh list
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(errMsg || "Failed running cleanup scheduler task");
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordSuccess(false);
    setPasswordError(false);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      toast.success("Profile updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(true);
      toast.error("Unable to save changes. Please try again.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOutAll = async () => {
    setIsSigningOutAll(true);
    setSignOutSuccess(false);
    setSignOutError(false);
    try {
      // Write audit trail server-side before signing out
      await globalSignOutAction();

      // Sign out of all sessions via Supabase
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;

      // Broadcast to other open tabs so they also redirect
      broadcastSessionLogout("global_signout");

      setSignOutSuccess(true);
      toast.success("Signed out of all sessions.", {
        description: "All active sessions across every device have been terminated.",
      });

      // Redirect after short delay to show success state
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err: unknown) {
      setSignOutError(true);
      toast.error("Failed to sign out all sessions. Please try again.");
    } finally {
      setIsSigningOutAll(false);
    }
  };

  return (
    <>
    <div className="space-y-6 max-w-5xl mx-auto font-sans p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System Administration</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Central management panel for institutional configs, document lifecycles, provider details, and platform security.
        </p>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-border overflow-x-auto gap-2 pb-px scrollbar-none">
        {[
          { id: "general", label: "General", icon: Building },
          { id: "programs", label: "Academic Programs", icon: GraduationCap },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "users", label: "User Management", icon: Users },
          { id: "retention", label: "Retention Policies", icon: Clock },
          { id: "system", label: "System Health", icon: Database },
          { id: "security", label: "Security", icon: Lock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "general" | "programs" | "notifications" | "retention" | "system" | "security" | "users")}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus:text-primary ${
                isActive 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Workspaces Content */}
      <div className="space-y-6">
        
        {/* Tab: Academic Programs */}
        {activeTab === "programs" && <AcademicProgramsTab />}

        {/* Tab: User Management */}
        {activeTab === "users" && <UserManagementTab />}
        
        {/* Tab 1: General */}
        {activeTab === "general" && (
          <div className="grid gap-6">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-muted-foreground" /> Institute Configurations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveGeneral} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">School Name</label>
                    <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Support Contact Email</label>
                      <Input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Support Contact Phone</label>
                      <Input value={supportPhone} onChange={e => setSupportPhone(e.target.value)} className="h-9 text-xs" />
                    </div>
                  </div>
                  <AsyncActionButton
                    type="submit"
                    size="sm"
                    className="h-8 text-xs"
                    isLoading={isSavingGeneral}
                    isSuccess={generalSuccess}
                    isError={generalError}
                    idleText="Save Details"
                    loadingText="Saving changes..."
                    successText="Changes saved"
                    errorText="Try Again"
                  />
                </form>
              </CardContent>
            </Card>

            {/* Document Upload Pre-Expiry Windows Policy Configuration */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Document Upload Pre-Expiry Windows
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveUploadPolicies} className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Configure the pre-expiry window (in days) during which students are permitted to upload renewed documents via the Student Portal. Outside this window, student uploads are disabled to prevent unnecessary Cloudflare R2 storage usage.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {/* Passport Window */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border/60 bg-muted/5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <FileCheck2 className="h-3.5 w-3.5 text-blue-500" />
                        Passport Upload Window
                      </div>
                      <p className="text-[10px] text-muted-foreground">Days before passport expiry</p>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={uploadPolicies.find(p => p.documentType === "passport")?.uploadWindowDays ?? 30}
                        onChange={e => {
                          const val = Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1));
                          setUploadPolicies(prev => prev.map(p => p.documentType === "passport" ? { ...p, uploadWindowDays: val } : p));
                        }}
                        className="h-9 text-xs mt-1"
                      />
                    </div>

                    {/* Visa Window */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border/60 bg-muted/5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                        Visa Upload Window
                      </div>
                      <p className="text-[10px] text-muted-foreground">Days before visa expiry</p>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={uploadPolicies.find(p => p.documentType === "visa")?.uploadWindowDays ?? 30}
                        onChange={e => {
                          const val = Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1));
                          setUploadPolicies(prev => prev.map(p => p.documentType === "visa" ? { ...p, uploadWindowDays: val } : p));
                        }}
                        className="h-9 text-xs mt-1"
                      />
                    </div>

                    {/* eFRRO Window */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border/60 bg-muted/5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Award className="h-3.5 w-3.5 text-purple-500" />
                        eFRRO Upload Window
                      </div>
                      <p className="text-[10px] text-muted-foreground">Days before eFRRO expiry</p>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={uploadPolicies.find(p => p.documentType === "efrro")?.uploadWindowDays ?? 30}
                        onChange={e => {
                          const val = Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1));
                          setUploadPolicies(prev => prev.map(p => p.documentType === "efrro" ? { ...p, uploadWindowDays: val } : p));
                        }}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                  </div>

                  <AsyncActionButton
                    type="submit"
                    size="sm"
                    className="h-8 text-xs"
                    isLoading={isSavingUploadPolicies}
                    isSuccess={uploadPolicySuccess}
                    isError={uploadPolicyError}
                    idleText="Save Upload Policies"
                    loadingText="Saving policies..."
                    successText="Policies saved"
                    errorText="Try Again"
                  />
                </form>
              </CardContent>
            </Card>

            {/* Document Upload Size Settings */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Archive className="h-4 w-4 text-muted-foreground" /> Document Upload Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSavePreferences} className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Configure the maximum file size allowed for documents uploaded through the Student Portal (Passport, Visa, and eFRRO).
                  </p>

                  <div className="max-w-xs space-y-1.5 p-3.5 rounded-xl border border-border/60 bg-muted/5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      Maximum Student Document Upload Size
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Students can upload individual passport, visa and eFRRO documents up to this size (1–100 MB).
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={maxUploadSizeMb}
                        onChange={e => setMaxUploadSizeMb(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                        className="h-9 text-xs font-medium"
                      />
                      <span className="text-xs font-semibold text-muted-foreground">MB</span>
                    </div>
                  </div>

                  <AsyncActionButton
                    type="submit"
                    size="sm"
                    className="h-8 text-xs"
                    isLoading={isSavingPreferences}
                    isSuccess={preferencesSuccess}
                    isError={preferencesError}
                    idleText="Save Changes"
                    loadingText="Saving changes..."
                    successText="Changes saved"
                    errorText="Try Again"
                  />
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Notifications */}
        {activeTab === "notifications" && (
          <div className="grid gap-6">
            <div className="flex items-center justify-between pb-1">
              <Link
                href="/notifications"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline group"
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Back to Notification Center</span>
              </Link>
            </div>

            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-muted-foreground" /> Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveNotifications} className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between opacity-75">
                      <div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-foreground">Email Notifications</label>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Email notification channel is currently disabled until provider integration is available.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={false}
                        disabled={true}
                        className="h-4 w-4 rounded accent-primary cursor-not-allowed opacity-50"
                        title="Email integration coming soon"
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-border/40 pt-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground">WhatsApp Notifications</label>
                        <p className="text-[10px] text-muted-foreground">Dispatches direct reminder alerts to student contact numbers via Meta WhatsApp Business Platform.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={whatsappAlerts}
                        onChange={e => setWhatsappAlerts(e.target.checked)}
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />
                    </div>
                  </div>
                  <AsyncActionButton
                    type="submit"
                    size="sm"
                    className="h-8 text-xs mt-2"
                    isLoading={isSavingNotifs}
                    isSuccess={notifsSuccess}
                    isError={notifsError}
                    idleText="Save Notification Settings"
                    loadingText="Saving changes..."
                    successText="Changes saved"
                    errorText="Try Again"
                  />
                </form>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Languages className="h-4 w-4 text-muted-foreground" /> Multi-language Template Previewer
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-foreground">Select Preview Language:</label>
                  <select
                    value={previewLanguage}
                    onChange={e => setPreviewLanguage(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none"
                  >
                    <option value="en">English (en)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="ar">Arabic (ar)</option>
                    <option value="zh">Chinese (zh)</option>
                  </select>
                </div>
                <div className="p-4 rounded bg-muted/30 border border-border/40 font-mono text-xs text-foreground whitespace-pre-wrap">
                  {previewBody}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 3: Retention Policies */}
        {activeTab === "retention" && (
          <div className="grid gap-6">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Archive className="h-4 w-4 text-muted-foreground" /> Document Retention Lifecycles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingPolicies ? (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading policy configurations...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {policies.map(policy => (
                      <div key={policy.id} className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">{policy.documentType} rules</span>
                          <span className="text-[10px] text-muted-foreground font-mono">ID: {policy.id}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-semibold text-muted-foreground">Retention Period (Days)</label>
                            <Input
                              type="number"
                              defaultValue={policy.retentionPeriodDays}
                              onBlur={e => handleUpdatePolicy(policy.id, { retentionPeriodDays: parseInt(e.target.value) || 0 })}
                              disabled={isUpdatingPolicyId === policy.id}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-semibold text-muted-foreground">Grace Period (Days)</label>
                            <Input
                              type="number"
                              defaultValue={policy.gracePeriodDays}
                              onBlur={e => handleUpdatePolicy(policy.id, { gracePeriodDays: parseInt(e.target.value) || 0 })}
                              disabled={isUpdatingPolicyId === policy.id}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-2 pt-5">
                            <input
                              type="checkbox"
                              defaultChecked={policy.archiveBeforeDelete}
                              onChange={e => handleUpdatePolicy(policy.id, { archiveBeforeDelete: e.target.checked })}
                              disabled={isUpdatingPolicyId === policy.id}
                              className="h-4 w-4 rounded accent-primary cursor-pointer"
                            />
                            <span className="text-xs text-foreground font-medium">Archive before permanent purge</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Play className="h-4 w-4 text-muted-foreground" /> Manual Retention Purges
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 rounded border border-yellow-200 bg-yellow-50/50 flex gap-3 text-xs text-yellow-800">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Cautionary Action Workspace:</span> Triggering cleanups purges unneeded student records exceeding compliance periods from remote storage assets. Use dry-run first to verify scanned files.
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => triggerCleanupRun(true)}
                    disabled={isRunningCleanup}
                  >
                    Run Dry-Run Scan
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => triggerCleanupRun(false)}
                    disabled={isRunningCleanup}
                  >
                    Execute Permanent Purge (Live)
                  </Button>
                </div>

                {isRunningCleanup && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing files audit calculations...
                  </div>
                )}

                {cleanupReport && (
                  <div className="space-y-4 mt-4 border-t border-border/40 pt-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>Purge Execution Report: {cleanupReport.dryRun ? "(DRY-RUN SCAN)" : "(LIVE EXECUTION)"}</span>
                      <span className="font-mono text-muted-foreground">Scanned count: {cleanupReport.totalScanned}</span>
                    </div>

                    {cleanupReport.actionsPerformed.length === 0 ? (
                      <div className="p-3 bg-muted/20 border rounded text-xs text-muted-foreground">
                        No files matching expired retention categories. No changes made.
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto border border-border/40 rounded p-1 space-y-1">
                        {cleanupReport.actionsPerformed.map((item, idx) => (
                          <div key={idx} className="p-2 text-[11px] font-mono border-b border-border/20 last:border-0 flex justify-between gap-4">
                            <div>
                              <span className="font-semibold uppercase text-primary">[{item.documentType}]</span> {item.filePath}
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                item.action === "deleted" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                              }`}>{item.action}</span>
                              <span className="text-[10px] text-muted-foreground">{item.details}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 4: System Health */}
        {activeTab === "system" && (
          <div className="grid gap-6">
            <PlatformInfrastructureTab />

            {/* Factory Reset — Administrator only */}
            {isAdministrator && (
              <Card className="border border-rose-500/40 shadow-sm">
                <CardHeader className="bg-rose-500/5 border-b border-rose-500/30 py-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                    <RotateCcw className="h-4 w-4" /> Factory Reset
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Permanently erases <strong>all operational data</strong>, authentication accounts, uploaded documents, and system configuration.
                    The application will revert to a brand-new installation state suitable for university handover.
                  </p>

                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400 space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                      <span>Warning: This action is permanent and irreversible</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                      <li>All administrator and staff accounts will be deleted.</li>
                      <li>All student records, passports, visas, and eFRRO filings will be erased.</li>
                      <li>All notifications, audit logs, and system configuration will be cleared.</li>
                      <li>All uploaded documents will be permanently removed from storage.</li>
                      <li>The Setup Wizard will appear on the next visit.</li>
                    </ul>
                  </div>

                  {/* Step 1: Password Verification */}
                  {resetStep === 1 && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Confirm your password to proceed:</label>
                        <Input
                          type="password"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder="Enter your current password"
                          className="h-9 text-xs max-w-sm border-rose-500/30 focus:border-rose-500"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                        disabled={!resetPassword || resetPassword.length < 8}
                        onClick={() => setResetStep(2)}
                      >
                        Continue
                      </Button>
                    </div>
                  )}

                  {/* Step 2: Type Confirmation Phrase */}
                  {resetStep === 2 && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">RESET ISCMS</span> to confirm:
                        </label>
                        <Input
                          type="text"
                          value={resetConfirmText}
                          onChange={(e) => setResetConfirmText(e.target.value)}
                          placeholder="RESET ISCMS"
                          className="h-9 text-xs font-mono tracking-wider max-w-sm border-rose-500/30 focus:border-rose-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => { setResetStep(1); setResetConfirmText(""); }}
                        >
                          Back
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                          disabled={resetConfirmText.trim() !== "RESET ISCMS"}
                          onClick={() => setResetStep(3)}
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Final Confirmation */}
                  {resetStep === 3 && (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-700 dark:text-rose-400">
                        <p className="font-semibold">Final Confirmation</p>
                        <p className="mt-1 text-muted-foreground">You are about to permanently erase all data and restore the system to factory state. This cannot be undone.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={isResettingFactory}
                          onClick={() => { setResetStep(1); setResetPassword(""); setResetConfirmText(""); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                          disabled={isResettingFactory}
                          onClick={async () => {
                            try {
                              setIsResettingFactory(true);
                              const result = await factoryResetAction(resetPassword);
                              if (result.success) {
                                toast.success("System Reset Successfully", {
                                  duration: 4000,
                                  id: "factory-reset-toast",
                                  description: undefined,
                                });
                                setTimeout(() => {
                                  window.location.href = "/setup";
                                }, 1200);
                              }
                            } catch {
                              toast.error("System reset could not be completed. Please try again.", {
                                duration: 6000,
                                id: "factory-reset-toast-error",
                              });
                              setResetStep(1);
                              setResetPassword("");
                              setResetConfirmText("");
                            } finally {
                              setIsResettingFactory(false);
                            }
                          }}
                        >
                          {isResettingFactory ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Resetting System...</>
                          ) : (
                            <><Trash2 className="h-3.5 w-3.5" /> Execute Factory Reset</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tab 5: Security */}
        {activeTab === "security" && (
          <div className="grid gap-6">
            {/* Change Passphrase — visible to all internal users */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-muted-foreground" /> Change Passphrase
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">New Passphrase</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Confirm Passphrase</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                  <AsyncActionButton
                    type="submit"
                    size="sm"
                    className="h-8 text-xs"
                    isLoading={isUpdatingPassword}
                    isSuccess={passwordSuccess}
                    isError={passwordError}
                    idleText="Save Password"
                    loadingText="Saving changes..."
                    successText="Changes saved"
                    errorText="Try Again"
                  />
                </form>
              </CardContent>
            </Card>

            {/* Global Sign Out — visible to all internal users */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="bg-muted/10 border-b border-border/40 py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-rose-700">
                  <ShieldAlert className="h-4 w-4" /> Global Sign Out
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Signs you out from every active session across all your devices and browsers simultaneously.
                </p>
                <AsyncActionButton
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                  onClick={handleSignOutAll}
                  isLoading={isSigningOutAll}
                  isSuccess={signOutSuccess}
                  isError={signOutError}
                  idleText="Sign Out All Sessions"
                  loadingText="Terminating sessions..."
                  successText="Signed out — redirecting"
                  errorText="Try Again"
                />
              </CardContent>
            </Card>

            {/* Emergency Force Logout — Administrator only */}
            {isAdministrator && (
              <Card className="border border-destructive/40 shadow-sm">
                <CardHeader className="bg-destructive/5 border-b border-destructive/30 py-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Emergency Force Logout
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Immediately terminates <strong>every active session</strong> across the entire system for all users.
                    Use only in emergency situations such as a suspected security breach.
                    You will also be signed out and must re-authenticate.
                  </p>
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <p className="text-xs text-destructive font-medium">
                      ⚠ This action is irreversible. All users will be immediately redirected to the login page.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setIsEmergencyLogoutOpen(true)}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                    Force Logout All Users
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      </div>
    </div>

    {/* Emergency Logout Dialog — outside main div to avoid z-index issues */}
    <EmergencyLogoutDialog
      open={isEmergencyLogoutOpen}
      onOpenChange={setIsEmergencyLogoutOpen}
    />
  </>
  );
}

