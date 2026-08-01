"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Branding } from "@/config/branding";
import { toast } from "sonner";

export default function InitialAdminSetupPage() {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);
  const [required, setRequired] = React.useState(false);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function checkRequirement() {
      try {
        const res = await fetch("/api/setup/initial-admin");
        const data = await res.json();
        if (data.initialAdminRequired) {
          setRequired(true);
        } else {
          setRequired(false);
        }
      } catch {
        setRequired(false);
      } finally {
        setChecking(false);
      }
    }
    checkRequirement();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/setup/initial-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create Administrator account.");
      }

      toast.success("Initial Administrator account created successfully!");
      router.push("/login?setup=success");
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
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="text-xl font-bold">System Already Initialized</CardTitle>
            <CardDescription>
              An Administrator account already exists for {Branding.shortName}. Initial setup is permanently disabled.
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
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/20 p-4 text-foreground">
      <Card className="w-full max-w-lg shadow-xl border-primary/20">
        <CardHeader className="space-y-2 text-center border-b pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold font-display tracking-tight text-primary">
            Production Setup — Initial Administrator
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground max-w-sm mx-auto">
            Create the primary Administrator account for {Branding.universityName}. This setup flow runs once.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            {errorMsg && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/15 p-3 text-sm text-destructive font-medium">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Administrator Full Name
              </label>
              <Input
                type="text"
                placeholder="Dr. Admin Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Official Email Address
              </label>
              <Input
                type="email"
                placeholder="admin@nfsu.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Secure Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
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
                  disabled={submitting}
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t pt-4">
            <Button type="submit" disabled={submitting} className="w-full font-semibold h-11">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Administrator Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Initial Administrator
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By creating this account, you assume root administrative authority for ISCMS.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
