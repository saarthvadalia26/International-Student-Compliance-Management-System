import * as React from "react";
import { Wrench } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Branding } from "@/config/branding";
import { isStudentPortalEnabled } from "@/config/feature-flags";

export default function StudentRootLayout({ children }: { children: React.ReactNode }) {
  const isEnabled = isStudentPortalEnabled();

  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[440px] text-center space-y-4">
          <img src={Branding.logoPaths.logo} alt={Branding.universityName} className="h-16 w-16 mx-auto object-contain" />
          
          <Card className="border border-amber-500/30 bg-card shadow-xl rounded-2xl p-6 text-card-foreground">
            <div className="flex justify-center mb-3 text-amber-600 dark:text-amber-400">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Wrench className="h-8 w-8" />
              </div>
            </div>
            
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg font-bold text-foreground">Student Portal</CardTitle>
            </CardHeader>
            
            <CardContent className="p-0 space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">
                The Student Portal is currently unavailable while final testing and verification are being completed.
              </p>
              <p>
                Please contact the International Student Office if you require immediate assistance.
              </p>
            </CardContent>

            <CardFooter className="p-0 pt-4 mt-4 border-t border-border/50 flex flex-col gap-2">
              <p className="text-[11px] text-muted-foreground">
                Staff or Administrator?{" "}
                <a href="/login" className="text-primary font-semibold hover:underline">
                  Staff Portal Login
                </a>
              </p>
            </CardFooter>
          </Card>

          <p className="text-[11px] text-muted-foreground">
            {Branding.universityName} • {Branding.appName}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
