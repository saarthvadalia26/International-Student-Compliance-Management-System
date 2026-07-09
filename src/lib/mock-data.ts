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

export const mockStudents: MockStudent[] = [
  {
    id: "s1-uuid-4444-9999-111122223333",
    registrationNumber: "ISCMS-2024-001",
    fullName: "Elena Rostova",
    nationalityCode: "RUS",
    nationalityName: "Russia",
    gender: "female",
    dateOfBirth: "2002-04-15",
    bloodGroup: "A+",
    religion: "Christianity",
    email: "elena.rostova@university.edu",
    phoneHome: "+7-916-123-4567",
    phoneLocal: "+91-98765-43210",
    permanentAddress: "Apt 42, 12 Gorky Street, Moscow, Russia",
    localAddress: "Room 304, International Student Hostel, Campus Block A",
    programCode: "CS_PHD",
    programName: "Ph.D. in Computer Science",
    school: "School of Computing & Data Sciences",
    admissionDate: "2024-08-01",
    expectedGraduation: "2028-07-31",
    currentSemester: 4,
    academicStatus: "good_standing",
    status: "active",
    complianceStatus: "compliant",
    daysToPassportExpiry: 420,
    daysToVisaExpiry: 120,
    daysToEfrroExpiry: 95,
    passport: {
      number: "RU87654321",
      issueDate: "2020-10-10",
      expiryDate: "2030-10-09",
      issuePlace: "Moscow",
      isCurrent: true,
      verificationStatus: "verified",
    },
    visa: {
      number: "V99887766",
      issueDate: "2024-07-01",
      expiryDate: "2026-11-03",
      visaType: "Student Visa (S-1)",
      isCurrent: true,
      verificationStatus: "verified",
    },
    efrro: {
      number: "EFRRO-RUS-992",
      issueDate: "2024-08-15",
      expiryDate: "2026-10-09",
      filePath: "/student-documents/s1-uuid/efrro/v1.pdf",
      isCurrent: true,
      verificationStatus: "verified",
    },
    emergencyContact: {
      name: "Dmitry Rostov",
      relationship: "parent",
      phone: "+7-916-987-6543",
      email: "dmitry.rostov@mail.ru",
      address: "12 Gorky Street, Moscow, Russia",
    },
    embassy: {
      name: "Embassy of the Russian Federation",
      contactPerson: "Sergey Ivanov",
      email: "rus-embassy@gov.ru",
      phone: "+91-11-2687-3351",
      address: "Shantipath, Chanakyapuri, New Delhi, Delhi 110021",
    },
  },
  {
    id: "s2-uuid-4444-9999-444455556666",
    registrationNumber: "ISCMS-2025-042",
    fullName: "John Adebayo",
    nationalityCode: "NGA",
    nationalityName: "Nigeria",
    gender: "male",
    dateOfBirth: "2003-11-02",
    bloodGroup: "O+",
    email: "john.adebayo@university.edu",
    phoneHome: "+234-803-123-4567",
    phoneLocal: "+91-98765-88812",
    permanentAddress: "14 Adeola Odeku St, Victoria Island, Lagos, Nigeria",
    localAddress: "Flat 12B, Maple Apartments, Sector 62, Noida",
    programCode: "BBA_HONS",
    programName: "Bachelor of Business Administration",
    school: "School of Business",
    admissionDate: "2025-01-15",
    expectedGraduation: "2028-12-15",
    currentSemester: 2,
    academicStatus: "good_standing",
    status: "active",
    complianceStatus: "warning",
    daysToPassportExpiry: 310,
    daysToVisaExpiry: 22, // Critical Warning Threshold (< 30 days)
    daysToEfrroExpiry: 18,
    passport: {
      number: "NG1234567",
      issueDate: "2022-05-15",
      expiryDate: "2027-05-14",
      issuePlace: "Lagos",
      isCurrent: true,
      verificationStatus: "verified",
    },
    visa: {
      number: "V55443322",
      issueDate: "2025-01-01",
      expiryDate: "2026-07-28", // Expiring in 22 days relative to current time
      visaType: "Student Visa (S-1)",
      isCurrent: true,
      verificationStatus: "verified",
    },
    efrro: {
      number: "EFRRO-NGA-103",
      issueDate: "2025-01-20",
      expiryDate: "2026-07-24", // Expiring in 18 days
      filePath: "/student-documents/s2-uuid/efrro/v1.pdf",
      isCurrent: true,
      verificationStatus: "verified",
    },
    emergencyContact: {
      name: "Florence Adebayo",
      relationship: "parent",
      phone: "+234-803-987-6543",
      email: "florence.a@adebayo-group.com",
    },
    embassy: {
      name: "High Commission of Nigeria",
      contactPerson: "Amara Nwachukwu",
      email: "nigerian-delhi@foreign.gov.ng",
      phone: "+91-11-2412-2141",
      address: "EP-4, Chandragupta Marg, Chanakyapuri, New Delhi, 110021",
    },
  },
  {
    id: "s3-uuid-4444-9999-777788889999",
    registrationNumber: "ISCMS-2023-108",
    fullName: "Yuki Tanaka",
    nationalityCode: "JPN",
    nationalityName: "Japan",
    gender: "female",
    dateOfBirth: "2001-09-30",
    bloodGroup: "B-",
    email: "yuki.tanaka@university.edu",
    phoneHome: "+81-90-1234-5678",
    phoneLocal: "+91-91234-56789",
    permanentAddress: "3-chōme-2-1 Shinjuku, Tokyo, Japan",
    localAddress: "Room 101, Girls Hostel Block B, University Campus",
    programCode: "MS_BT",
    programName: "M.Sc. in Biotechnology",
    school: "School of Life Sciences",
    admissionDate: "2023-08-01",
    expectedGraduation: "2025-07-31",
    currentSemester: 4,
    academicStatus: "probation",
    status: "active",
    complianceStatus: "non_compliant", // Passport expired
    daysToPassportExpiry: -5, // Expired 5 days ago
    daysToVisaExpiry: 245,
    passport: {
      number: "JP99887766",
      issueDate: "2016-07-02",
      expiryDate: "2026-07-01", // Expired on July 1, 2026 (local time is July 6, 2026)
      issuePlace: "Tokyo",
      isCurrent: true,
      verificationStatus: "verified",
    },
    visa: {
      number: "V33221100",
      issueDate: "2023-07-15",
      expiryDate: "2027-03-01",
      visaType: "Student Visa (S-1)",
      isCurrent: true,
      verificationStatus: "verified",
    },
    efrro: {
      // Excluded / exempted or valid
      number: "EFRRO-JPN-044",
      issueDate: "2023-08-10",
      expiryDate: "2027-03-01",
      filePath: "/student-documents/s3-uuid/efrro/v1.pdf",
      isCurrent: true,
      verificationStatus: "verified",
    },
    emergencyContact: {
      name: "Kenji Tanaka",
      relationship: "guardian",
      phone: "+81-90-9876-5432",
      email: "kenji.tanaka@tokyo-ind.co.jp",
    },
    embassy: {
      name: "Embassy of Japan",
      contactPerson: "Hiroshi Sato",
      phone: "+91-11-2687-6581",
      address: "50-G, Shantipath, Chanakyapuri, New Delhi, Delhi 110021",
    },
  },
  {
    id: "s4-uuid-4444-9999-000011112222",
    registrationNumber: "ISCMS-2025-115",
    fullName: "Michael Chen",
    nationalityCode: "SGP",
    nationalityName: "Singapore",
    gender: "male",
    dateOfBirth: "2004-01-20",
    bloodGroup: "O-",
    email: "michael.chen@university.edu",
    phoneHome: "+65-9123-4567",
    phoneLocal: "+91-88888-99999",
    permanentAddress: "Blk 123, Bishan Street 12, #10-45, Singapore",
    localAddress: "Room 202, International Student Hostel, Campus Block A",
    programCode: "BTECH_CSE",
    programName: "B.Tech. in Computer Science & Engineering",
    school: "School of Computing & Data Sciences",
    admissionDate: "2025-08-01",
    expectedGraduation: "2029-07-31",
    currentSemester: 2,
    academicStatus: "good_standing",
    status: "active",
    complianceStatus: "warning", // Pending verification visa
    daysToPassportExpiry: 900,
    daysToVisaExpiry: 120,
    passport: {
      number: "SG5554443",
      issueDate: "2024-02-15",
      expiryDate: "2029-02-14",
      issuePlace: "Singapore",
      isCurrent: true,
      verificationStatus: "verified",
    },
    visa: {
      number: "V77665544",
      issueDate: "2025-07-10",
      expiryDate: "2026-11-03",
      visaType: "Student Visa (S-1)",
      isCurrent: true,
      verificationStatus: "pending", // Causes warning compliance state
    },
    emergencyContact: {
      name: "David Chen",
      relationship: "parent",
      phone: "+65-9876-5432",
      email: "david.chen@dbs.com.sg",
    },
    embassy: {
      name: "High Commission of the Republic of Singapore",
      contactPerson: "Lee Wei",
      phone: "+91-11-4101-9800",
      address: "N-88, Panchsheel Park, New Delhi, Delhi 110017",
    },
  },
  {
    id: "s5-uuid-4444-9999-333344445555",
    registrationNumber: "ISCMS-2022-005",
    fullName: "Fatima Al-Sayed",
    nationalityCode: "ARE",
    nationalityName: "United Arab Emirates",
    gender: "female",
    dateOfBirth: "2000-08-25",
    bloodGroup: "AB+",
    email: "fatima.alsayed@university.edu",
    phoneHome: "+971-50-123-4567",
    phoneLocal: "+91-77777-66666",
    permanentAddress: "Jumeirah Beach Road, House 89, Dubai, UAE",
    localAddress: "Villa 3, Palm Green Villas, Greater Noida",
    programCode: "MTECH_VLSI",
    programName: "M.Tech. in VLSI Design",
    school: "School of Engineering",
    admissionDate: "2022-08-01",
    expectedGraduation: "2024-07-31",
    currentSemester: 4,
    academicStatus: "suspended",
    status: "suspended", // Student is suspended
    complianceStatus: "expired", // Document is expired
    daysToPassportExpiry: 120,
    daysToVisaExpiry: -67, // Expired
    passport: {
      number: "AE8877665",
      issueDate: "2019-09-01",
      expiryDate: "2029-08-31",
      issuePlace: "Abu Dhabi",
      isCurrent: true,
      verificationStatus: "verified",
    },
    visa: {
      number: "V11223344",
      issueDate: "2022-07-01",
      expiryDate: "2026-04-30", // Expired
      visaType: "Student Visa (S-1)",
      isCurrent: true,
      verificationStatus: "verified",
    },
    emergencyContact: {
      name: "Mohammed Al-Sayed",
      relationship: "parent",
      phone: "+971-50-987-6543",
      email: "m.alsayed@adnoc.ae",
    },
    embassy: {
      name: "Embassy of the United Arab Emirates",
      phone: "+91-11-2611-1111",
      address: "12, Chandragupta Marg, Chanakyapuri, New Delhi, Delhi 110021",
    },
  }
];

