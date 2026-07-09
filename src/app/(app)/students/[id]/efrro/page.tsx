import { use } from "react";
import { ComplianceDocumentPage } from "@/features/compliance/components/document-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EfrroPage({ params }: PageProps): React.JSX.Element {
  const resolvedParams = use(params);
  return (
    <ComplianceDocumentPage 
      documentType="efrro" 
      studentId={resolvedParams.id} 
    />
  );
}
