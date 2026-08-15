"use client";

import * as React from "react";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Edit2, 
  FileText, 
  Eye, 
  RefreshCw, 
  Mail,
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  History,
  AlertTriangle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  fetchNotificationTemplates, 
  saveNotificationTemplate, 
  duplicateNotificationTemplate, 
  toggleNotificationTemplateStatus, 
  deleteNotificationTemplate,
  fetchTemplateAuditLogs,
  NotificationTemplateDto,
  TemplateAuditLogDto
} from "@/app/(app)/reminders/actions";
import { TemplateValidator, GLOBAL_ALLOWED_TOKENS } from "@/domain/notifications/validators/template.validator";

export interface TemplateManagerProps {
  initialTemplates?: NotificationTemplateDto[];
}

const SAMPLE_INTERPOLATION_DATA: Record<string, string> = {
  student_name: "Rahul Sharma",
  enrollment_number: "2026-INT-00452",
  document_type: "Passport",
  expiry_date: "15 September 2026",
  days_remaining: "30",
  days_left: "30",
  institution_name: "National Forensic Sciences University",
  current_date: "15 August 2026",
  program_name: "M.Sc. Forensic Cyber Security",
  otp_code: "849201",
  rejection_reason: "Document photo is blurry and government stamp is not clearly legible.",
  upload_window_hours: "48",
  secure_upload_link: "https://iscms.nfsu.edu/student/upload/auth-token-sample"
};

