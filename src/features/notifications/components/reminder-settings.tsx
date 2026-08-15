"use client";

import * as React from "react";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  HelpCircle, 
  FileText, 
  Mail, 
  MessageSquare, 
  Check, 
  X, 
  Clock, 
  Layers, 
  Filter, 
  RefreshCw 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  fetchReminderRules, 
  saveReminderRule, 
  deleteReminderRule, 
  toggleReminderRule, 
  fetchNotificationTemplates, 
  ReminderRuleDto, 
  NotificationTemplateDto 
} from "@/app/(app)/reminders/actions";

interface CustomSwitchProps {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  "aria-label"?: string;
  disabled?: boolean;
}

export function CustomSwitch({ checked, onCheckedChange, "aria-label": ariaLabel, disabled }: CustomSwitchProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`${
        checked ? "bg-primary" : "bg-muted"
      } relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span
        className={`${
          checked ? "translate-x-4" : "translate-x-0"
        } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );
}

export function ReminderSettings(): React.JSX.Element {
  const [rules, setRules] = React.useState<ReminderRuleDto[]>([]);
  const [templates, setTemplates] = React.useState<NotificationTemplateDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDocFilter, setSelectedDocFilter] = React.useState<"all" | "passport" | "visa" | "efrro">("all");

  // Create / Edit Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<Partial<ReminderRuleDto> | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedRules, fetchedTemplates] = await Promise.all([
        fetchReminderRules(),
        fetchNotificationTemplates()
      ]);
      setRules(fetchedRules);
      setTemplates(fetchedTemplates);
    } catch {
      toast.error("Failed to load reminder configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRules = React.useMemo(() => {
    if (selectedDocFilter === "all") return rules;
    return rules.filter(r => r.documentType === selectedDocFilter);
  }, [rules, selectedDocFilter]);

  const handleOpenCreateDialog = () => {
    const docType = selectedDocFilter === "all" ? "passport" : selectedDocFilter;
    setEditingRule({
      documentType: docType,
      alertThresholdDays: 30,
      channel: "both",
      isActive: true,
      ruleName: `${docType.toUpperCase()} 30-Day Reminder`,
      templateId: null
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (rule: ReminderRuleDto) => {
    setEditingRule({ ...rule });
    setIsDialogOpen(true);
  };

  const handleToggle = async (rule: ReminderRuleDto) => {
    const newStatus = !rule.isActive;
    // Optimistic UI update
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: newStatus } : r));
    
    const res = await toggleReminderRule(rule.id, newStatus);
    if (!res.success) {
      // Revert on error
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !newStatus } : r));
      toast.error(res.error || "Failed to toggle rule");
    } else {
      toast.success(newStatus ? "Reminder rule activated" : "Reminder rule deactivated");
    }
  };

  const handleDelete = async (id: string, ruleName: string) => {
    if (!confirm(`Are you sure you want to delete '${ruleName}'?`)) return;
    
    setRules(prev => prev.filter(r => r.id !== id));
    const res = await deleteReminderRule(id);
    if (!res.success) {
      toast.error(res.error || "Failed to delete rule");
      loadData();
    } else {
      toast.success("Reminder rule removed");
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    if (editingRule.alertThresholdDays === undefined || isNaN(Number(editingRule.alertThresholdDays))) {
      toast.error("Please enter a valid threshold days offset.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveReminderRule({
        id: editingRule.id,
        documentType: (editingRule.documentType as "passport" | "visa" | "efrro") || "passport",
        alertThresholdDays: Number(editingRule.alertThresholdDays),
        channel: (editingRule.channel as "email" | "whatsapp" | "both") || "whatsapp",
        isActive: editingRule.isActive ?? true,
        ruleName: editingRule.ruleName?.trim() || `${editingRule.documentType?.toUpperCase()} ${editingRule.alertThresholdDays}-Day Reminder`,
        templateId: editingRule.templateId || null
      });

      if (res.success) {
        toast.success(editingRule.id ? "Reminder rule updated" : "Reminder rule created");
        setIsDialogOpen(false);
        setEditingRule(null);
        await loadData();
      } else {
        toast.error(res.error || "Failed to save reminder rule");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getDocBadgeColor = (type: string) => {
    switch (type) {
      case "passport": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "visa": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "efrro": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  // Filter available templates for modal dropdown based on current document type
  const editingDocType = editingRule?.documentType;
  const modalTemplates = React.useMemo(() => {
    if (!editingDocType) return templates;
    return templates.filter(t => t.documentType === editingDocType || t.documentType === "all");
  }, [templates, editingDocType]);

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      {/* Header controls and Document Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/65 p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Document Scope:
          </span>
          <button
            onClick={() => setSelectedDocFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDocFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            All Documents ({rules.length})
          </button>
          <button
            onClick={() => setSelectedDocFilter("passport")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDocFilter === "passport"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Passport ({rules.filter(r => r.documentType === "passport").length})
          </button>
          <button
            onClick={() => setSelectedDocFilter("visa")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDocFilter === "visa"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Visa ({rules.filter(r => r.documentType === "visa").length})
          </button>
          <button
            onClick={() => setSelectedDocFilter("efrro")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedDocFilter === "efrro"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            eFRRO ({rules.filter(r => r.documentType === "efrro").length})
          </button>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Button variant="outline" size="sm" onClick={loadData} className="h-8 text-xs gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={handleOpenCreateDialog} className="h-8 text-xs gap-1.5 shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Create Reminder Rule
          </Button>
        </div>
      </div>

      {/* Rules Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <Card key={n} className="border border-border/40 bg-card/40 animate-pulse h-40">
              <CardContent className="p-4" />
            </Card>
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <Card className="border border-dashed border-border/80 bg-muted/10 p-12 text-center">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-foreground">No Reminder Rules Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {selectedDocFilter === "all"
              ? "No compliance alert threshold rules have been configured yet."
              : `No reminder rules found for ${selectedDocFilter.toUpperCase()}. Click Create Rule to configure one.`}
          </p>
          <Button size="sm" onClick={handleOpenCreateDialog} className="mt-4 text-xs gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add First Rule
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRules.map(rule => {
            const isNegative = rule.alertThresholdDays < 0;
            const triggerText = isNegative 
              ? `${Math.abs(rule.alertThresholdDays)} days AFTER expiry (Overdue Notice)` 
              : `${rule.alertThresholdDays} days BEFORE expiry`;

            return (
              <Card 
                key={rule.id} 
                className={`border transition-all duration-200 hover:shadow-md ${
                  rule.isActive 
                    ? "border-border/70 bg-card/75 shadow-sm" 
                    : "border-border/40 bg-muted/20 opacity-75"
                }`}
              >
                <CardHeader className="pb-3 border-b border-border/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getDocBadgeColor(rule.documentType)}`}>
                          {rule.documentType}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {rule.channel === "whatsapp" ? "WhatsApp" : "Email (Disabled)"}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground mt-1 line-clamp-1">
                        {rule.ruleName}
                      </CardTitle>
                    </div>

                    <CustomSwitch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggle(rule)}
                      aria-label={`Toggle ${rule.ruleName}`}
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Trigger Schedule:
                      </span>
                      <span className={`font-semibold ${isNegative ? "text-rose-500 font-bold" : "text-foreground"}`}>
                        {triggerText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <FileText className="h-3.5 w-3.5 text-primary" /> Bound Template:
                      </span>
                      <span className="font-medium text-foreground truncate max-w-[140px]" title={rule.templateTitle || "System Default"}>
                        {rule.templateTitle || "Auto-Selected"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        {rule.channel === "email" ? (
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                        ) : rule.channel === "whatsapp" ? (
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Layers className="h-3.5 w-3.5 text-indigo-500" />
                        )}
                        Active Channel:
                      </span>
                      <span className="font-medium text-foreground capitalize">
                        {rule.channel}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${rule.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {rule.isActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {rule.isActive ? "Rule Enabled" : "Rule Deactivated"}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-foreground" 
                        onClick={() => handleOpenEditDialog(rule)}
                        title="Edit Rule"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-rose-500 hover:bg-rose-500/10" 
                        onClick={() => handleDelete(rule.id, rule.ruleName)}
                        title="Delete Rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Note */}
      <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg flex items-start gap-2.5 text-muted-foreground text-[11px]">
        <HelpCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Rule Execution Invariant:</span> Reminders automatically evaluate the current verified document version or stored metadata for each student. Positive threshold offsets (e.g. 30) fire prior to expiration; negative offsets (e.g. -7) fire after expiration. Duplicate dispatches are prevented via cryptographic idempotency keys.
        </div>
      </div>

      {/* Create / Edit Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingRule?.id ? "Edit Reminder Rule" : "Create Reminder Rule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Rule Name */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Rule Name / Title</label>
              <Input
                value={editingRule?.ruleName || ""}
                onChange={(e) => setEditingRule(prev => prev ? { ...prev, ruleName: e.target.value } : null)}
                placeholder="e.g. Passport 30-Day Urgent Renewal"
                className="h-8 text-xs"
              />
            </div>

            {/* Document Type */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Target Document Type</label>
              <select
                value={editingRule?.documentType || "passport"}
                onChange={(e) => {
                  const doc = e.target.value as "passport" | "visa" | "efrro";
                  setEditingRule(prev => prev ? {
                    ...prev,
                    documentType: doc,
                    ruleName: prev.ruleName ? prev.ruleName.replace(/^(PASSPORT|VISA|EFRRO)/i, doc.toUpperCase()) : `${doc.toUpperCase()} ${prev.alertThresholdDays}-Day Reminder`
                  } : null);
                }}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="passport">Passport</option>
                <option value="visa">Student Visa</option>
                <option value="efrro">eFRRO / Residential Permit</option>
              </select>
            </div>

            {/* Threshold Days */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Alert Threshold (Days Offset)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editingRule?.alertThresholdDays ?? 30}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, alertThresholdDays: parseInt(e.target.value) || 0 } : null)}
                  className="h-8 text-xs font-semibold"
                />
                <span className="text-muted-foreground whitespace-nowrap text-[11px]">
                  {(editingRule?.alertThresholdDays ?? 30) >= 0 ? "days before expiry" : "days post-expiry (overdue)"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tip: Enter 90, 60, 30, 15, or 7 for pre-expiry alerts, or -7 for post-expiry grace warnings.
              </p>
            </div>

            {/* Provider Channel */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Delivery Channel</label>
              <select
                value={editingRule?.channel || "whatsapp"}
                onChange={(e) => setEditingRule(prev => prev ? { ...prev, channel: e.target.value as "email" | "whatsapp" | "both" } : null)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="whatsapp">WhatsApp (Active)</option>
                <option value="email" disabled>Email Only — Coming Soon (Disabled)</option>
                <option value="both" disabled>Email & WhatsApp — Coming Soon (Disabled)</option>
              </select>
            </div>

            {/* Bound Template */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Notification Template (Optional)</label>
              <select
                value={editingRule?.templateId || ""}
                onChange={(e) => setEditingRule(prev => prev ? { ...prev, templateId: e.target.value || null } : null)}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Auto-resolve from system default</option>
                {modalTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.code} - {t.languageCode.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <span className="font-semibold text-foreground">Enable Rule</span>
              <CustomSwitch
                checked={editingRule?.isActive ?? true}
                onCheckedChange={(val) => setEditingRule(prev => prev ? { ...prev, isActive: val } : null)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} disabled={isSaving} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveRule} disabled={isSaving} className="text-xs">
              {isSaving ? "Saving..." : editingRule?.id ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
