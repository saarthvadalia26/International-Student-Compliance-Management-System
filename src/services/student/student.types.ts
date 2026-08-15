export type StudentStatus = "active" | "suspended" | "graduated" | "withdrawn";
export type AcademicStatus = "good_standing" | "probation" | "suspended";
export type RelationshipType = "parent" | "guardian" | "local_sponsor";

export interface Student {
  id: string;
  registrationNumber: string;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface StudentPersonal {
  studentId: string;
  fullName: string;
  nationalityCode: string;
  gender?: "male" | "female" | "other" | "transgender" | "prefer_not_to_say";
  dateOfBirth: Date;
  bloodGroup: string | null;
  religion: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface StudentContact {
  studentId: string;
  email: string;
  phoneHome: string;
  phoneLocal: string | null;
  permanentAddress: string;
  localAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface StudentAcademic {
  studentId: string;
  programCode: string;
  admissionDate: Date;
  expectedGraduation: Date;
  currentSemester: number;
  academicStatus: AcademicStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface StudentRelationship {
  id: string;
  studentId: string;
  relationshipType: RelationshipType;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface StudentEmbassy {
  studentId: string;
  embassyName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface FullStudentProfile {
  student: Student;
  personal: StudentPersonal;
  contact: StudentContact;
  academic: StudentAcademic;
  relationships: StudentRelationship[];
  embassy: StudentEmbassy | null;
}

export interface RegisterStudentInput {
  registrationNumber: string;
  fullName: string;
  nationalityCode: string;
  gender?: "male" | "female" | "other" | "transgender" | "prefer_not_to_say";
  dateOfBirth: Date | string;
  email: string;
  phoneHome: string;
  phoneLocal?: string;
  permanentAddress: string;
  localAddress?: string;
  programCode: string;
  admissionDate: Date | string;
  expectedGraduation: Date | string;
  currentSemester?: number;
  relationshipType: RelationshipType;
  relationshipName: string;
  relationshipPhone: string;
  relationshipEmail?: string;
  relationshipAddress?: string;
  embassyName?: string;
  embassyAddress?: string;
  embassyCity?: string;
  embassyCountry?: string;
  embassyPhone?: string;
  embassyEmail?: string;
  embassyWebsite?: string;
  embassyContactPerson?: string;
  passportNumber?: string;
  passportIssueDate?: Date | string;
  passportExpiry?: Date | string;
  passportPlaceOfIssue?: string;
  visaNumber?: string;
  visaIssueDate?: Date | string;
  visaExpiry?: Date | string;
  visaType?: string;
}

export interface UpdateStudentInput {
  status?: StudentStatus;
  fullName?: string;
  gender?: "male" | "female" | "other" | "transgender" | "prefer_not_to_say";
  dateOfBirth?: Date;
  email?: string;
  phoneHome?: string;
  phoneLocal?: string;
  permanentAddress?: string;
  localAddress?: string;
  programCode?: string;
  currentSemester?: number;
  academicStatus?: AcademicStatus;
  // Embassy / Consular updates
  embassyName?: string;
  embassyAddress?: string;
  embassyCity?: string;
  embassyCountry?: string;
  embassyPhone?: string;
  embassyEmail?: string;
  embassyWebsite?: string;
  embassyContactPerson?: string;
}

export interface StudentFilterOptions {
  searchQuery?: string;
  academicStatus?: AcademicStatus | "all";
  complianceStatus?: string | "all";
  nationalityCode?: string;
  programCode?: string;
  limit?: number;
  offset?: number;
}
