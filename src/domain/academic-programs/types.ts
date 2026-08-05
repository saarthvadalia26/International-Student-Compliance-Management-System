export type AcademicProgramDurationUnit = 
  | "Years" 
  | "Semesters" 
  | "Trimesters" 
  | "Months" 
  | "Credits" 
  | "Research_Months";

export interface AcademicProgram {
  id: string;
  programName: string;
  programCode: string | null;
  displayOrder: number;
  isActive: boolean;
  durationValue: number;
  durationUnit: AcademicProgramDurationUnit | string;
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
  durationValue?: number;
  durationUnit?: AcademicProgramDurationUnit | string;
  schoolName?: string | null;
  academicLevel?: string | null;
}

export interface UpdateProgramDto {
  programName?: string;
  programCode?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  durationValue?: number;
  durationUnit?: AcademicProgramDurationUnit | string;
  schoolName?: string | null;
  academicLevel?: string | null;
}
