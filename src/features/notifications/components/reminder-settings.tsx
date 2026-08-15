"use client";

import * as React from "react";
import { Plus, Trash, Save, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AsyncActionButton } from "@/components/ui/async-action-button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface ReminderRule {
  id: string;
  documentType: "passport" | "visa" | "efrro";
  alertThresholdDays: number;
  channel: "email" | "whatsapp" | "both";
  isActive: boolean;
}

interface CustomSwitchProps {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  "aria-label"?: string;
}

export function CustomSwitch({ checked, onCheckedChange, "aria-label": ariaLabel }: CustomSwitchProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={`${
        checked ? "bg-primary" : "bg-muted"
      } relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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
  const [rules, setRules] = React.useState<ReminderRule[]>([]);

  const [preferences, setPreferences] = React.useState({
    email: true,
    whatsapp: true,
    sms: false
  });

  // Reusable save action button states
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);

  const handlePreferenceToggle = (channel: "email" | "whatsapp" | "sms") => {
    setPreferences(prev => ({
      ...prev,
      [channel]: !prev[channel]
    }));
    toast.success("Preferences updated", { description: `Communication preferences changes saved.` });
  };

  const handleAddRule = () => {
    const newRule: ReminderRule = {
      id: `r-${Math.random().toString(36).substring(7)}`, // Note: Temp ID generator until real DB save
      documentType: "efrro",
      alertThresholdDays: 30,
      channel: "email",
      isActive: true
    };
    setRules(prev => [...prev, newRule]);
    toast.info("Alert threshold added", { description: "Configure threshold days offset settings below." });
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.error("Alert threshold removed");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(false);

    try {
      // TODO: Implement actual database save
      setSaveError(true);
      toast.error("Database integration required for saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Preferences */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border border-border/60 bg-card/65 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Preferences toggles</CardTitle>
              <CardDescription className="text-xs font-caption">Students can select active messaging channels.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold block">Email Channel</span>
                  <span className="text-[10px] text-muted-foreground font-caption">Send alerts to student registered email</span>
                </div>
                <CustomSwitch checked={preferences.email} onCheckedChange={() => handlePreferenceToggle("email")} aria-label="Toggle Email alerts" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold block">WhatsApp Channel</span>
                  <span className="text-[10px] text-muted-foreground font-caption">Send message alerts to whatsapp mobile</span>
                </div>
                <CustomSwitch checked={preferences.whatsapp} onCheckedChange={() => handlePreferenceToggle("whatsapp")} aria-label="Toggle WhatsApp alerts" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold block">SMS alerts</span>
                  <span className="text-[10px] text-muted-foreground font-caption">Mobile carrier standard text alert</span>
                </div>
                <CustomSwitch checked={preferences.sms} onCheckedChange={() => handlePreferenceToggle("sms")} aria-label="Toggle SMS alerts" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Trigger Rules */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-border/60 bg-card/65 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Global Compliance Alert Threshold Rules</CardTitle>
                <CardDescription className="text-xs font-caption">Define pre-expiry days warnings and post-expiry negative interval alerts.</CardDescription>
              </div>
              <Button size="sm" className="h-8 text-xs" onClick={handleAddRule}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Rule
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4 pt-4">
              <div className="space-y-3">
                {rules.map((rule, idx) => (
                  <div key={rule.id} className="flex items-center gap-3 border-b border-border/20 pb-3 last:border-b-0 last:pb-0">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1">
                      {/* Doc Type Selector */}
                      <div>
                        <label className="text-[10px] text-muted-foreground block font-caption">Document Type</label>
                        <select 
                          value={rule.documentType} 
                          onChange={(e) => {
                            const val = e.target.value as "passport" | "visa" | "efrro";
                            setRules(prev => prev.map((r, i) => i === idx ? { ...r, documentType: val } : r));
                          }}
                          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="passport">Passport</option>
                          <option value="visa">Visa</option>
                          <option value="efrro">eFRRO</option>
                        </select>
                      </div>

                      {/* Threshold Days */}
                      <div>
                        <label className="text-[10px] text-muted-foreground block font-caption">Days Offset (threshold)</label>
                        <Input 
                          type="number" 
                          value={rule.alertThresholdDays} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setRules(prev => prev.map((r, i) => i === idx ? { ...r, alertThresholdDays: val } : r));
                          }}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      {/* Channel */}
                      <div>
                        <label className="text-[10px] text-muted-foreground block font-caption">Provider Channel</label>
                        <select 
                          value={rule.channel} 
                          onChange={(e) => {
                            const val = e.target.value as "email" | "whatsapp" | "both";
                            setRules(prev => prev.map((r, i) => i === idx ? { ...r, channel: val } : r));
                          }}
                          className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="email">Email Only</option>
                          <option value="whatsapp">WhatsApp Only</option>
                          <option value="both">Email & WhatsApp</option>
                        </select>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 pt-3 sm:pt-0 sm:justify-center">
                        <label className="text-[10px] text-muted-foreground block font-caption sm:hidden">Rule Enabled</label>
                        <CustomSwitch 
                          checked={rule.isActive} 
                          onCheckedChange={(val: boolean) => {
                            setRules(prev => prev.map((r, i) => i === idx ? { ...r, isActive: val } : r));
                          }}
                          aria-label={`Toggle rule ${idx + 1}`}
                        />
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 shrink-0 mt-3 sm:mt-0" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-caption">
                  <HelpCircle className="h-3.5 w-3.5" /> Negative offsets (e.g. -7) represent alerts scheduled after expiration has occurred.
                </div>
                <AsyncActionButton
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={handleSave}
                  isLoading={isSaving}
                  isSuccess={saveSuccess}
                  isError={saveError}
                  idleText={<><Save className="mr-1.5 h-3.5 w-3.5 inline" /> Save Changes</>}
                  loadingText="Saving changes..."
                  successText="Changes saved"
                  errorText="Try Again"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
