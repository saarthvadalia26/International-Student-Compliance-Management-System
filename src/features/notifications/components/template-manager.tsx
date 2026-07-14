"use client";

import * as React from "react";
import { Edit2, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface MockTemplate {
  id: string;
  code: string;
  languageCode: string;
  version: number;
  isActive: boolean;
  title: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export function TemplateManager(): React.JSX.Element {
  const [templates, setTemplates] = React.useState<MockTemplate[]>([
    {
      id: "t1",
      code: "EXPIRY_ALERT",
      languageCode: "en",
      version: 1,
      isActive: true,
      title: "Document Expiry Alert (EN)",
      subjectTemplate: "ISCMS Alert: {{document_type}} Expiration Warning",
      bodyTemplate: "Dear {{student_name}},\n\nYour {{document_type}} is expiring in {{days_left}} days on {{expiry_date}}. Please upload a revised version in the ISCMS portal immediately to maintain compliant standing.\n\nBest regards,\nOffice of International Compliance"
    },
    {
      id: "t2",
      code: "EXPIRY_ALERT",
      languageCode: "es",
      version: 1,
      isActive: true,
      title: "Alerta de vencimiento del documento (ES)",
      subjectTemplate: "Alerta ISCMS: Advertencia de vencimiento de {{document_type}}",
      bodyTemplate: "Estimado {{student_name}},\n\nSu {{document_type}} vencerá en {{days_left}} días el {{expiry_date}}. Cargue una versión revisada en el portal de ISCMS de inmediato para mantener su estado de cumplimiento.\n\nAtentamente,\nOficina de Cumplimiento Internacional"
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = React.useState<MockTemplate | null>(templates[0]);
  const [subject, setSubject] = React.useState(selectedTemplate?.subjectTemplate || "");
  const [body, setBody] = React.useState(selectedTemplate?.bodyTemplate || "");
  const [lang, setLang] = React.useState(selectedTemplate?.languageCode || "en");
  const [version, setVersion] = React.useState(selectedTemplate?.version || 1);

  // States for save template action button
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);

  const handleSelectTemplate = (id: string) => {
    const t = templates.find(item => item.id === id);
    if (t) {
      setSelectedTemplate(t);
      setSubject(t.subjectTemplate);
      setBody(t.bodyTemplate);
      setLang(t.languageCode);
      setVersion(t.version);
    }
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    // Simulate saving latency
    setTimeout(() => {
      try {
        setTemplates(prev => prev.map(t => {
          if (t.id === selectedTemplate.id) {
            return {
              ...t,
              subjectTemplate: subject,
              bodyTemplate: body,
              languageCode: lang,
              version: version
            };
          }
          return t;
        }));

        setSaveSuccess(true);
        toast.success("Profile updated successfully.", { 
          description: `Saved as version ${version} translation for language code: ${lang.toUpperCase()}`
        });
      } catch (err) {
        setSaveError(true);
        toast.error("Unable to save changes. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Templates list */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border border-border/60 bg-card/65 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Templates Directory</CardTitle>
              <CardDescription className="text-xs font-caption">Manage message formats and rollbacks.</CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2 pt-3">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    selectedTemplate?.id === t.id
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "border-border/50 hover:bg-muted/10 text-muted-foreground"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="uppercase text-[9px] tracking-wider block font-caption">{t.code}</span>
                    <span className="text-[9px] uppercase font-semibold">{t.languageCode} (v{t.version})</span>
                  </div>
                  <span className="block font-medium truncate text-foreground">{t.title}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Template Form editor */}
        <div className="md:col-span-2 space-y-4">
          {selectedTemplate ? (
            <Card className="border border-border/60 bg-card/65 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Edit Layout: {selectedTemplate.code}</CardTitle>
                    <CardDescription className="text-xs font-caption">Configure dynamic tokens values mapping blocks.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Language code */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block font-caption">Language Locale</label>
                    <select 
                      value={lang} 
                      onChange={(e) => setLang(e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="en">English (EN)</option>
                      <option value="es">Spanish (ES)</option>
                      <option value="fr">French (FR)</option>
                    </select>
                  </div>

                  {/* Version */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block font-caption">Active Version Number</label>
                    <Input 
                      type="number" 
                      value={version} 
                      onChange={(e) => setVersion(parseInt(e.target.value) || 1)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="subject">Subject Template</label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground" htmlFor="body">Body Message Layout</label>
                  <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-36 text-sm font-mono" />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-caption">
                    <HelpCircle className="h-3.5 w-3.5" /> Token variables: use double curly brackets, e.g. <code>{"{{student_name}}"}</code>, <code>{"{{document_type}}"}</code>
                  </div>
                  <AsyncActionButton
                    size="sm"
                    className="h-8 text-xs font-semibold"
                    onClick={handleSave}
                    isLoading={isSaving}
                    isSuccess={saveSuccess}
                    isError={saveError}
                    idleText={<><Edit2 className="mr-1.5 h-3.5 w-3.5 inline" /> Update Template</>}
                    loadingText="Updating..."
                    successText="Changes saved"
                    errorText="Try Again"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              Select a template variant form log from directory to edit details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
