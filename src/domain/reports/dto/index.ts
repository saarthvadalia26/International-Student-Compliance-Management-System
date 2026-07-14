import { ReportFilters, ReportPagination } from "../types";

export interface ReportQueryInput {
  filters: ReportFilters;
  pagination: ReportPagination;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ExportReportInput {
  filters: ReportFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  format: "csv" | "excel";
  actorId: string;
  actorEmail: string;
}
