"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Loader2, 
  User, 
  Building, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Check,
  Calendar,
  Globe,
  Clock,
  Languages
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Branding } from "@/config/branding";
import { toast } from "sonner";

// Predefined Timezone Options (IANA Compliant)
const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia / Kolkata (IST — India +05:30)", region: "Asia" },
  { value: "Asia/Dubai", label: "Asia / Dubai (GST — Gulf +04:00)", region: "Asia" },
  { value: "Asia/Singapore", label: "Asia / Singapore (SGT +08:00)", region: "Asia" },
  { value: "Asia/Tokyo", label: "Asia / Tokyo (JST +09:00)", region: "Asia" },
  { value: "Europe/London", label: "Europe / London (GMT/BST +00:00)", region: "Europe" },
  { value: "Europe/Paris", label: "Europe / Paris (CET/CEST +01:00)", region: "Europe" },
  { value: "America/New_York", label: "America / New York (EST/EDT -05:00)", region: "Americas" },
  { value: "America/Los_Angeles", label: "America / Los Angeles (PST/PDT -08:00)", region: "Americas" },
  { value: "Australia/Sydney", label: "Australia / Sydney (AEST +10:00)", region: "Oceania" },
  { value: "UTC", label: "UTC (Coordinated Universal Time +00:00)", region: "Global" },
];

// Predefined Language Options (Code to Human Name Mapping)
const LANGUAGE_OPTIONS = [
  { code: "en", name: "English", native: "English (Default)" },
  { code: "hi", name: "Hindi", native: "Hindi (हिन्दी)" },
  { code: "gu", name: "Gujarati", native: "Gujarati (ગુજરાતી)" },
  { code: "ar", name: "Arabic", native: "Arabic (العربية)" },
  { code: "fr", name: "French", native: "French (Français)" },
  { code: "es", name: "Spanish", native: "Spanish (Español)" },
  { code: "zh", name: "Chinese", native: "Chinese (中文)" },
  { code: "ja", name: "Japanese", native: "Japanese (日本語)" },
];

// Predefined Date Format Presets
const DATE_FORMAT_PRESETS = [
  { format: "DD/MM/YYYY", label: "DD/MM/YYYY (Standard UK/India — e.g. 25/12/2026)" },
  { format: "MM/DD/YYYY", label: "MM/DD/YYYY (US Format — e.g. 12/25/2026)" },
  { format: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO Standard — e.g. 2026-12-25)" },
  { format: "DD-MM-YYYY", label: "DD-MM-YYYY (Hyphen Separated — e.g. 25-12-2026)" },
  { format: "YYYY/MM/DD", label: "YYYY/MM/DD (Year First — e.g. 2026/12/25)" },
];

