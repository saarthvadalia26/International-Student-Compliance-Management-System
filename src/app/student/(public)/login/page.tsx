"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageSquare, AlertCircle, Loader2, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { TurnstileStub } from "@/components/ui/turnstile-stub";
import { Branding } from "@/config/branding";
import { requestStudentWhatsAppOtpAction, verifyStudentWhatsAppOtpAction } from "../../actions";

export default function StudentLoginPage() {
  const router = useRouter();

  // Step 1 vs Step 2 state
  const [step, setStep] = React.useState<"mobile_input" | "otp_verify">("mobile_input");
  
  // Mobile & OTP inputs
  const [mobileNumber, setMobileNumber] = React.useState("");
  const [maskedPhone, setMaskedPhone] = React.useState("");
  const [otpDigits, setOtpDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  
  // Turnstile security check
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  
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

  // Request WhatsApp OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    setError(null);
    const cleanedPhone = mobileNumber.trim();

    if (!cleanedPhone || cleanedPhone.replace(/\D/g, "").length < 8) {
      setError("Please enter a valid registered mobile number.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the security check.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestStudentWhatsAppOtpAction(cleanedPhone, turnstileToken);

      if (res.success) {
        setMaskedPhone(res.maskedPhone || cleanedPhone);
        setStep("otp_verify");
        setCooldown(res.cooldownSeconds || 60);
        setError(null);
        toast.success("Verification code sent!", {
          description: `A 6-digit verification code was sent via WhatsApp to ${res.maskedPhone || cleanedPhone}.`
        });

        // Auto focus first OTP input box
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(res.error || "Unable to send verification code. Please check your mobile number.");
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

  // Keyboard navigation for OTP digits (Backspace, Arrow keys)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying) return;

    setError(null);
    const fullOtp = otpDigits.join("");

    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifying(true);

    try {
      const res = await verifyStudentWhatsAppOtpAction(
        mobileNumber.trim(),
        fullOtp,
        null,
        navigator.userAgent
      );

      if (res.success && res.magicLink) {
        toast.success("OTP Verified Successfully!", {
          description: "Establishing secure student session..."
        });

        // Execute session magiclink establishing browser session
        window.location.replace(res.magicLink);
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
        {step === "mobile_input" ? (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                Student Login
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Enter your registered mobile number to receive a secure one-time verification code via WhatsApp.
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

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="mobile-input" className="text-xs font-medium text-foreground block">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mobile-input"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      disabled={isLoading}
                      className="pl-9 text-xs h-10 rounded-xl"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Include country code (e.g. +91 for India)
                  </p>
                </div>

                <div className="pt-1">
                  <TurnstileStub onVerify={(token) => setTurnstileToken(token)} />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !mobileNumber.trim() || !turnstileToken}
                  className="w-full text-xs font-semibold rounded-xl h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending Code...</>
                  ) : (
                    <><MessageSquare className="h-4 w-4" /> Send WhatsApp Code</>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Verify WhatsApp OTP
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                A verification code has been sent to your registered WhatsApp number{" "}
                <span className="font-semibold text-foreground">{maskedPhone}</span>.
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
                {/* 6-Digit PIN Inputs */}
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
                        setStep("mobile_input");
                        setOtpDigits(["", "", "", "", "", ""]);
                        setError(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground gap-1 px-2 h-8"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change Mobile Number
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
