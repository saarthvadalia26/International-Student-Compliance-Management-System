import { 
  FullStudentProfile, 
  RegisterStudentInput, 
  UpdateStudentInput, 
  StudentFilterOptions 
} from "./student.types";
import { IStudentRepository } from "./student.repository";
import { IValidationService } from "../validation/validation.service";

export interface IStudentService {
  registerStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  getStudentById(id: string): Promise<FullStudentProfile | null>;
  updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile>;
  listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]>;
  archiveStudent(id: string, actorId: string | null): Promise<boolean>;
}

export class StudentService implements IStudentService {
  constructor(
    private repository: IStudentRepository,
    private validationService: IValidationService
  ) {}

  async registerStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile> {
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
        dateOfBirth: input.dateOfBirth.toISOString().split("T")[0]
      },
      contact: {
        email: input.email,
        phoneHome: input.phoneHome,
        phoneLocal: input.phoneLocal,
        permanentAddress: input.permanentAddress,
        localAddress: input.localAddress
      },
      academic: {
        programCode: input.programCode,
        admissionDate: input.admissionDate.toISOString().split("T")[0],
        expectedGraduation: input.expectedGraduation.toISOString().split("T")[0],
        currentSemester: input.currentSemester || 1,
        academicStatus: "good_standing"
      }
    });

    // 2. Perform duplicate check
    const existing = await this.repository.getStudentByRegistrationNumber(input.registrationNumber);
    if (existing) {
      throw new Error(`Student with registration number ${input.registrationNumber} already exists.`);
    }

    // 3. Persist record
    return this.repository.createStudent(input, actorId);
  }

  async getStudentById(id: string): Promise<FullStudentProfile | null> {
    if (!id.trim()) {
      throw new Error("Invalid student ID.");
    }
    return this.repository.getStudentById(id);
  }

  async updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile> {
    if (!id.trim()) {
      throw new Error("Invalid student ID.");
    }
    
    // Zod validation would occur here based on the specific update schemas
    return this.repository.updateStudent(id, input, actorId);
  }

  async listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]> {
    return this.repository.listStudents(filters);
  }

  async archiveStudent(id: string, actorId: string | null): Promise<boolean> {
    if (!id.trim()) {
      throw new Error("Invalid student ID.");
    }
    return this.repository.softDeleteStudent(id, actorId);
  }
}
