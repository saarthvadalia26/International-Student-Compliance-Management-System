import { z } from "zod";

export const ReportFiltersSchema = z.object({
  search: z.string().optional(),
  academicYear: z.string().optional(),
  school: z.string().optional(),
  course: z.string().optional(),
  country: z.string().optional(),
  gender: z.string().optional(),
  admissionCategory: z.string().optional(),
  complianceStatus: z.string().optional(),
  efrroStatus: z.string().optional(),
  expiringWithinDays: z.preprocess((val) => {
    if (typeof val === "string") return parseInt(val, 10);
    return val;
  }, z.number().int().positive().optional()),
});

export const ReportPaginationSchema = z.object({
  page: z.preprocess((val) => {
    if (typeof val === "string") return parseInt(val, 10);
    return val;
  }, z.number().int().positive().default(1)),
  limit: z.preprocess((val) => {
    if (typeof val === "string") return parseInt(val, 10);
    return val;
  }, z.number().int().positive().default(10)),
});
