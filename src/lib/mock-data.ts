export interface MockDocument {
  number: string;
  issueDate: string;
  expiryDate: string;
  issuePlace?: string;
  visaType?: string;
  filePath?: string;
  isCurrent: boolean;
  verificationStatus: "pending" | "verified" | "rejected";
}

export interface MockNotification {
  id: string;
  documentType: "passport" | "visa" | "efrro";
  alertThresholdDays: number;
  channel: "email" | "whatsapp" | "both";
  recipientAddress: string;
  status: "queued" | "sent" | "failed" | "cancelled";
  sentAt?: string;
  createdAt: string;
}

export interface MockStudent {
  id: string;
  registrationNumber: string;
  fullName: string;
  nationalityCode: string;
  nationalityName: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string;
  bloodGroup?: string;
  religion?: string;
  email: string;
  phoneHome: string;
  phoneLocal?: string;
  permanentAddress: string;
  localAddress?: string;
  programCode: string;
  programName: string;
  school: string;
  admissionDate: string;
  expectedGraduation: string;
  currentSemester: number;
  academicStatus: "good_standing" | "probation" | "suspended";
  status: "active" | "suspended" | "graduated" | "withdrawn";
  
  // Document status
  passport: MockDocument;
  visa: MockDocument;
  efrro?: MockDocument; // Optional based on nationality (BR-006)

  // Compliance snapshot values
  complianceStatus: "compliant" | "warning" | "non_compliant" | "expired";
  daysToPassportExpiry?: number;
  daysToVisaExpiry?: number;
  daysToEfrroExpiry?: number;

  // Relationships
  emergencyContact: {
    name: string;
    relationship: "parent" | "guardian" | "local_sponsor";
    phone: string;
    email?: string;
    address?: string;
  };
  
  // Embassy info
  embassy: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address: string;
  };
}

// Clear all demo student datasets for production NFSU deployment
export const mockStudents: MockStudent[] = [];

// Clear all demo notification queues
export const mockNotifications: MockNotification[] = [];
