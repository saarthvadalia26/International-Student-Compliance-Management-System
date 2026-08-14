import { Shield, CreditCard, ClipboardList } from "lucide-react";
import * as React from "react";

export type ComplianceDocumentType = "passport" | "visa" | "efrro";
export type ComplianceStatus = "COMPLIANT" | "WARNING" | "EXPIRED" | "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "NOT_UPLOADED" | "MISSING";

export interface DocumentConfig {
  type: ComplianceDocumentType;
  title: string;
  description: string;
  fieldLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  bucketFolder: string;
}

export const DOCUMENT_CONFIGS: Record<ComplianceDocumentType, DocumentConfig> = {
  passport: {
    type: "passport",
    title: "Passport Document",
    description: "International passport details matching identity registries.",
    fieldLabel: "Passport Number",
    icon: Shield,
    bucketFolder: "passport"
  },
  visa: {
    type: "visa",
    title: "Visa Permit",
    description: "Valid study visa permit issued by immigration coordinates.",
    fieldLabel: "Visa Number",
    icon: CreditCard,
    bucketFolder: "visa"
  },
  efrro: {
    type: "efrro",
    title: "eFRRO Registration Certificate",
    description: "Police/foreign registration certificate tracking local stay.",
    fieldLabel: "eFRRO Number",
    icon: ClipboardList,
    bucketFolder: "efrro"
  }
};
