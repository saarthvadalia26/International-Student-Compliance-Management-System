/**
 * Scholarship Schemes Master Data Types
 * National Forensic Sciences University (NFSU) - ISCMS
 */

export interface ScholarshipScheme {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  studentUsageCount?: number;
}

export interface CreateScholarshipSchemeDto {
  name: string;
  code?: string | null;
  description?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateScholarshipSchemeDto {
  name?: string;
  code?: string | null;
  description?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

export interface ScholarshipFilterOptions {
  searchQuery?: string;
  status?: "all" | "active" | "inactive";
}
