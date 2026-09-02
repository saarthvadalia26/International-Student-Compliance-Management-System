/**
 * NFSU Campuses Master Data Types
 * National Forensic Sciences University (NFSU) - ISCMS
 */

export interface Campus {
  id: string;
  name: string;
  code: string | null;
  location: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  studentUsageCount?: number;
}

export interface CreateCampusDto {
  name: string;
  code?: string | null;
  location?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateCampusDto {
  name?: string;
  code?: string | null;
  location?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

export interface CampusFilterOptions {
  searchQuery?: string;
  status?: "all" | "active" | "inactive";
}