export default function InitialSetupWizardPage() {
  const router = useRouter();

  const [checking, setChecking] = React.useState(true);
  const [required, setRequired] = React.useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = React.useState(false);

  // Wizard active step (1 to 4)
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Step 1: Administrator Account State
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("admin@nfsu.ac.in");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Step 2: University Information State
  const [universityName, setUniversityName] = React.useState(Branding.universityName);
  const [shortName, setShortName] = React.useState(Branding.shortName);
  const [timezone, setTimezone] = React.useState("Asia/Kolkata");
  const [defaultLanguage, setDefaultLanguage] = React.useState("en");
  const [academicYear, setAcademicYear] = React.useState("2026-2027");
  const [logoUrl, setLogoUrl] = React.useState("");

  // Step 3: System Preferences State
  const [reminderSchedule, setReminderSchedule] = React.useState("30,15,7,1");
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = React.useState(60);
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = React.useState(10485760); // 10 MB
  
  // Date Format Builder State (No free-text input allowed)
  const [dateFormatPreset, setDateFormatPreset] = React.useState("DD/MM/YYYY");
  const [dateFormatPart1, setDateFormatPart1] = React.useState("DD");
  const [dateFormatPart2, setDateFormatPart2] = React.useState("MM");
  const [dateFormatPart3, setDateFormatPart3] = React.useState("YYYY");
  const [dateSeparator, setDateSeparator] = React.useState("/");
  const [customBuilderActive, setCustomBuilderActive] = React.useState(false);

  const [enableAuditLogging, setEnableAuditLogging] = React.useState(true);
  const [enableMaintenanceNotifications, setEnableMaintenanceNotifications] = React.useState(true);

  // Submission State
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function checkRequirement() {
      try {
        const res = await fetch("/api/setup/initial-admin");
        const data = await res.json();
        if (data.initialAdminRequired) {
          setRequired(true);
          const isRecovery = Boolean(data.isRecoveryMode && data.hasOperationalData && !data.isFreshInstallation);
          setIsRecoveryMode(isRecovery);
        } else {
          setRequired(false);
          setIsRecoveryMode(false);
        }
      } catch {
        setRequired(false);
        setIsRecoveryMode(false);
      } finally {
        setChecking(false);
      }
    }
    checkRequirement();
  }, []);

  // Compute final canonical date format string
  const computedDateFormat = React.useMemo(() => {
    if (!customBuilderActive) {
      return dateFormatPreset;
    }
    return `${dateFormatPart1}${dateSeparator}${dateFormatPart2}${dateSeparator}${dateFormatPart3}`;
  }, [customBuilderActive, dateFormatPreset, dateFormatPart1, dateSeparator, dateFormatPart2, dateFormatPart3]);

  // Validation for Step 1
  const validateStep1 = (): boolean => {
    setErrorMsg(null);
    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("A valid official university email is required.");
      return false;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return false;
    }
    if (!/[A-Z]/.test(password) || !/[0-9!@#$%^&*]/.test(password)) {
      setErrorMsg("Password must contain at least one uppercase letter and one number or special character.");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return false;
    }
    return true;
  };

  // Validation for Step 2
  const validateStep2 = (): boolean => {
    setErrorMsg(null);
    if (!universityName.trim()) {
      setErrorMsg("University name is required.");
      return false;
    }
    if (!shortName.trim()) {
      setErrorMsg("Short name is required.");
      return false;
    }
    if (!timezone.trim()) {
      setErrorMsg("Time zone selection is required.");
      return false;
    }
    if (!defaultLanguage.trim()) {
      setErrorMsg("Default language selection is required.");
      return false;
    }
    return true;
  };

  // Validation for Step 3
  const validateStep3 = (): boolean => {
    setErrorMsg(null);
    if (!reminderSchedule.trim()) {
      setErrorMsg("Reminder schedule is required.");
      return false;
    }
    if (customBuilderActive && (dateFormatPart1 === dateFormatPart2 || dateFormatPart2 === dateFormatPart3 || dateFormatPart1 === dateFormatPart3)) {
      setErrorMsg("Custom date format parts must be unique (Day, Month, Year).");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;

    if (step < 4) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleFinishSetup = async () => {
    setErrorMsg(null);

    const payload = {
      admin: {
        fullName,
        email,
        password,
      },
      university: {
        universityName,
        shortName,
        timezone,
        defaultLanguage,
        academicYear,
        logoUrl: logoUrl || undefined,
      },
      preferences: {
        reminderSchedule,
        sessionTimeoutMinutes,
        maxUploadSizeBytes,
        dateFormat: computedDateFormat,
        enableAuditLogging,
        enableMaintenanceNotifications,
      },
    };

    try {
      setSubmitting(true);
      const res = await fetch("/api/setup/initial-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to complete setup wizard.");
      }

      toast.success("Initial Setup Wizard completed successfully!");
      router.push("/login?setup=complete");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Checking system initialization status...</span>
        </div>
      </div>
    );
  }

  if (!required) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="text-xl font-bold">403 — Setup Disabled</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              The One-Time Initial Setup Wizard has already been completed for {Branding.shortName}. Initial setup is permanently disabled.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/login")} className="w-full">
              Proceed to Staff Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/20 p-4 text-foreground">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Wizard Header Progress Indicator */}
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-3 px-1">
            <span>One-Time Initial Setup Wizard</span>
            <span className="text-primary font-bold">Step {step} of 4</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { num: 1, label: "Admin Account", icon: User },
              { num: 2, label: "University Details", icon: Building },
              { num: 3, label: "Preferences", icon: Sliders },
              { num: 4, label: "Review & Finish", icon: CheckCircle2 },
            ].map((s) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;

              return (
                <div
                  key={s.num}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg text-center transition-all ${
                    isCurrent
                      ? "bg-primary/10 text-primary font-bold border border-primary/20"
                      : isCompleted
                      ? "text-foreground font-medium"
                      : "text-muted-foreground opacity-60"
                  }`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isCompleted ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  <span className="text-[11px] truncate hidden sm:block">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Card Workspace */}
        <Card className="shadow-xl border-primary/20">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-xl font-bold font-display flex items-center gap-2 text-primary">
              {step === 1 && <User className="h-5 w-5 text-primary" />}
              {step === 2 && <Building className="h-5 w-5 text-primary" />}
              {step === 3 && <Sliders className="h-5 w-5 text-primary" />}
              {step === 4 && <Sparkles className="h-5 w-5 text-primary" />}

              {step === 1 && "Step 1 — Create Administrator Account"}
              {step === 2 && "Step 2 — University Information"}
              {step === 3 && "Step 3 — Application System Preferences"}
              {step === 4 && "Step 4 — Final Review & Initialization"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {step === 1 && "Configure root Administrator credentials. Account automatically receives administrator role."}
              {step === 2 && "Set institutional branding and localization defaults for NFSU."}
              {step === 3 && "Set operational schedules, upload limits, and date format preferences."}
              {step === 4 && "Review your configuration choices below before completing permanent system initialization."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/15 p-3 text-xs text-destructive font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: Admin Account */}
            {step === 1 && (
              <div className="space-y-4">
                {isRecoveryMode && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Administrator Account Recovery Mode</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      System configuration was detected, but no active Administrator user exists in Supabase. Creating a new Administrator will restore full system access while preserving all existing university configuration and compliance records.
                    </p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Dr. Administrator Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Official University Email
                  </label>
                  <Input
                    type="email"
                    placeholder="admin@nfsu.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">Min. 8 chars, 1 uppercase, 1 number/symbol.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: University Information (Structured Dropdowns) */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      University Name
                    </label>
                    <Input
                      value={universityName}
                      onChange={(e) => setUniversityName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Short Name
                    </label>
                    <Input
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Time Zone Searchable/Structured Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Time Zone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium text-foreground ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Default Language Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Languages className="h-3.5 w-3.5 text-primary" /> Default Language
                    </label>
                    <select
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium text-foreground ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.native}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Academic Year
                    </label>
                    <Input
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    University Logo URL (Optional)
                  </label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: System Preferences (No Free-Text Date Format) */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reminder Schedule (Days Before Due)
                    </label>
                    <Input
                      value={reminderSchedule}
                      onChange={(e) => setReminderSchedule(e.target.value)}
                      placeholder="30,15,7,1"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Session Timeout (Minutes)
                    </label>
                    <Input
                      type="number"
                      value={sessionTimeoutMinutes}
                      onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Max Document Upload Size (MB)
                    </label>
                    <Input
                      type="number"
                      value={Math.round(maxUploadSizeBytes / 1048576)}
                      onChange={(e) => setMaxUploadSizeBytes(Number(e.target.value) * 1048576)}
                      required
                    />
                  </div>

                  {/* Date Format Preset Selector & Dynamic Builder */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" /> Date Format
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomBuilderActive(!customBuilderActive)}
                        className="text-[10px] text-primary hover:underline font-semibold"
                      >
                        {customBuilderActive ? "Use Presets" : "Build Custom Order"}
                      </button>
                    </div>

                    {!customBuilderActive ? (
                      <select
                        value={dateFormatPreset}
                        onChange={(e) => setDateFormatPreset(e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-2 text-xs font-medium text-foreground ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {DATE_FORMAT_PRESETS.map((fmt) => (
                          <option key={fmt.format} value={fmt.format}>
                            {fmt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5">
                        <select
                          value={dateFormatPart1}
                          onChange={(e) => setDateFormatPart1(e.target.value)}
                          className="h-10 rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground"
                        >
                          <option value="DD">DD (Day)</option>
                          <option value="MM">MM (Month)</option>
                          <option value="YYYY">YYYY (Year)</option>
                        </select>
                        
                        <select
                          value={dateSeparator}
                          onChange={(e) => setDateSeparator(e.target.value)}
                          className="h-10 rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground"
                        >
                          <option value="/">/ (Slash)</option>
                          <option value="-">- (Hyphen)</option>
                          <option value=".">. (Dot)</option>
                        </select>

                        <select
                          value={dateFormatPart2}
                          onChange={(e) => setDateFormatPart2(e.target.value)}
                          className="h-10 rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground"
                        >
                          <option value="MM">MM (Month)</option>
                          <option value="DD">DD (Day)</option>
                          <option value="YYYY">YYYY (Year)</option>
                        </select>

                        <select
                          value={dateFormatPart3}
                          onChange={(e) => setDateFormatPart3(e.target.value)}
                          className="h-10 rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground"
                        >
                          <option value="YYYY">YYYY (Year)</option>
                          <option value="MM">MM (Month)</option>
                          <option value="DD">DD (Day)</option>
                        </select>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 px-1">
                      <span>Generated Format:</span>
                      <code className="font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                        {computedDateFormat}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/20">
                    <input
                      type="checkbox"
                      checked={enableAuditLogging}
                      onChange={(e) => setEnableAuditLogging(e.target.checked)}
                      className="h-4 w-4 rounded border-primary text-primary"
                    />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Enable Immutable Audit Logging</div>
                      <div className="text-[11px] text-muted-foreground">Record all security, role change, and logout events to audit_log table.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/20">
                    <input
                      type="checkbox"
                      checked={enableMaintenanceNotifications}
                      onChange={(e) => setEnableMaintenanceNotifications(e.target.checked)}
                      className="h-4 w-4 rounded border-primary text-primary"
                    />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Enable System Maintenance Alerts</div>
                      <div className="text-[11px] text-muted-foreground">Display critical system health and maintenance notices in administrator dashboard.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 4: Summary & Finish */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-primary/20 pb-2">
                    <User className="h-4 w-4" /> Root Administrator
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Name:</span> <strong className="text-foreground">{fullName}</strong></div>
                    <div><span className="text-muted-foreground">Email:</span> <strong className="text-foreground">{email}</strong></div>
                    <div><span className="text-muted-foreground">Role:</span> <strong className="text-primary">administrator</strong></div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    <Building className="h-4 w-4 text-muted-foreground" /> University Metadata
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Institution:</span> <strong className="text-foreground">{universityName}</strong></div>
                    <div><span className="text-muted-foreground">Short Code:</span> <strong className="text-foreground">{shortName}</strong></div>
                    <div><span className="text-muted-foreground">Timezone:</span> <strong className="text-foreground">{timezone}</strong></div>
                    <div><span className="text-muted-foreground">Language:</span> <strong className="text-foreground">{LANGUAGE_OPTIONS.find(l => l.code === defaultLanguage)?.native || defaultLanguage} ({defaultLanguage})</strong></div>
                    <div><span className="text-muted-foreground">Academic Year:</span> <strong className="text-foreground">{academicYear}</strong></div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                    <Sliders className="h-4 w-4 text-muted-foreground" /> System Preferences
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Reminders:</span> <strong className="text-foreground">{reminderSchedule} days</strong></div>
                    <div><span className="text-muted-foreground">Timeout:</span> <strong className="text-foreground">{sessionTimeoutMinutes} mins</strong></div>
                    <div><span className="text-muted-foreground">Upload Size:</span> <strong className="text-foreground">{Math.round(maxUploadSizeBytes / 1048576)} MB</strong></div>
                    <div><span className="text-muted-foreground">Date Format:</span> <strong className="text-primary font-mono font-bold">{computedDateFormat}</strong></div>
                    <div><span className="text-muted-foreground">Audit Trail:</span> <strong className="text-emerald-600">{enableAuditLogging ? "Enabled" : "Disabled"}</strong></div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t pt-4">
            {step > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={submitting}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button type="button" size="sm" onClick={handleNext}>
                Next <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" size="sm" disabled={submitting} onClick={handleFinishSetup} className="font-bold px-6">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Completing Setup...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Finish Setup & Initialize System
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