export const mockNotifications: MockNotification[] = [
  {
    id: "n1",
    documentType: "visa",
    alertThresholdDays: 30,
    channel: "email",
    recipientAddress: "john.adebayo@university.edu",
    status: "queued",
    createdAt: "2026-07-01T09:00:00Z",
  },
  {
    id: "n2",
    documentType: "efrro",
    alertThresholdDays: 30,
    channel: "both",
    recipientAddress: "john.adebayo@university.edu / +91-98765-88812",
    status: "queued",
    createdAt: "2026-07-05T10:30:00Z",
  },
  {
    id: "n3",
    documentType: "passport",
    alertThresholdDays: 90,
    channel: "email",
    recipientAddress: "yuki.tanaka@university.edu",
    status: "sent",
    sentAt: "2026-06-25T14:22:10Z",
    createdAt: "2026-06-25T08:00:00Z",
  },
  {
    id: "n4",
    documentType: "passport",
    alertThresholdDays: 60,
    channel: "email",
    recipientAddress: "yuki.tanaka@university.edu",
    status: "sent",
    sentAt: "2026-07-02T11:05:00Z",
    createdAt: "2026-07-02T08:00:00Z",
  },
  {
    id: "n5",
    documentType: "visa",
    alertThresholdDays: 90,
    channel: "email",
    recipientAddress: "fatima.alsayed@university.edu",
    status: "cancelled",
    createdAt: "2026-02-15T09:00:00Z",
  },
];
