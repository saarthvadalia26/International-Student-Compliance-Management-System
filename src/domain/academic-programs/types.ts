export * from "./academic-level";

export type AcademicProgramDurationUnit = 
  | "Years" 
  | "Semesters" 
  | "Trimesters" 
  | "Months" 
  | "Credits" 
  | "Research_Months";

export type SemesterDurationUnit = "months" | "weeks" | "days";

export interface AcademicProgram {
  id: string;
  programName: string;
  programCode: string | null;
  displayOrder: number;
  isActive: boolean;
  durationValue: number;
  durationUnit: AcademicProgramDurationUnit | string;
  totalSemesters: number;
  semesterDuration: number;
  semesterDurationUnit: SemesterDurationUnit;
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
  totalSemesters?: number;
  semesterDuration?: number;
  semesterDurationUnit?: SemesterDurationUnit;
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
  totalSemesters?: number;
  semesterDuration?: number;
  semesterDurationUnit?: SemesterDurationUnit;
  schoolName?: string | null;
  academicLevel?: string | null;
}
