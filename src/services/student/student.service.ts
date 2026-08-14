import { 
  FullStudentProfile, 
  RegisterStudentInput, 
  UpdateStudentInput, 
  StudentFilterOptions 
} from "./student.types";
import { IStudentRepository, SupabaseStudentRepository } from "./student.repository";
import { IValidationService, ZodValidationService } from "../validation/validation.service";

export interface IStudentService {
  registerStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  getStudentById(id: string): Promise<FullStudentProfile | null>;
  updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]>;
  archiveStudent(id: string, actorId: string | null): Promise<boolean>;
}

export class StudentService implements IStudentService {
  constructor(
    private repository: IStudentRepository = new SupabaseStudentRepository(),
    private validationService: IValidationService = new ZodValidationService()
  ) {}

  private toDateString(val: Date | string | undefined | null): string {
    if (!val) return "";
    if (typeof val === "string") return val.includes("T") ? val.split("T")[0] : val;
    return val.toISOString().split("T")[0];
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

    // 2. Perform duplicate registration number check
    const existing = await this.repository.getStudentByRegistrationNumber(input.registrationNumber);
    if (existing) {
      throw new Error(`Student with registration number "${input.registrationNumber}" is already registered.`);
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
}
