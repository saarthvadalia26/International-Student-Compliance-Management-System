import { 
  FullStudentProfile, 
  RegisterStudentInput, 
  UpdateStudentInput, 
  StudentFilterOptions 
} from "./student.types";

export interface IStudentRepository {
  /**
   * Insert a new student transaction block (students + detail tables)
   */
  createStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile>;

  /**
   * Retrieve a complete student profile by ID
   */
  getStudentById(id: string): Promise<FullStudentProfile | null>;

  /**
   * Retrieve a student profile by registration number
   */
  getStudentByRegistrationNumber(regNum: string): Promise<FullStudentProfile | null>;

  /**
   * Update student details (mutates target personal/contact/academic details)
   */
  updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile>;

  /**
   * Search and filter student profiles matching criteria (DDS search support)
   */
  listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]>;

  /**
   * Soft-delete student record (sets deleted_at value)
   */
  softDeleteStudent(id: string, actorId: string | null): Promise<boolean>;
}

export class SupabaseStudentRepository implements IStudentRepository {
  constructor() {
    // DB driver connection settings will configure here in future sprints
  }

  async createStudent(input: RegisterStudentInput, actorId: string | null): Promise<FullStudentProfile> {
    console.log("[STUDENT_REPOSITORY] Registering student via Supabase:", input.fullName, "by actor:", actorId);
    throw new Error("Supabase integration is not yet active. Method not implemented.");
  }

  async getStudentById(id: string): Promise<FullStudentProfile | null> {
    console.log("[STUDENT_REPOSITORY] Querying student profile by ID:", id);
    return null;
  }

  async getStudentByRegistrationNumber(regNum: string): Promise<FullStudentProfile | null> {
    console.log("[STUDENT_REPOSITORY] Querying student profile by registration number:", regNum);
    return null;
  }

  async updateStudent(id: string, input: UpdateStudentInput, actorId: string | null): Promise<FullStudentProfile> {
    console.log("[STUDENT_REPOSITORY] Updating student profile in Supabase:", id, input, actorId);
    throw new Error("Supabase integration is not yet active. Method not implemented.");
  }

  async listStudents(filters: StudentFilterOptions): Promise<FullStudentProfile[]> {
    console.log("[STUDENT_REPOSITORY] Filtering and scanning students list from database with filters:", filters);
    return [];
  }

  async softDeleteStudent(id: string, actorId: string | null): Promise<boolean> {
    console.log("[STUDENT_REPOSITORY] Performing soft delete on student record:", id, "by actor:", actorId);
    return false;
  }
}
