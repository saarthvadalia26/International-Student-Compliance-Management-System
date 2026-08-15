import { 
  FullStudentProfile, 
  RegisterStudentInput, 
  UpdateStudentInput, 
  StudentFilterOptions 
} from "./student.types";
import { IStudentRepository, SupabaseStudentRepository } from "./student.repository";
import { IValidationService, ZodValidationService } from "../validation/validation.service";
import { AcademicAdjustmentRecord } from "@/domain/academic/services/semester-progression.service";

export interface IStudentService {
  registerStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  getStudentById(id: string): Promise<FullStudentProfile | null>;
  updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]>;
  archiveStudent(id: string, actorId: string | null): Promise<boolean>;
  recordAcademicAdjustment(
    studentId: string,
    input: {
      adjustmentType: "semester_override" | "semester_repeat" | "academic_leave" | "course_transfer" | "extension" | "admission_date_correction";
      effectiveDate: string;
      previousSemester?: number | null;
      adjustedSemester?: number | null;
      previousProgramCode?: string | null;
      newProgramCode?: string | null;
      reason: string;
      notes?: string | null;
    },
    actorId: string | null
  ): Promise<{ success: boolean; adjustmentId?: string; currentSemester?: number; expectedGraduation?: string; error?: string }>;
  getAcademicAdjustments(studentId: string): Promise<AcademicAdjustmentRecord[]>;
}

export class StudentService implements IStudentService {
  constructor(
    private repository: IStudentRepository = new SupabaseStudentRepository(),
    private validationService: IValidationService = new ZodValidationService()
  ) {}

  private toDateString(val: Date | string | undefined | null): string {
    if (!val) return "";
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return "";
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const str = String(val).trim();
    if (!str) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (str.includes("T")) return str.split("T")[0];
    const slashParts = str.split("/");
    if (slashParts.length === 3) {
      if (slashParts[0].length === 4) {
        return `${slashParts[0]}-${slashParts[1].padStart(2, "0")}-${slashParts[2].padStart(2, "0")}`;
      } else if (slashParts[2].length === 4) {
        return `${slashParts[2]}-${slashParts[0].padStart(2, "0")}-${slashParts[1].padStart(2, "0")}`;
      }
    }
    const dt = new Date(str);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return str;
  }

  async registerStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile> {
    const dobStr = this.toDateString(input.dateOfBirth);
    const admStr = this.toDateString(input.admissionDate);
    const gradStr = this.toDateString(input.expectedGraduation);

    // 1. Validate payload using Zod service
    await this.validationService.validateStudent({
      student: {
        registrationNumber: input.registrationNumber,
        status: "active"
      },
      personal: {
        fullName: input.fullName,
        nationalityCode: input.nationalityCode,
        gender: input.gender,
        dateOfBirth: dobStr
      },
      contact: {
        email: input.email,
        phoneHome: input.phoneHome,
        phoneLocal: input.phoneLocal || null,
        permanentAddress: input.permanentAddress,
        localAddress: input.localAddress || null
      },
      academic: {
        programCode: input.programCode,
        admissionDate: admStr,
        expectedGraduation: gradStr,
        currentSemester: input.currentSemester || 1,
        academicStatus: "good_standing"
      }
    });

    // 2. Perform duplicate registration number check if provided
    if (input.registrationNumber && input.registrationNumber.trim()) {
      const existing = await this.repository.getStudentByRegistrationNumber(input.registrationNumber.trim());
      if (existing) {
        throw new Error(`Student with enrollment number "${input.registrationNumber}" is already registered.`);
      }
    }

    // 3. Persist record
    return this.repository.createStudent(input, actorId);
  }

  async getStudentById(id: string): Promise<FullStudentProfile | null> {
    if (!id || !id.trim()) {
      throw new Error("Invalid student ID.");
    }
    return this.repository.getStudentById(id.trim());
  }

  async updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile> {
    if (!id || !id.trim()) {
      throw new Error("Invalid student ID.");
    }
    return this.repository.updateStudent(id.trim(), input, actorId);
  }

  async listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]> {
    return this.repository.listStudents(filters);
  }

  async archiveStudent(id: string, actorId: string | null): Promise<boolean> {
    if (!id || !id.trim()) {
      throw new Error("Invalid student ID.");
    }
    return this.repository.softDeleteStudent(id.trim(), actorId);
  }

  async recordAcademicAdjustment(
    studentId: string,
    input: {
      adjustmentType: "semester_override" | "semester_repeat" | "academic_leave" | "course_transfer" | "extension" | "admission_date_correction";
      effectiveDate: string;
      previousSemester?: number | null;
      adjustedSemester?: number | null;
      previousProgramCode?: string | null;
      newProgramCode?: string | null;
      reason: string;
      notes?: string | null;
    },
    actorId: string | null
  ): Promise<{ success: boolean; adjustmentId?: string; currentSemester?: number; expectedGraduation?: string; error?: string }> {
    if (!studentId || !studentId.trim()) {
      throw new Error("Invalid student ID.");
    }
    return this.repository.recordAcademicAdjustment(studentId.trim(), input, actorId);
  }

  async getAcademicAdjustments(studentId: string): Promise<AcademicAdjustmentRecord[]> {
    if (!studentId || !studentId.trim()) {
      throw new Error("Invalid student ID.");
    }
    return this.repository.getAcademicAdjustments(studentId.trim());
  }
}

