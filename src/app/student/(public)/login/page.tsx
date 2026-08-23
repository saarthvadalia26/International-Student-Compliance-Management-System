"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCheck, MessageSquare, AlertCircle, Loader2, ArrowLeft, RefreshCw, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { TurnstileStub } from "@/components/ui/turnstile-stub";
import { Branding } from "@/config/branding";
import { isStudentPortalTestMode, isStudentPortalOtpEnabled } from "@/config/feature-flags";
import { 
  loginStudentByIdentifierAction, 
  requestStudentWhatsAppOtpByIdentifierAction, 
  verifyStudentWhatsAppOtpByIdentifierAction 
} from "../../actions";

export default function StudentLoginPage() {
  const router = useRouter();
  const otpModeActive = isStudentPortalOtpEnabled();

  // Redirect immediately if test mode is active
  React.useEffect(() => {
    if (isStudentPortalTestMode()) {
      router.replace("/student/dashboard");
    }
  }, [router]);

  // Step 1 vs Step 2 state (for OTP mode)
  const [step, setStep] = React.useState<"identifier_input" | "otp_verify">("identifier_input");
  
  // Registration / Passport Number & OTP inputs
  const [identifierInput, setIdentifierInput] = React.useState("");
  const [confirmedRegNo, setConfirmedRegNo] = React.useState("");
  const [maskedPhone, setMaskedPhone] = React.useState("");
  const [otpDigits, setOtpDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  
  // Turnstile security check — skip if Turnstile is not configured
  const isTurnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(
    isTurnstileConfigured ? null : "no-turnstile-configured"
  );
  
  // Status flags
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  
  // Resend cooldown timer
  const [cooldown, setCooldown] = React.useState(0);

  // OTP Inputs refs for auto-focusing
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown effect
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Prefetch dashboard
  React.useEffect(() => {
    router.prefetch("/student/dashboard");
  }, [router]);

  // Direct Identifier Login (Enrollment Number OR Passport Number)
  const handleDirectIdentifierLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    setError(null);
    const identifier = identifierInput.trim();

    if (!identifier || identifier.length < 2) {
      setError("Please enter your University Enrollment Number or Passport Number.");
      return;
    }

    if (!turnstileToken && isTurnstileConfigured) {
      setError("Please complete the security check.");
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : null;
      const res = await loginStudentByIdentifierAction(
        identifier,
        turnstileToken,
        null,
        navigator.userAgent,
        baseUrl
      );

      if (res.success) {
        toast.success("Authentication successful!", {
          description: `Welcome ${res.studentName || "Student"}. Connecting to student portal...`
        });

        // 1. Preferred & Bulletproof: Direct token verification on client without external redirects
        if (res.tokenHash) {
          try {
            const { getBrowserSupabase } = await import("@/lib/supabase/browser");
            const supabase = getBrowserSupabase();
            const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
              token_hash: res.tokenHash,
              type: "magiclink"
            });

            if (!verifyErr && verifyData?.session) {
              // Smooth Next.js client-side navigation
              router.refresh();
              router.replace("/student/dashboard");
              return;
            }
            if (verifyErr) {
              console.warn("[STUDENT_CLIENT_AUTH_WARN] Direct token_hash verify failed, falling back:", verifyErr.message);
            }
          } catch (clientAuthErr) {
            console.warn("[STUDENT_CLIENT_AUTH_WARN] Client verify exception:", clientAuthErr);
          }
        }

        // 2. Fallback: Action Link
        if (res.magicLink) {
          window.location.replace(res.magicLink);
          return;
        }

        // 3. Fallback: Relative internal navigation
        router.refresh();
        router.replace("/student/dashboard");
      } else {
        setError(res.error || "Unable to locate an active student record. Please verify your credentials.");
        toast.error(res.error || "Authentication Failed");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to process student authentication.");
      toast.error("Network request failed.");
      setIsLoading(false);
    }
  };

  // Request WhatsApp OTP by Registration / Enrollment Number (Active only when OTP is enabled)
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    setError(null);
    const identifier = identifierInput.trim();

    if (!identifier || identifier.length < 2) {
      setError("Please enter a valid Registration or Enrollment Number.");
      return;
    }

    if (!turnstileToken && isTurnstileConfigured) {
      setError("Please complete the security check.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestStudentWhatsAppOtpByIdentifierAction(identifier, turnstileToken);

      if (res.success) {
        setConfirmedRegNo(res.registrationNumber || identifier.toUpperCase());
        setMaskedPhone(res.maskedPhone || "+91 ***** **000");
        setStep("otp_verify");
        setCooldown(res.cooldownSeconds || 60);
        setError(null);
        toast.success("Verification code sent!", {
          description: `A 6-digit verification code was sent via WhatsApp to ${res.maskedPhone || "your registered number"}.`
        });

        // Auto focus first OTP input box
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(res.error || "Unable to locate student record or send verification code.");
        toast.error(res.error || "OTP Dispatch Failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to process WhatsApp OTP request.");
      toast.error("Network request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Single OTP Digit Change Handler
  const handleOtpDigitChange = (index: number, value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue && value !== "") return;

    const newDigits = [...otpDigits];
    
    // Paste support
    if (numericValue.length > 1) {
      const pasted = numericValue.substring(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setOtpDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    newDigits[index] = numericValue;
    setOtpDigits(newDigits);

    // Auto-advance focus
    if (numericValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Keyboard navigation for OTP digits
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Verify OTP submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    setError(null);
    const fullOtp = otpDigits.join("");

    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifying(true);

    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : null;
      const res = await verifyStudentWhatsAppOtpByIdentifierAction(
        identifierInput.trim(),
        fullOtp,
        null,
        navigator.userAgent,
        baseUrl
      );

      if (res.success) {
        toast.success("OTP Verified Successfully!", {
          description: "Establishing secure student session..."
        });

        // 1. Preferred & Bulletproof: Direct token verification on client without external redirects
        if (res.tokenHash) {
          try {
            const { getBrowserSupabase } = await import("@/lib/supabase/browser");
            const supabase = getBrowserSupabase();
            const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
              token_hash: res.tokenHash,
              type: "magiclink"
            });

            if (!verifyErr && verifyData?.session) {
              router.refresh();
              router.replace("/student/dashboard");
              return;
            }
            if (verifyErr) {
              console.warn("[STUDENT_OTP_VERIFY_WARN] Direct token_hash verify failed, falling back:", verifyErr.message);
            }
          } catch (clientAuthErr) {
            console.warn("[STUDENT_OTP_VERIFY_WARN] Client verify exception:", clientAuthErr);
          }
        }

        // 2. Fallback: Action Link
        if (res.magicLink) {
          window.location.replace(res.magicLink);
          return;
        }

        // 3. Fallback: Relative internal navigation
        router.refresh();
        router.replace("/student/dashboard");
      } else {
        setError(res.error || "Incorrect verification code. Please try again.");
        toast.error("Verification Failed");
        setIsVerifying(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "OTP verification failed.");
      toast.error("Authentication Error");
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full space-y-6 max-w-[420px] mx-auto">
      {/* University Branding Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <img src={Branding.logoPaths.logo} alt={Branding.universityName} className="h-16 w-16 object-contain" />
        <div>
          <h1 className="text-lg font-display font-bold tracking-tight text-foreground">{Branding.universityName}</h1>
          <p className="text-xs font-caption text-muted-foreground mt-0.5">{Branding.appName} Student Portal</p>
        </div>
      </div>

      <Card className="border border-border/80 bg-card/90 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
        {!otpModeActive ? (
          /* =========================================================================
             DIRECT IDENTIFIER LOGIN (v0.2.0 Active Mode: Enrollment No. or Passport No.)
             ========================================================================= */
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Student Portal Login
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Login with your University Enrollment Number or Passport Number.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2.5 px-3.5 text-xs rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Authentication Error</AlertTitle>
                  <AlertDescription className="text-[11px] mt-0.5">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleDirectIdentifierLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="student-identifier" className="text-xs font-semibold text-foreground">
                    Enrollment Number or Passport Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="student-identifier"
                    type="text"
                    placeholder="e.g. NFSU/2026/001 or UK78945612"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    disabled={isLoading}
                    autoComplete="username"
                    autoFocus
                    className="h-10 text-xs rounded-xl font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enter the enrollment number issued by the university or your active passport number.
                  </p>
                </div>

                <div className="pt-1">
                  <TurnstileStub onVerify={(token) => setTurnstileToken(token)} />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !identifierInput.trim() || !turnstileToken}
                  className="w-full text-xs font-semibold rounded-xl h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Verifying Credentials...</>
                  ) : (
                    <><ArrowRight className="h-4 w-4" /> Continue to Portal</>
                  )}
                </Button>
              </form>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Secure university compliance portal with encrypted session authentication.</span>
              </div>
            </CardContent>
          </>
        ) : step === "identifier_input" ? (
          /* =========================================================================
             OTP MODE - STEP 1 (Identifier Entry for WhatsApp Code)
             ========================================================================= */
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Student Login
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Enter your Registration or Enrollment Number to receive a verification code via WhatsApp.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2.5 px-3.5 text-xs rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Verification Error</AlertTitle>
                  <AlertDescription className="text-[11px] mt-0.5">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="otp-registration-number" className="text-xs font-semibold text-foreground">
                    Enrollment / Registration Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="otp-registration-number"
                    type="text"
                    placeholder="e.g. NFSU/2026/001"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    disabled={isLoading}
                    className="h-10 text-xs rounded-xl font-mono uppercase"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Your unique university identity assigned during admission
                  </p>
                </div>

                <div className="pt-1">
                  <TurnstileStub onVerify={(token) => setTurnstileToken(token)} />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !identifierInput.trim() || !turnstileToken}
                  className="w-full text-xs font-semibold rounded-xl h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Locating & Sending Code...</>
                  ) : (
                    <><MessageSquare className="h-4 w-4" /> Send WhatsApp Code</>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          /* =========================================================================
             OTP MODE - STEP 2 (6-Digit OTP Verification)
             ========================================================================= */
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Verify WhatsApp OTP
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                A 6-digit verification code has been sent to the registered WhatsApp number{" "}
                <span className="font-semibold text-foreground font-mono">{maskedPhone}</span> associated with Enrollment No:{" "}
                <span className="font-semibold text-foreground font-mono">{confirmedRegNo}</span>.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <p className="text-xs font-medium text-foreground text-center">
                Enter the six-digit code below to continue.
              </p>

              {error && (
                <Alert variant="destructive" className="py-2.5 px-3.5 text-xs rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Verification Error</AlertTitle>
                  <AlertDescription className="text-[11px] mt-0.5">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex justify-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      disabled={isVerifying}
                      className="w-10 h-12 text-center text-lg font-bold rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  ))}
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    disabled={isVerifying || otpDigits.join("").length !== 6}
                    className="w-full text-xs font-semibold rounded-xl h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isVerifying ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Verifying Code...</>
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep("identifier_input");
                        setOtpDigits(["", "", "", "", "", ""]);
                        setError(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground gap-1 px-2 h-8"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change Enrollment No.
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={cooldown > 0 || isLoading}
                      onClick={() => handleRequestOtp()}
                      className="text-xs text-emerald-600 hover:text-emerald-700 gap-1 px-2 h-8"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Resend OTP"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </>
        )}

        <CardFooter className="bg-muted/40 border-t border-border/60 p-3 text-center">
          <p className="text-[11px] text-muted-foreground w-full">
            Staff or Administrator?{" "}
            <a href="/login" className="text-primary font-semibold hover:underline">
              Staff Portal Login
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
