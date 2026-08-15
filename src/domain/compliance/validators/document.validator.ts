import { z } from "zod";

export const DEFAULT_DOCUMENT_MAX_SIZE_BYTES = 10485760; // 10 MB

export function createDocumentUploadSchema(maxSizeBytes = DEFAULT_DOCUMENT_MAX_SIZE_BYTES) {
  const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
  return z.object({
    studentId: z.string().uuid("Student ID must be a valid UUID"),
    documentNumber: z.string().min(1, "Document number cannot be empty").max(100),
    issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid issue date" }),
    expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid expiry date" }),
    fileSize: z.number().max(maxSizeBytes, `File exceeds the maximum allowed size of ${maxMb} MB`),
    fileType: z.enum(["application/pdf", "image/jpeg", "image/png"], { message: "Only PDF, JPG, or PNG documents are allowed" })
  }).refine((data) => {
    const issue = new Date(data.issueDate);
    const expiry = new Date(data.expiryDate);
    return expiry > issue;
  }, {
    message: "Expiry date must be strictly after the issue date",
    path: ["expiryDate"]
  });
}

export const DocumentUploadSchema = createDocumentUploadSchema();

export const DocumentVerificationSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
}).refine((data) => {
  if (data.status === "rejected") {
    return data.rejectionReason && data.rejectionReason.trim().length > 0;
  }
  return true;
}, {
  message: "Rejection reason is required when rejecting a document",
  path: ["rejectionReason"]
});

export function createDocumentReplacementSchema(maxSizeBytes = DEFAULT_DOCUMENT_MAX_SIZE_BYTES) {
  const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
  return z.object({
    fileSize: z.number().max(maxSizeBytes, `File exceeds the maximum allowed size of ${maxMb} MB`),
    fileType: z.enum(["application/pdf", "image/jpeg", "image/png"], { message: "Only PDF, JPG, or PNG documents are allowed" })
  });
}

export const DocumentReplacementSchema = createDocumentReplacementSchema();