export function TemplateManager({ initialTemplates = [] }: TemplateManagerProps) {
  const [templates, setTemplates] = React.useState<NotificationTemplateDto[]>(initialTemplates);
  const [loading, setLoading] = React.useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [docFilter, setDocFilter] = React.useState<string>("all");
  const [channelFilter, setChannelFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Modal / Drawer state
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [isAuditOpen, setIsAuditOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<NotificationTemplateDto | null>(null);
  const [previewTemplate, setPreviewTemplate] = React.useState<NotificationTemplateDto | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<TemplateAuditLogDto[]>([]);
  const [auditLoading, setAuditLoading] = React.useState(false);

  // Active preview tab inside editor
  const [editorPreviewMode, setEditorPreviewMode] = React.useState<"edit" | "preview">("edit");
  const [saving, setSaving] = React.useState(false);

  // Ref to textarea for cursor-based variable insertion
  const bodyTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotificationTemplates({
        searchQuery,
        documentType: docFilter,
        channel: channelFilter,
        category: categoryFilter,
        status: statusFilter
      });
      setTemplates(data);
    } catch (err) {
      toast.error("Failed to load notification templates");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, docFilter, channelFilter, categoryFilter, statusFilter]);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleOpenCreate = () => {
    setEditingTemplate({
      id: `temp-${Date.now()}`,
      code: "",
      languageCode: "en",
      version: 1,
      isActive: true,
      status: "ACTIVE",
      title: "",
      documentType: "passport",
      eventType: "document_expiry",
      channel: "whatsapp",
      category: "utility",
      providerTemplateName: "",
      subjectTemplate: "",
      bodyTemplate: "Dear {{student_name}},\n\nYour {{document_type}} will expire on {{expiry_date}}, which is {{days_remaining}} days from now.\n\nPlease initiate the renewal process in sufficient time.\n\nRegards,\n{{institution_name}}"
    });
    setEditorPreviewMode("edit");
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (template: NotificationTemplateDto) => {
    setEditingTemplate({ ...template });
    setEditorPreviewMode("edit");
    setIsEditorOpen(true);
  };

  const handleOpenPreview = (template: NotificationTemplateDto) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleOpenAudit = async (template: NotificationTemplateDto) => {
    setPreviewTemplate(template);
    setIsAuditOpen(true);
    setAuditLoading(true);
    try {
      const logs = await fetchTemplateAuditLogs(template.id);
      setAuditLogs(logs);
    } catch (err) {
      toast.error("Failed to load audit history.");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleDuplicate = async (template: NotificationTemplateDto) => {
    try {
      toast.loading("Duplicating template...", { id: "duplicate-toast" });
      const res = await duplicateNotificationTemplate(template.id);
      if (res.success && res.template) {
        toast.success(`Duplicated to '${res.template.title}' (Draft)`, { id: "duplicate-toast" });
        loadTemplates();
      } else {
        toast.error(res.error || "Failed to duplicate template", { id: "duplicate-toast" });
      }
    } catch (err) {
      toast.error("Error duplicating template", { id: "duplicate-toast" });
    }
  };

  const handleToggleStatus = async (template: NotificationTemplateDto) => {
    const nextStatus = template.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await toggleNotificationTemplateStatus(template.id, nextStatus);
      if (res.success) {
        toast.success(`Template marked as ${nextStatus}`);
        loadTemplates();
      } else {
        toast.error(res.error || "Failed to toggle status");
      }
    } catch (err) {
      toast.error("Error toggling template status");
    }
  };

  const handleDelete = async (template: NotificationTemplateDto) => {
    if (!confirm(`Are you sure you want to delete or archive '${template.title}'?`)) return;

    try {
      const res = await deleteNotificationTemplate(template.id);
      if (res.success) {
        if (res.archived) {
          toast.info(`Template was archived because historical notifications or rules reference it.`);
        } else {
          toast.success("Template deleted successfully.");
        }
        loadTemplates();
      } else {
        toast.error(res.error || "Failed to delete template");
      }
    } catch (err) {
      toast.error("Error deleting template");
    }
  };

  const handleInsertToken = (token: string) => {
    if (!editingTemplate) return;
    const tokenFormatted = `{{${token}}}`;
    const textarea = bodyTextareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const currentBody = editingTemplate.bodyTemplate || "";
      const newBody = currentBody.substring(0, start) + tokenFormatted + currentBody.substring(end);
      
      setEditingTemplate(prev => prev ? { ...prev, bodyTemplate: newBody } : null);

      // Restore focus and position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tokenFormatted.length, start + tokenFormatted.length);
      }, 0);
    } else {
      setEditingTemplate(prev => prev ? { ...prev, bodyTemplate: (prev.bodyTemplate || "") + " " + tokenFormatted } : null);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    // Client-side validation check
    const validation = TemplateValidator.validateTemplate({
      title: editingTemplate.title,
      code: editingTemplate.code,
      eventType: editingTemplate.eventType,
      documentType: editingTemplate.documentType,
      channel: editingTemplate.channel,
      category: editingTemplate.category,
      status: editingTemplate.status,
      subjectTemplate: editingTemplate.subjectTemplate,
      bodyTemplate: editingTemplate.bodyTemplate,
      languageCode: editingTemplate.languageCode
    });

    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    setSaving(true);
    try {
      const res = await saveNotificationTemplate({
        id: editingTemplate.id,
        code: editingTemplate.code,
        languageCode: editingTemplate.languageCode,
        version: editingTemplate.version || 1,
        status: editingTemplate.status || "ACTIVE",
        title: editingTemplate.title,
        documentType: editingTemplate.documentType || "passport",
        eventType: editingTemplate.eventType || "document_expiry",
        channel: editingTemplate.channel || "both",
        category: editingTemplate.category || "utility",
        providerTemplateName: editingTemplate.providerTemplateName,
        subjectTemplate: editingTemplate.subjectTemplate || "",
        bodyTemplate: editingTemplate.bodyTemplate || ""
      });

      if (res.success) {
        toast.success("Template saved successfully.");
        setIsEditorOpen(false);
        loadTemplates();
      } else {
        toast.error(res.error || "Failed to save template");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  // Helper to interpolate tokens for live preview
  const renderInterpolated = (templateString: string) => {
    if (!templateString) return "";
    return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return SAMPLE_INTERPOLATION_DATA[key] || `{{${key}}}`;
    });
  };

  const getDocBadgeColor = (type?: string) => {
    switch (type) {
      case "passport": return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
      case "visa": return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
      case "efrro": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      case "general": return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold">Active</Badge>;
      case "DRAFT":
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold">Draft</Badge>;
      case "ARCHIVED":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] uppercase font-bold">Archived</Badge>;
      default:
        return <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] uppercase font-bold">Inactive</Badge>;
    }
  };

  // Validation report for currently edited template
  const currentValidation = React.useMemo(() => {
    if (!editingTemplate) return { isValid: true, errors: [], invalidTokens: [], malformedSyntax: [] };
    return TemplateValidator.validateTemplate({
      title: editingTemplate.title,
      code: editingTemplate.code,
      eventType: editingTemplate.eventType,
      documentType: editingTemplate.documentType,
      channel: editingTemplate.channel,
      category: editingTemplate.category,
      status: editingTemplate.status,
      subjectTemplate: editingTemplate.subjectTemplate,
      bodyTemplate: editingTemplate.bodyTemplate,
      languageCode: editingTemplate.languageCode
    });
  }, [editingTemplate]);

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/65 p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Template Manager
          </h2>
          <p className="text-xs text-muted-foreground">
            Create and manage the messages used by automated compliance notifications via WhatsApp. (Email integration coming soon.)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={loadTemplates}
            variant="outline"
            size="sm"
            className="text-xs font-semibold rounded-lg gap-1.5 h-8"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="text-xs font-semibold rounded-lg gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 bg-card/40 p-3 rounded-xl border border-border/60">
        {/* Search */}
        <div className="relative sm:col-span-2 md:col-span-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/80"
          />
        </div>

        {/* Document Scope */}
        <div className="space-y-0.5">
          <select
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background/80 px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Document: All Documents</option>
            <option value="passport">Passport</option>
            <option value="visa">Visa</option>
            <option value="efrro">eFRRO</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* Channel */}
        <div className="space-y-0.5">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background/80 px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Channel: All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email" disabled>Email — Coming Soon (Disabled)</option>
          </select>
        </div>

        {/* Category */}
        <div className="space-y-0.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background/80 px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Category: All Categories</option>
            <option value="utility">Utility (Reminders)</option>
            <option value="authentication">Authentication (OTP)</option>
          </select>
        </div>

        {/* Status */}
        <div className="space-y-0.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background/80 px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Status: All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Templates List Table / Responsive Cards */}
      <Card className="border border-border/80 shadow-xs rounded-xl overflow-hidden bg-card">
        <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Configured Notification Message Templates
            </span>
            <span className="font-mono text-[11px] text-muted-foreground font-normal">
              {templates.length} {templates.length === 1 ? "Template" : "Templates"}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No notification templates found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || docFilter !== "all" || channelFilter !== "all" || categoryFilter !== "all"
                    ? "No templates match your active filters. Clear search or filters to see all available templates."
                    : "Templates define the messages ISCMS sends for automated compliance reminders and system notifications."}
                </p>
              </div>
              <Button onClick={handleOpenCreate} size="sm" className="text-xs font-semibold rounded-lg gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" />
                Create First Template
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/10 text-[11px] font-semibold text-muted-foreground">
                    <th className="py-3 px-4">Template Name & Code</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {templates.map((tpl) => {
                    const isWhatsApp = tpl.channel === "whatsapp" || tpl.channel === "both";
                    const isEmail = tpl.channel === "email" || tpl.channel === "both";

                    return (
                      <tr key={tpl.id} className="hover:bg-accent/30 transition-colors">
                        {/* Title & Code */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block">{tpl.title}</span>
                            <span className="font-mono text-[10px] text-muted-foreground block">{tpl.code} (v{tpl.version})</span>
                          </div>
                        </td>

                        {/* Document Scope */}
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${getDocBadgeColor(tpl.documentType)}`}>
                            {tpl.documentType}
                          </Badge>
                        </td>

                        {/* Channel */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {tpl.channel === "whatsapp" ? (
                              <>
                                <span title="WhatsApp"><MessageSquare className="h-3.5 w-3.5 text-emerald-500" /></span>
                                <span className="capitalize font-medium text-foreground">WhatsApp</span>
                              </>
                            ) : (
                              <>
                                <span title="Email (Coming Soon / Disabled)"><Mail className="h-3.5 w-3.5 text-blue-500 opacity-60" /></span>
                                <span className="capitalize font-medium text-muted-foreground text-[11px]">Email (Disabled)</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            tpl.category === "authentication" 
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" 
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                          }`}>
                            {tpl.category}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(tpl.status)}
                        </td>

                        {/* Updated */}
                        <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                          {tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleDateString() : "Initial"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleOpenPreview(tpl)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Live Preview"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              onClick={() => handleOpenEdit(tpl)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit Template"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              onClick={() => handleDuplicate(tpl)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Duplicate as Draft"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              onClick={() => handleToggleStatus(tpl)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title={tpl.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            >
                              {tpl.status === "ACTIVE" ? (
                                <ToggleRight className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>

                            <Button
                              onClick={() => handleOpenAudit(tpl)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="View Audit History"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              onClick={() => handleDelete(tpl)}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete / Archive Template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE & EDIT MODAL / DRAWER */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {editingTemplate?.id?.startsWith("temp-") ? "Create New Notification Template" : `Edit Template: ${editingTemplate?.title}`}
              </DialogTitle>

              {/* Edit / Preview Toggle */}
              <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => setEditorPreviewMode("edit")}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    editorPreviewMode === "edit" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Edit Message
                </button>
                <button
                  type="button"
                  onClick={() => setEditorPreviewMode("preview")}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                    editorPreviewMode === "preview" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Live Preview
                </button>
              </div>
            </div>
          </DialogHeader>

          {editorPreviewMode === "edit" ? (
            <div className="space-y-4 py-3 text-xs">
              {/* Validation Alert */}
              {!currentValidation.isValid && (
                <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Template Validation Warnings
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {currentValidation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Row 1: Title & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Template Name</label>
                  <Input
                    value={editingTemplate?.title || ""}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="e.g. Passport Expiry — 30 Days"
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Template Code Identifier</label>
                  <Input
                    value={editingTemplate?.code || ""}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, code: e.target.value.toUpperCase().replace(/\s+/g, "_") } : null)}
                    placeholder="e.g. PASSPORT_EXPIRY_30D"
                    className="h-8 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Row 2: Event, Document, Channel, Category */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Event Type */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Notification Event</label>
                  <select
                    value={editingTemplate?.eventType || "document_expiry"}
                    onChange={(e) => {
                      const evt = e.target.value as any;
                      setEditingTemplate(prev => prev ? {
                        ...prev,
                        eventType: evt,
                        category: evt === "portal_otp" ? "authentication" : "utility"
                      } : null);
                    }}
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="document_expiry">Document Expiry Reminder</option>
                    <option value="portal_otp">Student Portal Login OTP</option>
                    <option value="replacement_approved">Document Replacement Approved</option>
                    <option value="replacement_rejected">Document Replacement Rejected</option>
                    <option value="document_verified">Document Verification Approved</option>
                    <option value="document_rejected">Document Verification Rejected</option>
                    <option value="general_alert">General System Alert</option>
                  </select>
                </div>

                {/* Document Type */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Document Scope</label>
                  <select
                    value={editingTemplate?.documentType || "passport"}
                    onChange={(e) => {
                      const doc = e.target.value as any;
                      setEditingTemplate(prev => prev ? { ...prev, documentType: doc } : null);
                    }}
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="passport">Passport</option>
                    <option value="visa">Visa</option>
                    <option value="efrro">eFRRO</option>
                    <option value="general">General</option>
                    <option value="all">All Documents</option>
                  </select>
                </div>

                {/* Delivery Channel */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Target Channel</label>
                  <select
                    value={editingTemplate?.channel || "whatsapp"}
                    onChange={(e) => {
                      const ch = e.target.value as any;
                      setEditingTemplate(prev => prev ? { ...prev, channel: ch } : null);
                    }}
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email" disabled>Email — Coming Soon (Disabled)</option>
                    <option value="both" disabled>Both — Coming Soon (Disabled)</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Status</label>
                  <select
                    value={editingTemplate?.status || "ACTIVE"}
                    onChange={(e) => {
                      const st = e.target.value as any;
                      setEditingTemplate(prev => prev ? { ...prev, status: st, isActive: st === "ACTIVE" } : null);
                    }}
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Conditional WhatsApp Category */}
              {(editingTemplate?.channel === "whatsapp" || editingTemplate?.channel === "both") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-accent/20 border border-border/50">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                      WhatsApp Message Category
                    </label>
                    <select
                      value={editingTemplate?.category || "utility"}
                      onChange={(e) => {
                        const cat = e.target.value as any;
                        setEditingTemplate(prev => prev ? { ...prev, category: cat } : null);
                      }}
                      disabled={editingTemplate?.eventType === "portal_otp"}
                      className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="utility">Utility (Expiry Reminders & Notices)</option>
                      <option value="authentication">Authentication (OTP Only)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">External WhatsApp Template Name (Optional)</label>
                    <Input
                      value={editingTemplate?.providerTemplateName || ""}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, providerTemplateName: e.target.value } : null)}
                      placeholder="e.g. passport_expiry_reminder_v1"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Email Subject Line */}
              {(editingTemplate?.channel === "email" || editingTemplate?.channel === "both") && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                    Email Subject Line
                  </label>
                  <Input
                    value={editingTemplate?.subjectTemplate || ""}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, subjectTemplate: e.target.value } : null)}
                    placeholder="e.g. ISCMS Alert: {{document_type}} Expiration Notice for {{student_name}}"
                    className="h-8 text-xs font-medium"
                  />
                </div>
              )}

              {/* Variable Picker Toolbar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Insert Supported Variables (Click to Add):
                  </label>
                  <span className="text-[10px] text-muted-foreground">Interpolated automatically at dispatch</span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-accent/20 border border-border/50">
                  {Array.from(GLOBAL_ALLOWED_TOKENS).map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => handleInsertToken(token)}
                      className="px-2 py-1 rounded bg-card hover:bg-primary/10 hover:text-primary border border-border/60 text-[11px] font-mono transition-colors font-medium"
                    >
                      {`{{${token}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Body Textarea */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Message Body Layout</label>
                <Textarea
                  ref={bodyTextareaRef}
                  value={editingTemplate?.bodyTemplate || ""}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, bodyTemplate: e.target.value } : null)}
                  placeholder="Enter message layout..."
                  rows={8}
                  className="text-xs font-mono p-3 leading-relaxed"
                />
              </div>
            </div>
          ) : (
            /* Live Preview inside Editor */
            <div className="py-4 space-y-4">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Rendering live with sample student context (<strong>Rahul Sharma</strong>, Enrollment: <strong>2026-INT-00452</strong>)</span>
                <Badge variant="outline" className="text-[10px]">Sample Preview Mode</Badge>
              </div>

              {/* WhatsApp Speech Bubble */}
              {(editingTemplate?.channel === "whatsapp" || editingTemplate?.channel === "both") && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-muted-foreground text-[11px] flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp Bubble Preview:
                  </span>
                  <div className="max-w-md bg-[#DCF8C6] dark:bg-emerald-950/80 text-foreground p-4 rounded-2xl rounded-tl-sm shadow-sm border border-emerald-500/20 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {renderInterpolated(editingTemplate?.bodyTemplate || "")}
                    <div className="text-[9px] text-muted-foreground text-right mt-2 flex items-center justify-end gap-1">
                      <span>10:30 AM</span>
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Layout */}
              {(editingTemplate?.channel === "email" || editingTemplate?.channel === "both") && (
                <div className="space-y-1.5 pt-2">
                  <span className="font-semibold text-muted-foreground text-[11px] flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-500" /> Email Message Preview:
                  </span>
                  <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-sm">
                    <div className="bg-muted/40 p-3 border-b border-border/60 space-y-1 text-[11px]">
                      <div><strong>To:</strong> rahul.sharma@students.nfsu.edu</div>
                      <div><strong>Subject:</strong> {renderInterpolated(editingTemplate?.subjectTemplate || "")}</div>
                    </div>
                    <div className="p-4 whitespace-pre-wrap text-xs leading-relaxed">
                      {renderInterpolated(editingTemplate?.bodyTemplate || "")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-border/50 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditorOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || !currentValidation.isValid}
              className="text-xs font-semibold h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STANDALONE LIVE PREVIEW DIALOG */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/50">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Template Preview: {previewTemplate?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-4">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Rendering with realistic test profile data</span>
              <Badge variant="outline" className="text-[10px]">{previewTemplate?.code}</Badge>
            </div>

            {/* WhatsApp Bubble */}
            {(previewTemplate?.channel === "whatsapp" || previewTemplate?.channel === "both") && (
              <div className="space-y-1.5">
                <span className="font-semibold text-muted-foreground text-[11px] flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp Message:
                </span>
                <div className="max-w-md bg-[#DCF8C6] dark:bg-emerald-950/80 text-foreground p-4 rounded-2xl rounded-tl-sm shadow-sm border border-emerald-500/20 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {renderInterpolated(previewTemplate?.bodyTemplate || "")}
                  <div className="text-[9px] text-muted-foreground text-right mt-2 flex items-center justify-end gap-1">
                    <span>10:30 AM</span>
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Email Layout */}
            {(previewTemplate?.channel === "email" || previewTemplate?.channel === "both") && (
              <div className="space-y-1.5 pt-2">
                <span className="font-semibold text-muted-foreground text-[11px] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-500" /> Email Message:
                </span>
                <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-sm">
                  <div className="bg-muted/40 p-3 border-b border-border/60 space-y-1 text-[11px]">
                    <div><strong>To:</strong> rahul.sharma@students.nfsu.edu</div>
                    <div><strong>Subject:</strong> {renderInterpolated(previewTemplate?.subjectTemplate || "")}</div>
                  </div>
                  <div className="p-4 whitespace-pre-wrap text-xs leading-relaxed">
                    {renderInterpolated(previewTemplate?.bodyTemplate || "")}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/50">
            <Button size="sm" onClick={() => setIsPreviewOpen(false)} className="text-xs h-8">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AUDIT LOGS DIALOG */}
      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/50">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Template Revision Audit Trail: {previewTemplate?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-3">
            {auditLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading audit log timeline...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No revision audit records logged yet.</div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                {auditLogs.map((log) => (
                  <div key={log.id} className="relative flex items-start gap-3 text-xs">
                    <div className="absolute -left-[31px] top-0.5 h-5 w-5 rounded-full flex items-center justify-center border-2 border-primary bg-background z-10 text-primary">
                      <Clock className="h-3 w-3" />
                    </div>

                    <div className="flex-1 bg-accent/20 p-3.5 rounded-xl border border-border/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                          {log.action}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-1">
                        Triggered by <span className="font-semibold text-foreground">{log.actorEmail || "compliance_staff"}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/50">
            <Button size="sm" onClick={() => setIsAuditOpen(false)} className="text-xs h-8">
              Close Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
