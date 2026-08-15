"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  History, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Eye, 
  RefreshCw, 
  Trash2, 
  FileText, 
  Database,
  Search,
  Filter,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  ISCMSImportField, 
  ISCMS_FIELD_DEFINITIONS, 
  ColumnMapping, 
  ValidationReport, 
  ValidationRowResult, 
  ImportBatchRecord, 
  ImportExecutionResult 
} from "@/domain/import/types/bulk-import.types";
import {
  parseUploadedSpreadsheetAction,
  validateImportDataAction,
  executeBulkImportAction,
  downloadImportTemplateAction,
  fetchImportHistoryAction,
  rollbackImportBatchAction
} from "./actions";

export default function BulkStudentImportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<"wizard" | "history">("wizard");
  const [step, setStep] = React.useState<1 | 2 | 3 | 4 | 5>(1);

  // File state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileBase64, setFileBase64] = React.useState<string>("");
  const [isParsing, setIsParsing] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = React.useState(false);

  // Parsed state
  const [detectedHeaders, setDetectedHeaders] = React.useState<string[]>([]);
  const [rawRows, setRawRows] = React.useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<ColumnMapping>({});
  const [validationReport, setValidationReport] = React.useState<ValidationReport | null>(null);
  const [importResult, setImportResult] = React.useState<ImportExecutionResult | null>(null);

  // Preview / Filter states
  const [reviewTab, setReviewTab] = React.useState<"issues" | "preview">("issues");
  const [previewPage, setPreviewPage] = React.useState(1);
  const [issuesFilter, setIssuesFilter] = React.useState<"all" | "errors" | "duplicates" | "warnings">("all");
  const pageSize = 15;

  // History state
  const [historyBatches, setHistoryBatches] = React.useState<ImportBatchRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [rollbackBatch, setRollbackBatch] = React.useState<ImportBatchRecord | null>(null);
  const [isRollingBack, setIsRollingBack] = React.useState(false);

  const loadHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetchImportHistoryAction();
      if (res.success && res.batches) {
        setHistoryBatches(res.batches);
      } else {
        toast.error(res.error || "Failed to load import history");
      }
    } catch {
      toast.error("Failed to load import history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Load history when tab changes
  React.useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // 1. Handle File Upload
  const handleFileDrop = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Invalid file format. Please upload an .xlsx, .xls, or .csv file.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Import file exceeds the maximum allowed size of 100 MB.");
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        setFileBase64(base64);

        const res = await parseUploadedSpreadsheetAction(base64, file.name);
        if (res.success && res.headers && res.rawRows && res.autoMapping) {
          setDetectedHeaders(res.headers);
          setRawRows(res.rawRows);
          setColumnMapping(res.autoMapping);
          setStep(2);
          toast.success(`Spreadsheet parsed successfully. Found ${res.rawRows.length} rows and ${res.headers.length} columns.`);
        } else {
          toast.error(res.error || "Failed to parse spreadsheet");
          setSelectedFile(null);
        }
        setIsParsing(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setIsParsing(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(err.message || "Failed to process file");
      setIsParsing(false);
    }
  };

  // 2. Download Template
  const handleDownloadTemplate = async (format: "xlsx" | "csv") => {
    setIsDownloadingTemplate(true);
    try {
      const res = await downloadImportTemplateAction(format);
      if (res.success && res.base64 && res.fileName) {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: res.mimeType || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${res.fileName}`);
      } else {
        toast.error(res.error || "Failed to generate template");
      }
    } catch {
      toast.error("Failed to download template");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // 3. Trigger Validation
  const handleRunValidation = async () => {
    // Check if critical fields mapped
    const mappedValues = Object.values(columnMapping);
    const requiredDefs = ISCMS_FIELD_DEFINITIONS.filter(f => f.required);
    const missingRequired = requiredDefs.filter(f => !mappedValues.includes(f.field));

    if (missingRequired.length > 0) {
      toast.error(`Please map all mandatory fields: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    setIsValidating(true);
    try {
      const res = await validateImportDataAction(rawRows, columnMapping);
      if (res.success && res.report) {
        setValidationReport(res.report);
        setStep(3);
        if (res.report.errorCount === 0 && res.report.duplicateCount === 0) {
          toast.success(`Validation passed: All ${res.report.validCount} records are ready for import.`);
        } else {
          toast.warning(`Validation completed with ${res.report.errorCount} error(s) and ${res.report.duplicateCount} duplicate(s).`);
        }
      } else {
        toast.error(res.error || "Validation failed");
      }
    } catch {
      toast.error("Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  // 4. Commit Bulk Import
  const handleCommitImport = async () => {
    if (!validationReport || !selectedFile) return;

    setIsImporting(true);
    try {
      const res = await executeBulkImportAction({
        fileName: selectedFile.name,
        fileSizeBytes: selectedFile.size,
        totalRows: validationReport.totalRows,
        validatedRows: validationReport.rows
      });

      if (res.success && res.result) {
        setImportResult(res.result);
        setStep(5);
        toast.success(`Import complete! Successfully created ${res.result.importedCount} student record(s).`);
      } else {
        toast.error(res.error || "Bulk import failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute import");
    } finally {
      setIsImporting(false);
    }
  };

  // 5. Rollback Batch
  const handleExecuteRollback = async () => {
    if (!rollbackBatch) return;

    setIsRollingBack(true);
    try {
      const res = await rollbackImportBatchAction(rollbackBatch.id);
      if (res.success) {
        toast.success(res.message || "Batch successfully rolled back");
        setRollbackBatch(null);
        loadHistory();
      } else {
        toast.error(res.error || "Failed to rollback batch");
      }
    } catch (err: any) {
      toast.error(err.message || "Rollback failed");
    } finally {
      setIsRollingBack(false);
    }
  };

  // Reset wizard
  const handleResetWizard = () => {
    setSelectedFile(null);
    setFileBase64("");
    setDetectedHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setValidationReport(null);
    setImportResult(null);
    setStep(1);
  };

  // Filtered issues
  const filteredIssues = React.useMemo(() => {
    if (!validationReport) return [];
    const issues: Array<{
      rowNumber: number;
      type: "error" | "duplicate" | "warning";
      fieldLabel: string;
      value: string;
      message: string;
      suggestion?: string;
    }> = [];

    for (const row of validationReport.rows) {
      for (const err of row.errors) {
        const isDup = err.problem.toLowerCase().includes("duplicate") || err.problem.toLowerCase().includes("already exists");
        if (issuesFilter === "all" || (issuesFilter === "duplicates" && isDup) || (issuesFilter === "errors" && !isDup)) {
          issues.push({
            rowNumber: row.rowNumber,
            type: isDup ? "duplicate" : "error",
            fieldLabel: err.fieldLabel,
            value: err.value || "(empty)",
            message: err.problem,
            suggestion: err.suggestion
          });
        }
      }
      if (issuesFilter === "all" || issuesFilter === "warnings") {
        for (const w of row.warnings) {
          issues.push({
            rowNumber: row.rowNumber,
            type: "warning",
            fieldLabel: w.fieldLabel,
            value: w.value || "(empty)",
            message: w.warning
          });
        }
      }
    }
    return issues;
  }, [validationReport, issuesFilter]);

  // Paginated preview rows
  const paginatedRows = React.useMemo(() => {
    if (!validationReport) return [];
    const validRows = validationReport.rows.filter(r => r.status === "valid");
    const start = (previewPage - 1) * pageSize;
    return validRows.slice(start, start + pageSize);
  }, [validationReport, previewPage]);

  const totalPreviewPages = validationReport ? Math.ceil(validationReport.validCount / pageSize) : 1;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Bulk Student Migration</h1>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
              Admin Migration Tool
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Safely import university student records from Excel (.xlsx, .xls) and CSV files with column mapping, automated validation, and batch auditing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleDownloadTemplate("xlsx")}
            disabled={isDownloadingTemplate}
          >
            <Download className="h-4 w-4 text-emerald-600" />
            Download Excel Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleDownloadTemplate("csv")}
            disabled={isDownloadingTemplate}
          >
            <Download className="h-4 w-4 text-blue-600" />
            CSV Template
          </Button>
        </div>
      </div>

      {/* Tabs: Wizard vs History */}
      <div className="flex items-center gap-2 max-w-md bg-muted/40 p-1 rounded-xl border border-border/50">
        <button
          onClick={() => setActiveTab("wizard")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "wizard"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-4 w-4" />
          New Bulk Import
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "history"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          Import History & Batches
        </button>
      </div>

      {activeTab === "wizard" && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="grid grid-cols-5 gap-2 p-3 bg-muted/40 rounded-xl border border-border/50 text-xs font-medium text-center">
            <div className={`p-2 rounded-lg transition-all ${step === 1 ? "bg-primary text-primary-foreground font-bold shadow-sm" : step > 1 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              1. Upload File
            </div>
            <div className={`p-2 rounded-lg transition-all ${step === 2 ? "bg-primary text-primary-foreground font-bold shadow-sm" : step > 2 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              2. Map Columns
            </div>
            <div className={`p-2 rounded-lg transition-all ${step === 3 ? "bg-primary text-primary-foreground font-bold shadow-sm" : step > 3 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              3. Validate & Review
            </div>
            <div className={`p-2 rounded-lg transition-all ${step === 4 ? "bg-primary text-primary-foreground font-bold shadow-sm" : step > 4 ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              4. Confirm Import
            </div>
            <div className={`p-2 rounded-lg transition-all ${step === 5 ? "bg-emerald-600 text-white font-bold shadow-sm" : "text-muted-foreground"}`}>
              5. Completed
            </div>
          </div>

          {/* STEP 1: Upload Dropzone */}
          {step === 1 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Upload Spreadsheet File</CardTitle>
                <CardDescription>
                  Upload your Excel (.xlsx, .xls) or CSV file containing existing student records.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 rounded-2xl p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
                  onClick={() => document.getElementById("bulk-file-input")?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileDrop(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <input
                    id="bulk-file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileDrop(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">Click to select or drag and drop your spreadsheet</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, and .csv up to 100MB</p>
                  </div>
                  {isParsing && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary animate-pulse mt-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Parsing spreadsheet headers and records...
                    </div>
                  )}
                </div>

                {/* Important Migration Directives Callout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-card border border-border/70 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Strict Relational Architecture
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Imports create complete relational entities across identity, contacts, academic records, and emergency guardians safely.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/70 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                      <Database className="h-4 w-4 text-blue-600" />
                      Document Version Integrity
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Passport, Visa, and eFRRO numbers are stored in metadata. No fake document versions or empty R2 files are created. First actual upload becomes v1.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-border/70 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      Automatic Academic Progression
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Automatically computes current semester and expected graduation from the student&apos;s admission date and configured course structure.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Map Columns */}
          {step === 2 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg">Step 2: Match Spreadsheet Columns to ISCMS Fields</CardTitle>
                  <CardDescription>
                    We automatically detected and suggested matching fields for your {detectedHeaders.length} columns. Review and adjust below.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {rawRows.length} Rows Detected
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[30%]">Spreadsheet Header</TableHead>
                        <TableHead className="w-[30%]">Sample Value (Row 1)</TableHead>
                        <TableHead className="w-[40%]">Target ISCMS Field</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectedHeaders.map((header) => {
                        const currentMapped = columnMapping[header] || "ignore";
                        const sampleVal = rawRows[0]?.[header] || "";
                        const def = ISCMS_FIELD_DEFINITIONS.find(d => d.field === currentMapped);

                        return (
                          <TableRow key={header} className="hover:bg-muted/20">
                            <TableCell className="font-medium text-xs">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{header}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                              {sampleVal ? sampleVal : <span className="italic text-muted-foreground/60">(empty)</span>}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={currentMapped}
                                onValueChange={(val) => {
                                  setColumnMapping(prev => ({
                                    ...prev,
                                    [header]: val as (ISCMSImportField | "ignore")
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select target field..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  <SelectItem value="ignore" className="text-xs text-muted-foreground font-semibold">
                                    — Ignore this column —
                                  </SelectItem>

                                  {["Identity", "Contact", "Academic", "Emergency", "Passport", "Visa", "eFRRO", "Embassy"].map(category => (
                                    <SelectGroup key={category}>
                                      <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground">
                                        {category}
                                      </SelectLabel>
                                      {ISCMS_FIELD_DEFINITIONS.filter(d => d.category === category).map(f => (
                                        <SelectItem key={f.field} value={f.field} className="text-xs">
                                          {f.label} {f.required ? "*" : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ))}
                                </SelectContent>
                              </Select>
                              {def && (
                                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                                  {def.required && (
                                    <span className="text-rose-600 font-semibold">Required</span>
                                  )}
                                  <span>• {def.description}</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetWizard}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Upload Different File
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRunValidation}
                    disabled={isValidating}
                    className="gap-2"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Validating Data Against ISCMS...
                      </>
                    ) : (
                      <>
                        Validate Data & Preview
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Validate & Review Report */}
          {step === 3 && validationReport && (
            <div className="space-y-6">
              {/* Validation Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-4 rounded-xl border border-border/60 bg-card">
                  <div className="text-xs text-muted-foreground font-medium">Total Rows</div>
                  <div className="text-2xl font-black mt-1">{validationReport.totalRows}</div>
                </Card>

                <Card className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Valid Records
                  </div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                    {validationReport.validCount}
                  </div>
                </Card>

                <Card className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
                  <div className="text-xs text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Errors
                  </div>
                  <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
                    {validationReport.errorCount}
                  </div>
                </Card>

                <Card className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Duplicates
                  </div>
                  <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                    {validationReport.duplicateCount}
                  </div>
                </Card>

                <Card className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                  <div className="text-xs text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Warnings
                  </div>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
                    {validationReport.warningCount}
                  </div>
                </Card>
              </div>

              {/* Subtabs: Issues vs Data Preview */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <Button
                      variant={reviewTab === "issues" ? "secondary" : "ghost"}
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => setReviewTab("issues")}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Validation Issues ({filteredIssues.length})
                    </Button>
                    <Button
                      variant={reviewTab === "preview" ? "secondary" : "ghost"}
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => setReviewTab("preview")}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview Clean Records ({validationReport.validCount})
                    </Button>
                  </div>

                  {reviewTab === "issues" && (
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <Select
                        value={issuesFilter}
                        onValueChange={(val: any) => setIssuesFilter(val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">All Issues</SelectItem>
                          <SelectItem value="errors" className="text-xs">Errors Only</SelectItem>
                          <SelectItem value="duplicates" className="text-xs">Duplicates Only</SelectItem>
                          <SelectItem value="warnings" className="text-xs">Warnings Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-4">
                  {/* ISSUES VIEW */}
                  {reviewTab === "issues" && (
                    <div className="space-y-4">
                      {filteredIssues.length === 0 ? (
                        <div className="py-12 text-center space-y-2">
                          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                          <p className="text-sm font-semibold">No issues found!</p>
                          <p className="text-xs text-muted-foreground">All rows passed validation checks cleanly.</p>
                        </div>
                      ) : (
                        <div className="border rounded-xl overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead className="w-16">Row #</TableHead>
                                <TableHead className="w-24">Type</TableHead>
                                <TableHead className="w-40">Field</TableHead>
                                <TableHead className="w-48">Value</TableHead>
                                <TableHead>Problem & Guidance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredIssues.slice(0, 50).map((issue, idx) => (
                                <TableRow key={idx} className="hover:bg-muted/20">
                                  <TableCell className="font-mono text-xs font-bold">
                                    Row {issue.rowNumber}
                                  </TableCell>
                                  <TableCell>
                                    {issue.type === "error" && (
                                      <Badge variant="destructive" className="text-[10px] uppercase">
                                        Error
                                      </Badge>
                                    )}
                                    {issue.type === "duplicate" && (
                                      <Badge variant="outline" className="text-[10px] uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold">
                                        Duplicate
                                      </Badge>
                                    )}
                                    {issue.type === "warning" && (
                                      <Badge variant="outline" className="text-[10px] uppercase bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40">
                                        Warning
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs font-semibold">
                                    {issue.fieldLabel}
                                  </TableCell>
                                  <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                                    {issue.value}
                                  </TableCell>
                                  <TableCell className="text-xs space-y-0.5">
                                    <div className="font-medium text-foreground">{issue.message}</div>
                                    {issue.suggestion && (
                                      <div className="text-[11px] text-muted-foreground">
                                        <span className="font-semibold text-primary">Correction:</span> {issue.suggestion}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {filteredIssues.length > 50 && (
                            <div className="p-2 text-center text-xs text-muted-foreground border-t">
                              Showing first 50 issues out of {filteredIssues.length} total.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PREVIEW VIEW */}
                  {reviewTab === "preview" && (
                    <div className="space-y-4">
                      {validationReport.validCount === 0 ? (
                        <div className="py-12 text-center space-y-2">
                          <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
                          <p className="text-sm font-semibold">No valid records to preview</p>
                          <p className="text-xs text-muted-foreground">Please fix the validation errors and re-upload.</p>
                        </div>
                      ) : (
                        <>
                          <div className="border rounded-xl overflow-x-auto">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead className="w-16">Row</TableHead>
                                  <TableHead>Registration No</TableHead>
                                  <TableHead>Student Name</TableHead>
                                  <TableHead>Nationality</TableHead>
                                  <TableHead>Program / Course</TableHead>
                                  <TableHead>Admission Date</TableHead>
                                  <TableHead>Semester (Auto)</TableHead>
                                  <TableHead>Passport / Visa</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedRows.map((r) => (
                                  <TableRow key={r.rowNumber} className="hover:bg-muted/20">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                      {r.rowNumber}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs font-bold text-primary">
                                      {r.mappedData.registration_number}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium">
                                      {r.mappedData.full_name}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {r.mappedData.nationality}
                                    </TableCell>
                                    <TableCell className="text-xs truncate max-w-[200px]">
                                      {r.mappedData.academic_program}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">
                                      {r.mappedData.admission_date}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <Badge variant="outline" className="bg-primary/5 text-primary text-[10px]">
                                        Semester {r.calculatedProgression?.currentSemester || 1}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                      {r.mappedData.passport_number || "No Passport"} / {r.mappedData.visa_number || "No Visa"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Pagination */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                            <div>
                              Showing {(previewPage - 1) * pageSize + 1} to {Math.min(previewPage * pageSize, validationReport.validCount)} of {validationReport.validCount} valid records
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={previewPage <= 1}
                                onClick={() => setPreviewPage(p => p - 1)}
                              >
                                Previous
                              </Button>
                              <span>Page {previewPage} of {totalPreviewPages}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={previewPage >= totalPreviewPages}
                                onClick={() => setPreviewPage(p => p + 1)}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Column Mapping
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetWizard}
                    className="gap-2 text-muted-foreground"
                  >
                    Cancel & Start Over
                  </Button>
                  <Button
                    size="sm"
                    disabled={validationReport.validCount === 0}
                    onClick={() => setStep(4)}
                    className="gap-2 bg-primary font-semibold"
                  >
                    Proceed to Import ({validationReport.validCount} Students)
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Confirm Import */}
          {step === 4 && validationReport && (
            <Card className="border-border/60 shadow-sm max-w-2xl mx-auto">
              <CardHeader className="text-center pb-2">
                <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Database className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl">Confirm Student Bulk Import</CardTitle>
                <CardDescription>
                  You are about to import {validationReport.validCount} verified student records into the ISCMS database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="p-4 rounded-xl bg-muted/40 border space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Source File:</span>
                    <span className="font-semibold">{selectedFile?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Total Rows in Spreadsheet:</span>
                    <span className="font-semibold">{validationReport.totalRows}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Records to be Created:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{validationReport.validCount} students</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Rows Skipped (Errors / Duplicates):</span>
                    <span className="font-semibold text-rose-600">{validationReport.errorCount + validationReport.duplicateCount}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Automatic Progression:</span>
                    <span className="font-semibold text-primary">Active Course Progression Engine</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong>Pre-existing records will not be overwritten.</strong> All imported students will be tracked with a distinct batch identifier for auditable rollback if needed.
                  </div>
                </div>

                {isImporting && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-semibold text-primary">
                      <span>Importing student database records...</span>
                      <span>Processing...</span>
                    </div>
                    <div className="w-full bg-primary/20 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full animate-pulse w-full"></div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(3)}
                    disabled={isImporting}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Review
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCommitImport}
                    disabled={isImporting}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Importing Records...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Execute Import ({validationReport.validCount} Students)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 5: Complete */}
          {step === 5 && importResult && (
            <Card className="border-border/60 shadow-sm max-w-2xl mx-auto">
              <CardHeader className="text-center pb-2">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <CardTitle className="text-2xl font-black">Student Migration Complete!</CardTitle>
                <CardDescription>
                  Batch <strong className="font-mono text-foreground">{importResult.batchNumber}</strong> has been successfully processed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{importResult.importedCount}</div>
                    <div className="text-[11px] text-muted-foreground font-semibold mt-0.5">Imported</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border">
                    <div className="text-2xl font-black text-foreground">{importResult.skippedCount}</div>
                    <div className="text-[11px] text-muted-foreground font-semibold mt-0.5">Skipped</div>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <div className="text-2xl font-black text-rose-700 dark:text-rose-400">{importResult.failedCount}</div>
                    <div className="text-[11px] text-muted-foreground font-semibold mt-0.5">Failed</div>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  The imported students are now active in ISCMS and accessible under the Students directory.
                </p>

                <div className="flex items-center justify-center gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetWizard}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Import Another File
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push("/students")}
                    className="gap-2 bg-primary font-semibold"
                  >
                    <Eye className="h-4 w-4" />
                    View Student Directory
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: IMPORT HISTORY & BATCH ROLLBACK */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg">Audit Log & Batch History</CardTitle>
                <CardDescription>
                  All past spreadsheet imports are permanently audited. Administrators can view details or roll back a specific batch.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
                  Loading import batch history...
                </div>
              ) : historyBatches.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <History className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm font-semibold">No import batches found</p>
                  <p className="text-xs text-muted-foreground">Use the &ldquo;New Bulk Import&rdquo; tab to perform your first migration.</p>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Imported</TableHead>
                        <TableHead className="text-center">Skipped</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyBatches.map((batch) => (
                        <TableRow key={batch.id} className="hover:bg-muted/20">
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {batch.batchNumber}
                          </TableCell>
                          <TableCell className="text-xs font-medium truncate max-w-[200px]">
                            {batch.fileName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {new Date(batch.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono font-semibold">
                            {batch.totalRows}
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono font-bold text-emerald-600">
                            {batch.importedCount}
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono text-muted-foreground">
                            {batch.skippedCount}
                          </TableCell>
                          <TableCell>
                            {batch.status === "completed" && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                Completed
                              </Badge>
                            )}
                            {batch.status === "rolled_back" && (
                              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                                Rolled Back
                              </Badge>
                            )}
                            {batch.status === "failed" && (
                              <Badge variant="destructive" className="text-[10px]">
                                Failed
                              </Badge>
                            )}
                            {batch.status === "processing" && (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 animate-pulse">
                                Processing
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {batch.status === "completed" && batch.importedCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
                                onClick={() => setRollbackBatch(batch)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Rollback Batch
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rollback Batch Confirmation Dialog */}
      <Dialog open={!!rollbackBatch} onOpenChange={(open) => !open && setRollbackBatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Confirm Batch Rollback
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              You are about to roll back import batch <strong className="font-mono text-foreground">{rollbackBatch?.batchNumber}</strong> ({rollbackBatch?.fileName}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300">
              <strong>Warning:</strong> This will delete <strong>{rollbackBatch?.importedCount}</strong> student record(s) created in this specific batch.
              Students who have already uploaded active compliance document files will prevent rollback to avoid data loss.
            </div>
            <p className="text-muted-foreground">
              Pre-existing students in ISCMS are completely unaffected.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRollbackBatch(null)}
              disabled={isRollingBack}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteRollback}
              disabled={isRollingBack}
              className="gap-1.5"
            >
              {isRollingBack ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Rolling Back...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Confirm & Delete Imported Students
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
