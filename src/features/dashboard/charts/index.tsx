"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Loader2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

// Export the percentage-based visualization components
export * from "./percentage-charts";

// Neutral Institutional Palette (Accents only, no color-coded meaning)
export const CHART_COLORS = {
  primary: "oklch(0.205 0 0)",       // Sleek dark dominant
  primaryLight: "oklch(0.4 0 0)",
  muted: "oklch(0.92 0 0)",          // Border/Grid lines
  text: "oklch(0.45 0 0)",           // Axis labels
  background: "oklch(0.99 0 0)",     // Tooltip bg
  series: [
    "oklch(0.205 0 0)",              // primary dark
    "oklch(0.4 0 0)",                // medium dark
    "oklch(0.55 0 0)",               // medium gray
    "oklch(0.7 0 0)",                // light gray
    "oklch(0.85 0 0)"                // subtle gray
  ]
};

interface ChartWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  populationBadge?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  children: React.ReactNode;
}

/**
 * Standard Dashboard Card & Visualization Container.
 * Provides loading states, empty placeholders, borders, title blocks, and accessibility.
 */
export function ChartWrapper({
  title,
  description,
  populationBadge,
  isLoading = false,
  isEmpty = false,
  children,
  className,
  ...props
}: ChartWrapperProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border/60 bg-card p-5 text-card-foreground shadow-sm transition-all hover:shadow-md",
        className
      )}
      {...props}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {populationBadge && (
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 shrink-0">
            {populationBadge}
          </span>
        )}
      </div>

      <div className="relative flex-1 min-h-[220px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground">Loading statistics...</span>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/60 py-8">
            <Inbox className="h-7 w-7 stroke-[1.5]" />
            <span className="text-xs">No analytics data available</span>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col justify-center">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

interface ChartTooltipPayloadItem {
  name: string;
  value: number | string;
  color?: string;
  fill?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
}

/**
 * Shared accessibility-first Tooltip component matching institutional dark styles.
 */
export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-md border border-border/40 bg-zinc-900/95 p-3 shadow-md text-white text-xs space-y-1.5 backdrop-blur-sm animate-fade-in font-sans">
      <p className="font-semibold text-zinc-300">{label}</p>
      <div className="space-y-1">
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-4 justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span 
                className="h-2 w-2 rounded-full shrink-0" 
                style={{ backgroundColor: item.color || item.fill }}
              />
              {item.name}
            </span>
            <span className="font-bold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Legacy chart components preserved for compatibility with clean styling
interface DataItem {
  name: string;
  value: number;
}

export function StandardBarChart({ data, dataKey = "value" }: { data: DataItem[], dataKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke={CHART_COLORS.text} 
          fontSize={10} 
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke={CHART_COLORS.text} 
          fontSize={10} 
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.96 0 0)" }} />
        <Bar dataKey={dataKey} fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StandardLineChart({ data }: { data: DataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke={CHART_COLORS.text} 
          fontSize={10} 
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke={CHART_COLORS.text} 
          fontSize={10} 
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={CHART_COLORS.primary} 
          strokeWidth={2.5} 
          activeDot={{ r: 5 }} 
          dot={{ strokeWidth: 2, r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StandardAreaChart({ data }: { data: DataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/>
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.01}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke={CHART_COLORS.text} 
          fontSize={10} 
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke={CHART_COLORS.text} 
          fontSize={10} 
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={CHART_COLORS.primary} 
          fillOpacity={1} 
          fill="url(#areaGradient)" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StandardDonutChart({ data }: { data: DataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Tooltip content={<ChartTooltip />} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={75}
          paddingAngle={4}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS.series[index % CHART_COLORS.series.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
