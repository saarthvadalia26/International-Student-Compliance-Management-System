export class DocumentNotFoundError extends Error {
  constructor(message: string = "Document not found") {
    super(message);
    this.name = "DocumentNotFoundError";
  }
}

export class DuplicateActiveDocumentError extends Error {
  constructor(message: string = "Multiple active versions of this document type detected") {
    super(message);
    this.name = "DuplicateActiveDocumentError";
  }
}

export class InvalidExpiryDateError extends Error {
  constructor(message: string = "Expiry date must be after issue date") {
    super(message);
    this.name = "InvalidExpiryDateError";
  }
}

export class InvalidVersionError extends Error {
  constructor(message: string = "Version sequence mismatch detected") {
    super(message);
    this.name = "InvalidVersionError";
  }
}

export class SnapshotUpdateFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotUpdateFailedError";
  }
}

export class VerificationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerificationFailedError";
  }
}

export class ValidationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationFailedError";
  }
}
