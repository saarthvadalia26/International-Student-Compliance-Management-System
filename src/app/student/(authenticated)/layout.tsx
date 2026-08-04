import * as React from "react";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import StudentPortalShell from "./student-portal-shell";

interface AuthenticatedStudentLayoutProps {
  children: React.ReactNode;
}

export default async function AuthenticatedStudentLayout({ children }: AuthenticatedStudentLayoutProps) {
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

  const initialStudentName = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "Student";
  const initialEmail = session.user.email || "";

  return (
    <StudentPortalShell initialStudentName={initialStudentName} initialEmail={initialEmail}>
      {children}
    </StudentPortalShell>
  );
}
