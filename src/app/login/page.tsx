"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { toast } from "sonner";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { Branding } from "@/config/branding";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple client-side input validations
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);

    try {
      const supabase = getAdminSupabase();
      const email = `${username}@nfsu-staff.in`;
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        setError(authError.message);
        setIsError(true);
        setIsLoading(false);
      } else if (data?.session) {
        setIsSuccess(true);
        toast.success("Profile updated successfully.", {
          description: "Redirecting you to the workspace dashboard...",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setError("An unexpected authentication error occurred.");
        setIsError(true);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || "An unexpected error occurred.");
      setIsError(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* Subtle Background Radial Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent dark:from-blue-950/10 -z-10" />

      <div className="w-full max-w-[420px] space-y-6">
        {/* Portal Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <img src={Branding.logoPaths.logo} alt={Branding.universityName} className="h-16 w-16 object-contain" />
          <div>
            <h1 className="text-lg font-display font-bold tracking-tight text-foreground">{Branding.universityName}</h1>
            <p className="text-xs font-caption text-muted-foreground mt-0.5">{Branding.appName}</p>
          </div>
        </div>

        <Card className="border border-border/80 bg-card/75 backdrop-blur-md shadow-xl dark:shadow-black/40">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-h2 font-semibold">Sign in to Workspace</CardTitle>
            <CardDescription className="text-xs font-caption">
              Enter your staff credentials to access student compliance dashboards.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2.5 px-3">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Authentication Alert</AlertTitle>
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="username">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <AsyncActionButton
                type="submit"
                className="w-full h-9 text-sm"
                isLoading={isLoading}
                isSuccess={isSuccess}
                isError={isError}
                idleText="Sign In"
                loadingText="Authenticating..."
                successText="Changes saved"
                errorText="Try Again"
              />
              <div className="text-[11px] text-center text-muted-foreground bg-muted/30 w-full py-1.5 rounded-md border border-border/50 font-caption">
                Demo Credentials: <span className="font-semibold text-foreground">admin</span> / <span className="font-semibold text-foreground">admin</span>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer info */}
        <p className="text-[11px] text-center text-muted-foreground/80 font-caption">
          Authorized university personnel only. All access is logged and audited.
        </p>
      </div>
    </div>
  );
}
