import { z } from "zod";

export const DocumentUploadSchema = z.object({
  studentId: z.string().uuid("Student ID must be a valid UUID"),
  documentNumber: z.string().min(1, "Document number cannot be empty").max(100),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid issue date" }),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid expiry date" }),
  fileSize: z.number().max(2 * 1024 * 1024, "File size exceeds limit of 2MB"),
  fileType: z.literal("application/pdf", { message: "Only PDF documents are allowed" })
}).refine((data) => {
  const issue = new Date(data.issueDate);
  const expiry = new Date(data.expiryDate);
  return expiry > issue;
}, {
  message: "Expiry date must be strictly after the issue date",
  path: ["expiryDate"]
});

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

export const DocumentReplacementSchema = z.object({
  fileSize: z.number().max(2 * 1024 * 1024, "File size exceeds limit of 2MB"),
  fileType: z.literal("application/pdf", { message: "Only PDF documents are allowed" })
});
