"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { TurnstileStub } from "@/components/ui/turnstile-stub";
import { Branding } from "@/config/branding";

export default function StudentLoginPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  
  const [email, setEmail] = React.useState("");
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  // Prefetch student dashboard on mount
  React.useEffect(() => {
    router.prefetch("/student/dashboard");
  }, [router]);

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSuccess) return;
    setError(null);
    setIsSuccess(false);
    setIsError(false);

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid student email address.");
      return;
    }
    
    if (!turnstileToken) {
      setError("Please complete the security check.");
      return;
    }

    setIsLoading(true);

    try {
      const loginEmail = email.trim();

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: loginEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/student/dashboard`
        }
      });

      if (otpError) {
        if (otpError.message.toLowerCase().includes("rate limit") || otpError.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        } else if (otpError.message.toLowerCase().includes("disabled") || otpError.status === 403) {
          throw new Error("Your account has been disabled.");
        } else if (otpError.status === 500 || otpError.status === 502 || otpError.status === 503) {
          throw new Error("Authentication service temporarily unavailable.");
        } else {
          throw new Error("Failed to send secure login link. Please try again.");
        }
      }

      setIsSuccess(true);
      toast.success("Authentication link sent successfully.", {
        description: "Please check your inbox for the secure authentication link.",
      });
    } catch (err: unknown) {
      setIsError(true);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || "Failed to send magic link.");
      toast.error("Unable to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Portal Branding Header */}
      <div className="flex flex-col items-center text-center space-y-3">
        <img src={Branding.logoPaths.logo} alt={Branding.universityName} className="h-16 w-16 object-contain" />
        <div>
          <h1 className="text-lg font-display font-bold tracking-tight text-foreground">{Branding.universityName}</h1>
          <p className="text-xs font-caption text-muted-foreground mt-0.5">{Branding.appName} Student Portal</p>
        </div>
      </div>

      <Card className="border border-border/80 bg-card/90 backdrop-blur-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg font-semibold">Student Sign In</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Enter your registered student email. We will send a secure magic link to log you in immediately.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleMagicLinkSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5 px-3">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Sign In Issue</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {isSuccess && (
              <Alert className="py-2.5 px-3 border-emerald-500/35 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                <Mail className="h-4 w-4 text-emerald-500" />
                <AlertTitle className="text-xs font-semibold">Magic Link Sent</AlertTitle>
                <AlertDescription className="text-xs">
                  Verification link sent to <strong>{email}</strong>. Check your email to verify.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="email">
                Student Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="student@nfsu.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isSuccess}
                autoComplete="email"
                className="h-9 text-sm"
              />
            </div>

            <div className="pt-2 flex justify-center w-full">
              <TurnstileStub 
                onVerify={(token) => setTurnstileToken(token)} 
                onError={() => setError("Security check failed. Please refresh the page.")}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-4">
            <AsyncActionButton
              type="submit"
              className="w-full h-9 text-sm font-semibold"
              disabled={!turnstileToken || isLoading}
              isLoading={isLoading}
              isSuccess={isSuccess}
              isError={isError}
              idleText="Send Magic Link"
              loadingText="Sending Link..."
              successText="Link sent successfully"
              errorText="Try Again"
            />
          </CardFooter>
        </form>
      </Card>
      
      <p className="text-[11px] text-center text-muted-foreground/80">
        Only registered {Branding.shortName} international students can authenticate.
      </p>
    </div>
  );
}
