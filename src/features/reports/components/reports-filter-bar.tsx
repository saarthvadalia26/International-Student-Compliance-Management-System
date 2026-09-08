"use client";

import * as React from "react";
import { Filter, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DimensionReportFilters,
  DimensionFilterOptions,
} from "@/domain/reports/types/dimensional-reports";

interface ReportsFilterBarProps {
  options: DimensionFilterOptions;
  filters: DimensionReportFilters;
  onChange: (filters: DimensionReportFilters) => void;
  onReset: () => void;
  isPending?: boolean;
}

export function ReportsFilterBar({
  options,
  filters,
  onChange,
  onReset,
  isPending = false,
}: ReportsFilterBarProps) {
  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleSelectChange = (key: keyof DimensionReportFilters, value: string) => {
    const updated = { ...filters };
    if (!value || value === "ALL") {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    onChange(updated);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-4">
      {/* Top bar with count & clear */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Global Analytics Filters
          </span>
          {activeCount > 0 ? (
            <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium">
              {activeCount} active {activeCount === 1 ? "filter" : "filters"}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Showing all registered students</span>
          )}
        </div>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isPending}
            className="h-7 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            Reset all
          </Button>
        )}
      </div>

      {/* Filter Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Academic Year */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
          <select
            value={filters.academicYear || "ALL"}
            onChange={(e) => handleSelectChange("academicYear", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Academic Years</option>
            {options.academicYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Campus */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">NFSU Campus</label>
          <select
            value={filters.campus || "ALL"}
            onChange={(e) => handleSelectChange("campus", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Campuses</option>
            {options.campuses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Admission Category */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Admission Category</label>
          <select
            value={filters.category || "ALL"}
            onChange={(e) => handleSelectChange("category", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Categories</option>
            {options.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Academic School */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Academic School</label>
          <select
            value={filters.schoolId || "ALL"}
            onChange={(e) => handleSelectChange("schoolId", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Schools</option>
            {options.schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Academic Program */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Academic Program</label>
          <select
            value={filters.programId || "ALL"}
            onChange={(e) => handleSelectChange("programId", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Programs</option>
            {options.programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.code ? `(${p.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Scholarship / Funding */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Funding Type</label>
          <select
            value={filters.fundingType || "ALL"}
            onChange={(e) => handleSelectChange("fundingType", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Funding Types</option>
            {options.fundingTypes.map((ft) => (
              <option key={ft} value={ft}>
                {ft}
              </option>
            ))}
          </select>
        </div>

        {/* 7. Student Status */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Student Status</label>
          <select
            value={filters.studentStatus || "ALL"}
            onChange={(e) => handleSelectChange("studentStatus", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Student Statuses</option>
            {options.studentStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* 8. Nationality / Country */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Nationality</label>
          <select
            value={filters.countryCode || "ALL"}
            onChange={(e) => handleSelectChange("countryCode", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Countries</option>
            {options.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {/* 9. Compliance Status */}
        <div className="space-y-1 sm:col-span-2 md:col-span-1 lg:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Compliance Status</label>
          <select
            value={filters.complianceStatus || "ALL"}
            onChange={(e) => handleSelectChange("complianceStatus", e.target.value)}
            disabled={isPending}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="ALL">All Compliance Levels</option>
            {options.complianceStatuses.map((cs) => (
              <option key={cs} value={cs}>
                {cs}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applied Filter Pills */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground mr-1">Active filters:</span>
          {Object.entries(filters).map(([k, v]) => {
            if (!v) return null;
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-foreground"
              >
                <span className="font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>{" "}
                {String(v)}
                <button
                  type="button"
                  onClick={() => handleSelectChange(k as keyof DimensionReportFilters, "")}
                  className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
