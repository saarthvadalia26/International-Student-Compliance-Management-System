"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { verifyTokenAndGetRedirect } from "./actions";
import { Branding } from "@/config/branding";

interface TokenParams {
  token: string;
}

export default function UploadTokenLandingPage({ params }: { params: Promise<TokenParams> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const rawToken = resolvedParams.token;

  const [status, setStatus] = React.useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function executeVerification() {
      try {
        const baseUrl = window.location.origin;
        const res = await verifyTokenAndGetRedirect(rawToken, baseUrl);

        if (!mounted) return;

        if (res.success && res.link) {
          setStatus("success");
          // Redirect the browser to the action magiclink. This logs them in via Supabase Auth
          window.location.replace(res.link);
        } else {
          setStatus("error");
          setErrorMsg(res.error || "Token validation failed.");
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        if (mounted) {
          setStatus("error");
          setErrorMsg("An unexpected connection error occurred.");
        }
      }
    }

    executeVerification();

    return () => {
      mounted = false;
    };
  }, [rawToken]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent dark:from-blue-950/10 -z-10" />

      <div className="w-full max-w-[420px] space-y-6">
        <Card className="border border-border/80 bg-card/75 backdrop-blur-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-semibold">Secure Link Verification</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {Branding.appShortName} Security Gate: Authenticating international student credentials.
            </CardDescription>
          </CardHeader>

          <CardContent className="py-6">
            {status === "verifying" && (
              <div className="flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-xs font-medium text-foreground">Validating token authenticity...</p>
                <p className="text-[10px] text-muted-foreground">Hashing token and setting up secure portal credentials.</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Authentication Validated!</p>
                <p className="text-[10px] text-muted-foreground text-center">Redirecting you to the eFRRO renewal portal page...</p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <Alert variant="destructive" className="py-2.5 px-3">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Validation Error</AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {errorMsg || "The secure link is either invalid, expired, or has already been used."}
                  </AlertDescription>
                </Alert>
                <p className="text-[11px] text-muted-foreground text-center">
                  If this is a mistake, request a new magic link or sign in via email.
                </p>
              </div>
            )}
          </CardContent>

          {status === "error" && (
            <CardFooter className="flex justify-center border-t border-border/50 pt-4">
              <Button size="sm" onClick={() => router.push("/student/login")} className="text-xs">
                Go to Student Sign In
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
