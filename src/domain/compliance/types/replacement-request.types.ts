/**
 * Types & Constants for Document Replacement Requests
 */

export type DocumentReplacementReason =
  | "passport_lost"
  | "passport_damaged"
  | "passport_renewed_early"
  | "visa_renewed_reissued"
  | "efrro_reissued"
  | "government_replacement"
  | "incorrect_document"
  | "other";

export type DocumentReplacementStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired"
  | "completed";

export interface DocumentReplacementRequestRecord {
  id: string;
  studentId: string;
  documentType: "passport" | "visa" | "efrro";
  currentDocumentVersion: number | null;
  currentExpiryDate: string | null;
  reason: DocumentReplacementReason;
  reasonDetails: string;
  status: DocumentReplacementStatus;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  authorizationId: string | null;
  authorizationExpiresAt: string | null;
  completedAt: string | null;
  completedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  studentFullName?: string;
  studentRegistrationNumber?: string;
  studentEmail?: string;
}

export interface SubmitReplacementRequestInput {
  documentType: "passport" | "visa" | "efrro";
  reason: DocumentReplacementReason;
  reasonDetails: string;
}

export interface ApproveReplacementRequestInput {
  durationDays?: number; // Defaults to 7
}

export interface RejectReplacementRequestInput {
  rejectionReason: string;
}

export const REASON_LABELS: Record<DocumentReplacementReason, string> = {
  passport_lost: "Passport Lost / Stolen",
  passport_damaged: "Passport Damaged",
  passport_renewed_early: "Passport Renewed Early",
  visa_renewed_reissued: "Visa Renewed / Reissued",
  efrro_reissued: "eFRRO / Permit Reissued",
  government_replacement: "Government Replaced / New Booklet",
  incorrect_document: "Incorrect Document Uploaded",
  other: "Other Legitimate Reason"
};
