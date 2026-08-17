import * as React from "react";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { isStudentPortalTestMode } from "@/config/feature-flags";
import StudentPortalShell from "./student-portal-shell";

interface AuthenticatedStudentLayoutProps {
  children: React.ReactNode;
}

export default async function AuthenticatedStudentLayout({ children }: AuthenticatedStudentLayoutProps) {
  const isTestMode = isStudentPortalTestMode();

  if (isTestMode) {
    // In Test Mode, skip authentication checks and allow direct access to every student page
    return (
      <StudentPortalShell 
        initialStudentName="Alexander Wright (Demo)" 
        initialEmail="alexander.w@nfsu.ac.in"
      >
        {children}
      </StudentPortalShell>
    );
  }

  // Production authentication flow
  const supabase = await getServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.log("[STUDENT_AUTH_GUARD] Unauthenticated request to /student/* → Redirecting to /student/login");
    redirect("/student/login");
  }

  const userRole = session.user.user_metadata?.role;
  if (userRole && userRole !== "student") {
    console.log(`[STUDENT_AUTH_GUARD] Unauthorized role '${userRole}' attempting student portal access → Redirecting to /dashboard`);
    redirect("/dashboard");
  }

  const initialStudentName = session.user.user_metadata?.full_name || session.user.user_metadata?.username || "Student";
  const initialEmail = session.user.email || "";

  return (
    <StudentPortalShell initialStudentName={initialStudentName} initialEmail={initialEmail}>
      {children}
    </StudentPortalShell>
  );
}
