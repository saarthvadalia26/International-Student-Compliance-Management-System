export interface AcademicProgram {
  id: string;
  programName: string;
  programCode: string | null;
  displayOrder: number;
  isActive: boolean;
  schoolName?: string | null;
  academicLevel?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface CreateProgramDto {
  programName: string;
  programCode?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  schoolName?: string | null;
  academicLevel?: string | null;
}

export interface UpdateProgramDto {
  programName?: string;
  programCode?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  schoolName?: string | null;
  academicLevel?: string | null;
}
