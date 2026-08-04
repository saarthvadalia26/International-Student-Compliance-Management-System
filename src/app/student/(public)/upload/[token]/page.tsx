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
    <div className="w-full max-w-[420px] space-y-6 mx-auto py-10">
      <div className="flex flex-col items-center text-center space-y-3">
        <img src={Branding.logoPaths.logo} alt={Branding.universityName} className="h-16 w-16 object-contain" />
        <div>
          <h1 className="text-lg font-bold text-foreground">{Branding.universityName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Secure Document Upload Verification</p>
        </div>
      </div>

      <Card className="border border-border/80 bg-card shadow-xl">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-base font-semibold">Validating Upload Token</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Please wait while we verify your one-time link.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center py-6">
          {status === "verifying" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Verifying security token...</span>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-3 text-emerald-600">
              <KeyRound className="h-8 w-8 text-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold">Token Verified! Redirecting to portal...</span>
            </div>
          )}

          {status === "error" && (
            <Alert variant="destructive" className="py-3">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Verification Failed</AlertTitle>
              <AlertDescription className="text-xs">
                {errorMsg || "The upload link is invalid or has expired."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        {status === "error" && (
          <CardFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => router.push("/student/login")}
            >
              Return to Student Login
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
