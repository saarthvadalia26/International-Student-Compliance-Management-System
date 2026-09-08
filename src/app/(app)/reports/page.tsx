import * as React from "react";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { isAdministrator } from "@/lib/auth/permissions";
import { DimensionalReportsService } from "@/domain/reports/services/dimensional-reports.service";
import { ReportsWorkspace } from "@/features/reports/components/reports-workspace";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  if (!isAdministrator(user)) {
    redirect("/dashboard?unauthorized=1");
  }

  const dimensionalService = new DimensionalReportsService();
  const initialData = await dimensionalService.getDimensionalReports({});

  return <ReportsWorkspace initialData={initialData} />;
}
