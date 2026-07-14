"use client";

import * as React from "react";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  Trash2, 
  Eye, 
  Loader2, 
  Calendar,
  ShieldAlert
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { uploadEfrro, fetchStudentProfile } from "../actions";
import { StudentPortalProfile } from "@/domain/student-portal/types";

export default function EfrroUploadPage() {
  const supabase = getBrowserSupabase();

  const [profile, setProfile] = React.useState<StudentPortalProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  const [uploadErrorState, setUploadErrorState] = React.useState(false);

  // File states
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);

  // Load profile data on mount
  React.useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active student session found.");
        }

        const jwt = session.access_token;
        const studentProfile = await fetchStudentProfile(jwt);

        if (mounted) {
          setProfile(studentProfile);
          setIsLoadingProfile(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setUploadError(msg);
          setIsLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Clean up PDF object URLs to avoid memory leaks
  React.useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setUploadError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Invalid file type: Please select a PDF document only.");
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setUploadError("File size limit exceeded: PDF must be less than 5MB.");
      return;
    }

    setSelectedFile(file);
    
    // Revoke old object URL
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a PDF file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadErrorState(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active student session found.");
      }

      // Convert file buffer to base64 string to submit via Server Action
      const reader = new FileReader();
      
      const fileConvertedPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 segment from Data URL
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error("Failed to read file buffer."));
        reader.readAsDataURL(selectedFile);
      });

      const fileBase64 = await fileConvertedPromise;
      const jwt = session.access_token;
      
      // Submit upload request
      const res = await uploadEfrro(
        jwt,
        selectedFile.name,
        fileBase64,
        null, // IP address will resolve on server action headers
        window.navigator.userAgent
      );

      if (res.success) {
        setUploadSuccess(true);
        setSelectedFile(null);
        if (pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl);
          setPdfPreviewUrl(null);
        }
        toast.success("Profile updated successfully.", {
          description: "Your renewed eFRRO is under review by Compliance Cell.",
        });
      } else {
        throw new Error(res.error || "Failed to complete renewal upload.");
      }

    } catch (err: unknown) {
      setUploadErrorState(true);
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(msg);
      toast.error("Unable to save changes. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading eFRRO coordinates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">eFRRO Document Renewal</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Submit your newly issued or extended eFRRO document to the NFSU Compliance Cell.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Info Sidebar Column */}
        <div className="space-y-6 md:col-span-1">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Current Expiry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">Registered Expiry</span>
                  <p className="text-sm font-bold text-foreground">
                    {profile?.efrroExpiry ? new Date(profile.efrroExpiry).toLocaleDateString() : "Missing"}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-3 rounded-lg border border-border/50">
                <p className="font-semibold text-foreground">Rules for Renewal:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>File format: PDF only.</li>
                  <li>Max file size: 5MB.</li>
                  <li>Scan must be clear and legible.</li>
                  <li>Reminders stop automatically after upload.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Column */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold">Upload Renewed Document</CardTitle>
              <CardDescription className="text-xs">Drag and drop or select your document below.</CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {uploadError && (
                  <Alert variant="destructive" className="py-2.5 px-3">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle className="text-xs font-semibold">Upload Issue</AlertTitle>
                    <AlertDescription className="text-xs">{uploadError}</AlertDescription>
                  </Alert>
                )}

                {uploadSuccess && (
                  <Alert className="py-2.5 px-3 border-emerald-500/35 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <AlertTitle className="text-xs font-semibold">Upload Confirmed</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      Your eFRRO document was submitted. Status is now <strong>Pending Verification</strong>. Future automated reminders are disabled.
                    </AlertDescription>
                  </Alert>
                )}

                {/* File Dropzone */}
                {!selectedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-all duration-200 ${
                      isDragOver 
                        ? "border-primary bg-primary/5 shadow-inner scale-[0.99]" 
                        : "border-border/65 hover:border-primary/50 hover:bg-muted/10"
                    }`}
                  >
                    <input
                      type="file"
                      id="efrro-file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="efrro-file" className="cursor-pointer flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Drag and drop file here</p>
                      <p className="text-xs text-muted-foreground mt-0.5">or click to browse your local files</p>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected File Details */}
                    <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/70 bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground truncate max-w-xs">{selectedFile.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleRemoveFile}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* PDF Inline Preview */}
                    {pdfPreviewUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Live Preview
                        </span>
                        <div className="border border-border/80 rounded-lg overflow-hidden h-[360px] bg-zinc-100">
                          <iframe
                            src={pdfPreviewUrl}
                            className="w-full h-full border-none"
                            title="eFRRO PDF Preview"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-end gap-3 border-t border-border/50 pt-4">
                {selectedFile && (
                  <AsyncActionButton
                    type="submit"
                    className="text-xs px-4"
                    isLoading={isUploading}
                    isSuccess={uploadSuccess}
                    isError={uploadErrorState}
                    idleText="Submit Document"
                    loadingText="Uploading document..."
                    successText="Changes saved"
                    errorText="Try Again"
                  />
                )}
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
