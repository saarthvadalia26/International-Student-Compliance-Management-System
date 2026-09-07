"use client";

import * as React from "react";
import { Branding } from "@/config/branding";
import {
  ChartWrapper,
  PercentageDistributionList,
  ComplianceDistributionBreakdown,
  DeliverySuccessMeter,
  TimelinePercentageDistribution,
  DataPoint
} from "@/features/dashboard/charts";
import { fetchAnalyticsChartsLive, revalidateDashboardData } from "@/app/(app)/dashboard/actions";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { useRouter } from "next/navigation";

interface DashboardChartsProps {
  chartsData: {
    studentsByCountry: DataPoint[];
    studentsBySchool: DataPoint[];
    studentsByCourse: DataPoint[];
    efrroExpiryTimeline: DataPoint[];
    monthlyAdmissions: DataPoint[];
    complianceDistribution: DataPoint[];
    notificationSuccessRate: DataPoint[];
  };
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
      console.log("[DASHBOARD_CHARTS_REALTIME] Mutation received. Re-aggregating from database...");
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
  useRealtimeSubscription({ table: "notifications", onEvent: handleLiveChartRefresh });
  const totalStudents = React.useMemo(() => {
    return chartsData.studentsByCountry.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [chartsData.studentsByCountry]);

  const totalNotifications = React.useMemo(() => {
    return chartsData.notificationSuccessRate.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [chartsData.notificationSuccessRate]);

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------------------
          SECTION 1: Core Institutional Compliance & Dispatch Health
          ------------------------------------------------------------------------- */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
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

      {/* -------------------------------------------------------------------------
          SECTION 2: Demographic & Academic Distribution (Percentage Ranked)
          ------------------------------------------------------------------------- */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ChartWrapper
          title="International Students by Country of Origin"
          description="Ranked percentage share and student counts by nationality"
          populationBadge={`${totalStudents.toLocaleString()} Total`}
          isEmpty={chartsData.studentsByCountry.length === 0}
        >
          <PercentageDistributionList
            data={chartsData.studentsByCountry}
            maxItems={6}
            unit="students"
            emptyMessage="No international student nationalities recorded"
          />
        </ChartWrapper>

        <ChartWrapper
          title="Student Enrollment by Academic School"
          description={`Distribution of international enrollments across ${Branding.shortName} faculties`}
          populationBadge={`${totalStudents.toLocaleString()} Total`}
          isEmpty={chartsData.studentsBySchool.length === 0}
        >
          <PercentageDistributionList
            data={chartsData.studentsBySchool}
            maxItems={6}
            unit="students"
            emptyMessage="No school enrollment records available"
          />
        </ChartWrapper>
      </div>

      {/* -------------------------------------------------------------------------
          SECTION 3: Degree Programs & Course Distribution
          ------------------------------------------------------------------------- */}
      <div className="grid gap-6 grid-cols-1">
        <ChartWrapper
          title="Student Enrollment by Academic Degree Program"
          description="Ranked enrollment share across canonical undergraduate, postgraduate, and integrated courses"
          populationBadge={`${totalStudents.toLocaleString()} Enrolled`}
          isEmpty={chartsData.studentsByCourse.length === 0}
        >
          <PercentageDistributionList
            data={chartsData.studentsByCourse}
            maxItems={8}
            unit="students"
            emptyMessage="No program enrollment records available"
          />
        </ChartWrapper>
      </div>

      {/* -------------------------------------------------------------------------
          SECTION 4: Operational Timelines (Upcoming Expiries & Admissions)
          ------------------------------------------------------------------------- */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
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
  );
}
