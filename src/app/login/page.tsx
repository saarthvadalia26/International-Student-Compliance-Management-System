"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    // Clear mock auth session on page load
    localStorage.removeItem("isms_session");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple client-side input validations
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    // Mock network latency
    setTimeout(() => {
      // In enterprise software, let's use standard default credentials 'admin'/'admin'
      if (username === "admin" && password === "admin") {
        localStorage.setItem("isms_session", JSON.stringify({ username, role: "administrator", token: "mock-token-xyz-987" }));
        toast.success("Authentication successful. Welcome to ISMS.", {
          description: "Redirecting you to the workspace dashboard...",
        });
        router.push("/dashboard");
      } else {
        setError("Invalid username or password. Use 'admin' / 'admin' for demo access.");
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* Subtle Background Radial Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent dark:from-blue-950/10 -z-10" />

      <div className="w-full max-w-[400px] space-y-6">
        {/* Portal Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight text-foreground">ISMS Admin Portal</h1>
            <p className="text-sm font-caption text-muted-foreground">International Student Compliance Management System</p>
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
              <Button type="submit" className="w-full h-9 text-sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
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
