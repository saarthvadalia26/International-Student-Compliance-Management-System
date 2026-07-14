"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const StandardBarChart = dynamic(
  () => import("@/features/dashboard/charts").then((mod) => mod.StandardBarChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);
const StandardLineChart = dynamic(
  () => import("@/features/dashboard/charts").then((mod) => mod.StandardLineChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);
const StandardAreaChart = dynamic(
  () => import("@/features/dashboard/charts").then((mod) => mod.StandardAreaChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);
const StandardDonutChart = dynamic(
  () => import("@/features/dashboard/charts").then((mod) => mod.StandardDonutChart),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);
const ChartWrapper = dynamic(
  () => import("@/features/dashboard/charts").then((mod) => mod.ChartWrapper),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);

interface DashboardChartsProps {
  chartsData: {
    studentsByCountry: Array<{ name: string; value: number }>;
    studentsBySchool: Array<{ name: string; value: number }>;
    studentsByCourse: Array<{ name: string; value: number }>;
    efrroExpiryTimeline: Array<{ name: string; value: number }>;
    monthlyAdmissions: Array<{ name: string; value: number }>;
    complianceDistribution: Array<{ name: string; value: number }>;
    notificationSuccessRate: Array<{ name: string; value: number }>;
  };
}

export function DashboardCharts({ chartsData }: DashboardChartsProps) {
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <ChartWrapper 
        title="Students by Country" 
        description="Distribution of international enrollments by country of origin"
        isEmpty={chartsData.studentsByCountry.length === 0}
      >
        <StandardDonutChart data={chartsData.studentsByCountry} />
      </ChartWrapper>

      <ChartWrapper 
        title="Students by School" 
        description="Enrollments across NFSU academic schools"
        isEmpty={chartsData.studentsBySchool.length === 0}
      >
        <StandardBarChart data={chartsData.studentsBySchool} />
      </ChartWrapper>

      <ChartWrapper 
        title="Students by Course" 
        description="Enrollments by academic program codes"
        isEmpty={chartsData.studentsByCourse.length === 0}
      >
        <StandardBarChart data={chartsData.studentsByCourse} />
      </ChartWrapper>

      <ChartWrapper 
        title="eFRRO Expiry Timeline" 
        description="Timeline distribution of upcoming eFRRO expiries"
        isEmpty={chartsData.efrroExpiryTimeline.length === 0}
      >
        <StandardAreaChart data={chartsData.efrroExpiryTimeline} />
      </ChartWrapper>

      <ChartWrapper 
        title="Monthly Admissions" 
        description="Admissions registration rate of students"
        isEmpty={chartsData.monthlyAdmissions.length === 0}
      >
        <StandardLineChart data={chartsData.monthlyAdmissions} />
      </ChartWrapper>

      <ChartWrapper 
        title="Compliance Distribution" 
        description="Overall document verification compliance metrics"
        isEmpty={chartsData.complianceDistribution.length === 0}
      >
        <StandardDonutChart data={chartsData.complianceDistribution} />
      </ChartWrapper>

      <ChartWrapper 
        title="Notification Success Rate" 
        description="WhatsApp & Email reminder success versus failures"
        isEmpty={chartsData.notificationSuccessRate.every(c => c.value === 0)}
      >
        <StandardDonutChart data={chartsData.notificationSuccessRate} />
      </ChartWrapper>
    </div>
  );
}
