"use client";

import * as React from "react";
import { 
  Upload, 
  FileText, 
  Loader2 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { uploadStudentDocumentAction, fetchStudentProfile } from "../actions";
import { toast } from "sonner";
import { StudentPortalProfile } from "@/domain/student-portal/types";

export default function DocumentCentrePage() {
  const supabase = getBrowserSupabase();
  const [profile, setProfile] = React.useState<StudentPortalProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeDocType, setActiveDocType] = React.useState<"passport" | "visa" | "efrro">("efrro");
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const refreshProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await fetchStudentProfile(session.access_token);
      setProfile(data);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    let mounted = true;
    async function initData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) setIsLoading(false);
          return;
        }
        const data = await fetchStudentProfile(session.access_token);
        if (mounted) {
          setProfile(data);
          setIsLoading(false);
        }
      } catch {
        if (mounted) setIsLoading(false);
      }
    }
    initData();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds maximum limit of 10MB.");
      return;
    }

    // Validate type
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Unsupported file format. Please upload PDF, JPG, or PNG.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session.");

      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await uploadStudentDocumentAction(
          session.access_token,
          activeDocType,
          selectedFile.name,
          base64,
          null,
          navigator.userAgent
        );

        if (res.success) {
          toast.success(`${activeDocType.toUpperCase()} document uploaded successfully!`);
          setSelectedFile(null);
          await refreshProfile();
        } else {
          toast.error(res.error || "Upload failed. Please try again.");
        }
        setIsUploading(false);
      };
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload error.");
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Document Centre</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Upload and verify your Passport, Visa, and eFRRO certificates.</p>
      </div>

      {/* Document Type Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        {(["efrro", "passport", "visa"] as const).map((type) => (
          <Button
            key={type}
            variant={activeDocType === type ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveDocType(type); setSelectedFile(null); }}
            className="text-xs font-semibold uppercase tracking-wider h-8 rounded-xl px-4"
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Main Upload Dropzone & Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="border-border/80 rounded-2xl p-6 shadow-xs bg-card space-y-4">
            <CardHeader className="p-0 pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Upload {activeDocType.toUpperCase()} Document
                </span>
                <span className="text-[10px] text-muted-foreground">PDF, JPG, PNG (Max 10MB)</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 pt-2 space-y-4">
              <div className="border-2 border-dashed border-border/80 hover:border-primary/50 rounded-2xl p-8 text-center bg-accent/20 transition-colors">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-xs font-semibold text-foreground">
                  {selectedFile ? selectedFile.name : `Select your ${activeDocType.toUpperCase()} document file`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : "Click below to browse from your device"}
                </p>
                
                <input
                  type="file"
                  id="doc-file-input"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                
                <label htmlFor="doc-file-input" className="inline-block mt-4">
                  <Button variant="outline" size="sm" type="button" className="text-xs pointer-events-none rounded-xl">
                    Browse File
                  </Button>
                </label>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-xl"
                    disabled={isUploading}
                    onClick={() => setSelectedFile(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs font-semibold rounded-xl gap-2"
                    disabled={isUploading}
                    onClick={handleUploadSubmit}
                  >
                    {isUploading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="h-3.5 w-3.5" /> Submit Document</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Document Verification Status Sidebar */}
        <div className="space-y-4">
          <Card className="border-border/80 rounded-2xl p-5 shadow-xs bg-card space-y-3">
            <CardHeader className="p-0 pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold">Current Verification Status</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Document</span>
                <span className="font-semibold text-foreground uppercase">{activeDocType}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border/40">
                <span className="text-muted-foreground">Status</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[10px] uppercase">
                  VERIFIED / ACTIVE
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border/40">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-mono text-foreground">{profile?.lastUploadDate ? new Date(profile.lastUploadDate).toLocaleDateString() : "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
