export type StudentStatus = "active" | "suspended" | "graduated" | "withdrawn";
export type AcademicStatus = "good_standing" | "probation" | "suspended";
export type RelationshipType = "parent" | "guardian" | "local_sponsor";

export interface Student {
  id: string;
  registrationNumber: string | null;
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
  nationalityCode: string | null;
  gender?: "male" | "female" | "other" | "transgender" | "prefer_not_to_say" | null;
  dateOfBirth: Date | null;
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
  email: string | null;
  phoneHome: string | null;
  phoneLocal: string | null;
  permanentAddress: string | null;
  localAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface StudentAcademic {
  studentId: string;
  programCode: string | null;
  admissionDate: Date | null;
  expectedGraduation: Date | null;
  currentSemester: number | null;
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
  registrationNumber?: string | null;
  fullName: string;
  nationalityCode?: string | null;
  gender?: "male" | "female" | "other" | "transgender" | "prefer_not_to_say" | null;
  dateOfBirth?: Date | string | null;
  email?: string | null;
  phoneHome?: string | null;
  phoneLocal?: string | null;
  permanentAddress?: string | null;
  localAddress?: string | null;
  programCode?: string | null;
  admissionDate?: Date | string | null;
  expectedGraduation?: Date | string | null;
  currentSemester?: number | null;
  relationshipType?: RelationshipType | null;
  relationshipName?: string | null;
  relationshipPhone?: string | null;
  relationshipEmail?: string | null;
  relationshipAddress?: string | null;
  embassyName?: string | null;
  embassyAddress?: string | null;
  embassyCity?: string | null;
  embassyCountry?: string | null;
  embassyPhone?: string | null;
  embassyEmail?: string | null;
  embassyWebsite?: string | null;
  embassyContactPerson?: string | null;
  passportNumber?: string | null;
  passportIssueDate?: Date | string | null;
  passportExpiry?: Date | string | null;
  passportPlaceOfIssue?: string | null;
  visaNumber?: string | null;
  visaIssueDate?: Date | string | null;
  visaExpiry?: Date | string | null;
  visaType?: string | null;
  efrroNumber?: string | null;
  efrroIssueDate?: Date | string | null;
  efrroExpiry?: Date | string | null;
}

export interface UpdateStudentInput {
  status?: StudentStatus;
  registrationNumber?: string | null;
  fullName?: string;
  nationalityCode?: string | null;
  gender?: "male" | "female" | "other" | "transgender" | "prefer_not_to_say" | null;
  dateOfBirth?: Date | string | null;
  email?: string | null;
  phoneHome?: string | null;
  phoneLocal?: string | null;
  permanentAddress?: string | null;
  localAddress?: string | null;
  programCode?: string | null;
  admissionDate?: string | Date | null;
  expectedGraduation?: string | Date | null;
  currentSemester?: number | null;
  academicStatus?: AcademicStatus;
  // Embassy / Consular updates
  embassyName?: string | null;
  embassyAddress?: string | null;
  embassyCity?: string | null;
  embassyCountry?: string | null;
  embassyPhone?: string | null;
  embassyEmail?: string | null;
  embassyWebsite?: string | null;
  embassyContactPerson?: string | null;
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
