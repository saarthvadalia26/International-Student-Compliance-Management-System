"use client";

import * as React from "react";
import { Branding } from "@/config/branding";
import {
  ChartWrapper,
  ComplianceDistributionBreakdown,
  DeliverySuccessMeter,
  TimelinePercentageDistribution,
  AnalyticsExecutiveSummaryStrip,
  CompleteDistributionAnalyticsCard,
  AcademicHierarchyCard,
  DashboardChartsData
} from "@/features/dashboard/charts";
import { fetchAnalyticsChartsLive, revalidateDashboardData } from "@/app/(app)/dashboard/actions";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { useRouter } from "next/navigation";

interface DashboardChartsProps {
  chartsData: DashboardChartsData;
}

export function DashboardCharts({ chartsData: initialChartsData }: DashboardChartsProps) {
  const router = useRouter();
  const [chartsData, setChartsData] = React.useState(initialChartsData);

  // Synchronize state if parent server component streams fresh initial data
  React.useEffect(() => {
    setChartsData(initialChartsData);
  }, [initialChartsData]);

  // Live Re-aggregation on database mutations
  const handleLiveChartRefresh = React.useCallback(async () => {
    try {
      console.log("[DASHBOARD_CHARTS_REALTIME] Mutation received. Re-aggregating authoritative database dataset...");
      const freshData = await fetchAnalyticsChartsLive();
      if (freshData) {
        setChartsData(freshData);
      }
      // Revalidate server cache in background
      await revalidateDashboardData();
      router.refresh();
    } catch (err) {
      console.warn("[DASHBOARD_CHARTS_REALTIME] Live refetch warning:", err);
    }
  }, [router]);

  // Subscribe to all tables that drive dashboard charts
  useRealtimeSubscription({ table: "students", onEvent: handleLiveChartRefresh });
  useRealtimeSubscription({ table: "student_personal", onEvent: handleLiveChartRefresh });
  useRealtimeSubscription({ table: "student_academic", onEvent: handleLiveChartRefresh });
  useRealtimeSubscription({ table: "student_snapshot", onEvent: handleLiveChartRefresh });
  useRealtimeSubscription({ table: "academic_programs", onEvent: handleLiveChartRefresh });
  useRealtimeSubscription({ table: "schools", onEvent: handleLiveChartRefresh });
  useRealtimeSubscription({ table: "campuses", onEvent: handleLiveChartRefresh });
  useRealtimeSubscription({ table: "notifications", onEvent: handleLiveChartRefresh });

  const totalStudents = chartsData.totalActiveStudents || chartsData.studentsByCountry.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const totalNotifications = React.useMemo(() => {
    return chartsData.notificationSuccessRate.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [chartsData.notificationSuccessRate]);

  return (
    <div className="space-y-8 sm:space-y-10 min-w-0 max-w-full">
      {/* -------------------------------------------------------------------------
          SECTION 1: Core Institutional Compliance & Dispatch Health
          ------------------------------------------------------------------------- */}
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase tracking-wider truncate">
              Institutional Verification & Dispatch Health
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            Authoritative Roster Compliance
          </span>
        </div>

        <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2 min-w-0">
          <ChartWrapper
            title="Overall Document Compliance Distribution"
            description="Verification status across active international student body"
            populationBadge={`${totalStudents.toLocaleString()} Students`}
            isEmpty={chartsData.complianceDistribution.length === 0}
          >
            <ComplianceDistributionBreakdown data={chartsData.complianceDistribution} />
          </ChartWrapper>

          <ChartWrapper
            title="Automated Reminder Delivery Success"
            description="Delivery completion rate for automated WhatsApp & Email compliance alerts"
            populationBadge={`${totalNotifications.toLocaleString()} Dispatches`}
            isEmpty={chartsData.notificationSuccessRate.every(c => c.value === 0)}
          >
            <DeliverySuccessMeter data={chartsData.notificationSuccessRate} />
          </ChartWrapper>
        </div>
      </div>

      {/* -------------------------------------------------------------------------
          SECTION 2: LEVEL 1 — Executive Summary Metric Strip
          ------------------------------------------------------------------------- */}
      <div className="space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5 border-b border-border/40 pb-2.5 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase tracking-wider">
                Institutional Roster & Coverage Overview
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Complete demographic reach, academic faculties, and campus footprint of the active international student body
            </p>
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:block">
            Level 1 Roster Summary
          </div>
        </div>

        <AnalyticsExecutiveSummaryStrip
          totalStudents={totalStudents}
          distinctCountries={chartsData.distinctCountriesCount ?? chartsData.studentsByCountry.length}
          distinctSchools={chartsData.distinctSchoolsCount ?? chartsData.studentsBySchool.length}
          distinctPrograms={chartsData.distinctProgramsCount ?? (chartsData.studentsByProgram || chartsData.studentsByCourse).length}
          distinctCampuses={chartsData.distinctCampusesCount ?? (chartsData.studentsByCampus?.length || 1)}
        />
      </div>

      {/* -------------------------------------------------------------------------
          SECTION 3: LEVEL 2 & 3 — Demographic & Regional Analytics (Chart + Table)
          ------------------------------------------------------------------------- */}
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase tracking-wider truncate">
              Demographic & Regional Footprint
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            Level 2 Sovereign Nationality & Regional Campuses
          </span>
        </div>

        <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2 min-w-0">
          <CompleteDistributionAnalyticsCard
            title="International Students by Country of Origin"
            description="Ranked percentage share, sovereign nations, and student counts by nationality"
            unit="students"
            data={chartsData.studentsByCountry}
            totalStudents={totalStudents}
            distinctCountLabel="Nations"
            searchPlaceholder="Search country or ISO code..."
            categoryColumnHeader="Country of Origin"
            secondaryColumnHeader="ISO Code"
            emptyMessage="No international student nationalities recorded"
          />

          <CompleteDistributionAnalyticsCard
            title="Student Enrollment by NFSU Campus"
            description={`Distribution of international enrollments across ${Branding.shortName} regional campuses`}
            unit="students"
            data={chartsData.studentsByCampus || []}
            totalStudents={totalStudents}
            distinctCountLabel="Campuses"
            searchPlaceholder="Search campus or location..."
            categoryColumnHeader="NFSU Campus"
            secondaryColumnHeader="Location / Code"
            emptyMessage="No campus enrollment records available"
          />
        </div>
      </div>

      {/* -------------------------------------------------------------------------
          SECTION 4: LEVEL 2 & 3 — Academic Program & Faculty Distribution (Chart + Table)
          ------------------------------------------------------------------------- */}
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase tracking-wider truncate">
              Academic Faculties & Curriculum
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            Level 3 Degree Programs & University Faculties
          </span>
        </div>

        <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2 min-w-0">
          <CompleteDistributionAnalyticsCard
            title="Student Enrollment by Academic School"
            description={`Distribution of international enrollments across ${Branding.shortName} academic faculties`}
            unit="students"
            data={chartsData.studentsBySchool}
            totalStudents={totalStudents}
            distinctCountLabel="Schools"
            searchPlaceholder="Search academic school..."
            categoryColumnHeader="Academic School / Faculty"
            secondaryColumnHeader="Faculty Code"
            emptyMessage="No school enrollment records available"
          />

          <CompleteDistributionAnalyticsCard
            title="Student Enrollment by Academic Degree Program"
            description="Enrollment distribution across undergraduate, postgraduate, integrated, and doctoral curriculum"
            unit="students"
            data={chartsData.studentsByProgram || chartsData.studentsByCourse}
            totalStudents={totalStudents}
            distinctCountLabel="Programs"
            searchPlaceholder="Search degree program or level..."
            categoryColumnHeader="Degree Program"
            secondaryColumnHeader="Academic Level"
            emptyMessage="No program enrollment records available"
          />
        </div>
      </div>

      {/* -------------------------------------------------------------------------
          SECTION 5: LEVEL 4 — Course-Level Academic Hierarchy
          ------------------------------------------------------------------------- */}
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase tracking-wider truncate">
              Academic Hierarchy & Course Matrix
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            Level 4 Multi-Tier Curriculum Structure
          </span>
        </div>

        <AcademicHierarchyCard
          schools={chartsData.academicHierarchy || []}
          totalStudents={totalStudents}
          emptyMessage="No academic hierarchy records available"
        />
      </div>

      {/* -------------------------------------------------------------------------
          SECTION 6: Operational Timelines (Upcoming Expiries & Admissions)
          ------------------------------------------------------------------------- */}
      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase tracking-wider truncate">
              Operational Timelines & Cohort Intake
            </h2>
          </div>
          <span className="text-[10px] sm:text-[11px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
            Permit Renewals & Admissions
          </span>
        </div>

        <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2 min-w-0">
          <ChartWrapper
            title="Upcoming eFRRO Expiry Timeline"
            description="Monthly distribution and concentration of permits requiring renewal"
            isEmpty={chartsData.efrroExpiryTimeline.length === 0}
          >
            <TimelinePercentageDistribution
              data={chartsData.efrroExpiryTimeline}
              metricLabel="Expiring Permits"
              emptyMessage="No upcoming eFRRO expiries recorded in near-term milestones"
            />
          </ChartWrapper>

          <ChartWrapper
            title="Admissions Intake Distribution"
            description="Registration volume and cohort share across admission periods"
            isEmpty={chartsData.monthlyAdmissions.length === 0}
          >
            <TimelinePercentageDistribution
              data={chartsData.monthlyAdmissions}
              metricLabel="Admissions"
              emptyMessage="No admission data available"
            />
          </ChartWrapper>
        </div>
      </div>
    </div>
  );
}
