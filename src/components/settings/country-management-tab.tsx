"use client";

import * as React from "react";
import { 
  Globe2, 
  Search, 
  Plus, 
  PowerOff, 
  Power, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Users,
  ShieldCheck,
  Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CountryFlag } from "@/components/ui/country-flag";
import { toast } from "sonner";
import { Country, CreateCountryDto } from "@/domain/countries/types";
import { 
  getAllCountriesAction, 
  toggleCountryStatusAction, 
  createCountryAction 
} from "@/app/(app)/settings/countries-actions";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export function CountryManagementTab() {
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  // Deactivation confirmation modal state
  const [selectedCountryToToggle, setSelectedCountryToToggle] = React.useState<Country | null>(null);
  const [isToggleLoading, setIsToggleLoading] = React.useState(false);

  // Add Country modal state
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isAddSaving, setIsAddSaving] = React.useState(false);
  const [formName, setFormName] = React.useState("");
  const [formAlpha2, setFormAlpha2] = React.useState("");
  const [formAlpha3, setFormAlpha3] = React.useState("");
  const [formNumeric, setFormNumeric] = React.useState("");
  const [formOfficialName, setFormOfficialName] = React.useState("");
  const [formNationality, setFormNationality] = React.useState("");
  const [formFlag, setFormFlag] = React.useState("");
  const [formRegion, setFormRegion] = React.useState("Asia");

  // Load countries data
  const fetchCountriesData = React.useCallback(async () => {
    const res = await getAllCountriesAction();
    if (res.success && res.countries) {
      setCountries(res.countries);
    } else {
      toast.error("Failed loading country master data.");
    }
    setIsLoading(false);
  }, []);

  // Realtime Live Sync: Update UI instantly when countries are modified
  useRealtimeSubscription({
    table: "countries",
    onEvent: () => {
      fetchCountriesData();
    },
  });

  React.useEffect(() => {
    let isMounted = true;
    getAllCountriesAction().then((res) => {
      if (isMounted) {
        if (res.success && res.countries) {
          setCountries(res.countries);
        } else {
          toast.error("Failed loading country master data.");
        }
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered countries
  const filteredCountries = React.useMemo(() => {
    return countries.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        c.name.toLowerCase().includes(q) ||
        (c.officialName && c.officialName.toLowerCase().includes(q)) ||
        (c.nationality && c.nationality.toLowerCase().includes(q)) ||
        c.isoAlpha2.toLowerCase().includes(q) ||
        c.isoAlpha3.toLowerCase().includes(q) ||
        c.isoNumeric.includes(q) ||
        (c.region && c.region.toLowerCase().includes(q))
      );

      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "active" ? c.isActive :
        !c.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [countries, searchQuery, statusFilter]);

  // Statistics counters
  const stats = React.useMemo(() => {
    const total = countries.length;
    const active = countries.filter(c => c.isActive).length;
    const inactive = total - active;
    const totalStudents = countries.reduce((sum, c) => sum + (c.studentUsageCount || 0), 0);
    return { total, active, inactive, totalStudents };
  }, [countries]);

  // Handle status toggle execution (Disable or Enable)
  const handleExecuteToggle = async () => {
    if (!selectedCountryToToggle) return;
    const targetStatus = !selectedCountryToToggle.isActive;

    try {
      setIsToggleLoading(true);
      const res = await toggleCountryStatusAction(selectedCountryToToggle.id, targetStatus);
      if (res.success && res.country) {
        toast.success(
          targetStatus
            ? `Enabled ${selectedCountryToToggle.name}`
            : `Disabled ${selectedCountryToToggle.name}`,
          {
            description: targetStatus
              ? `${selectedCountryToToggle.name} is now selectable in student forms.`
              : `${selectedCountryToToggle.name} will no longer appear for new registrations. Existing records remain intact.`
          }
        );
        setCountries(prev => prev.map(c => c.id === selectedCountryToToggle.id ? { ...c, isActive: targetStatus } : c));
        setSelectedCountryToToggle(null);
      } else {
        toast.error(res.error || "Failed to update country status.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating country status.");
    } finally {
      setIsToggleLoading(false);
    }
  };

  // Handle quick enable directly
  const handleQuickEnable = async (country: Country) => {
    try {
      const res = await toggleCountryStatusAction(country.id, true);
      if (res.success && res.country) {
        toast.success(`Enabled ${country.name}`, {
          description: `${country.name} is now selectable in all country selectors.`
        });
        setCountries(prev => prev.map(c => c.id === country.id ? { ...c, isActive: true } : c));
      } else {
        toast.error(res.error || "Failed enabling country.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error enabling country.");
    }
  };

  // Handle Add Country Form Submit
  const handleCreateCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAlpha2.trim() || !formAlpha3.trim() || !formNumeric.trim()) {
      toast.error("Please fill in all mandatory ISO country fields.");
      return;
    }

    try {
      setIsAddSaving(true);
      const payload: CreateCountryDto = {
        name: formName.trim(),
        isoAlpha2: formAlpha2.trim().toUpperCase(),
        isoAlpha3: formAlpha3.trim().toUpperCase(),
        isoNumeric: formNumeric.trim(),
        officialName: formOfficialName.trim() || undefined,
        nationality: formNationality.trim() || undefined,
        flag: formFlag.trim() || undefined,
        region: formRegion.trim() || "Other",
        displayOrder: 999,
        isActive: true
      };

      const res = await createCountryAction(payload);
      if (res.success && res.country) {
        toast.success(`Registered ${res.country.name}`, {
          description: `Successfully added ${res.country.name} (${res.country.isoAlpha3}) to master registry.`
        });
        setCountries(prev => [res.country!, ...prev]);
        setIsAddOpen(false);
        // Reset form
        setFormName("");
        setFormAlpha2("");
        setFormAlpha3("");
        setFormNumeric("");
        setFormOfficialName("");
        setFormNationality("");
        setFormFlag("");
      } else {
        toast.error(res.error || "Failed creating country record.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating country.");
    } finally {
      setIsAddSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. Header Card with Statistics */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 bg-muted/10 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Globe2 className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  Country Management
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Manage the standardized ISO 3166-1 country master list available throughout ISCMS. Countries referenced by students cannot be deleted; they can be deactivated instead.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCountriesData}
                disabled={isLoading}
                className="h-8 text-xs gap-1.5"
                title="Refresh master data"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Country
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 min-[480px]:grid-cols-4 gap-2 pt-3">
            <div className="p-2.5 rounded-lg bg-background border border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">Total Registered</span>
              <span className="text-sm font-bold font-mono text-foreground">{stats.total}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Active (Selectable)</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.active}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Inactive (Preserved)</span>
              <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">{stats.inactive}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                <Users className="h-3 w-3" /> Students Enrolled
              </span>
              <span className="text-sm font-bold font-mono text-primary">{stats.totalStudents}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* 2. Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search countries by name, ISO-2, ISO-3 (e.g. Fiji, FJ, FJI, India)..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <div className="flex rounded-md border border-border bg-muted/30 p-0.5 text-xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-sm font-medium transition-colors ${
                    statusFilter === "all" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1 rounded-sm font-medium transition-colors ${
                    statusFilter === "active" ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active ({stats.active})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  className={`px-3 py-1 rounded-sm font-medium transition-colors ${
                    statusFilter === "inactive" ? "bg-background text-amber-600 dark:text-amber-400 shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inactive ({stats.inactive})
                </button>
              </div>
            </div>
          </div>

          {/* 3. Countries Data Table */}
          <div className="rounded-lg border border-border/60 overflow-hidden bg-card w-full max-w-full min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[620px]">
                <thead className="bg-muted/40 text-[10px] text-muted-foreground uppercase border-b border-border/50 font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Country & Demonym</th>
                    <th className="py-2.5 px-2.5 font-mono text-center">ISO-2</th>
                    <th className="py-2.5 px-2.5 font-mono text-center">ISO-3</th>
                    <th className="py-2.5 px-2.5 font-mono text-center">Numeric</th>
                    <th className="py-2.5 px-3">Region</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Student Usage</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Loading canonical ISO country dataset...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCountries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                        No countries match the current search or status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCountries.map((country) => {
                      const studentCount = country.studentUsageCount || 0;

                      return (
                        <tr 
                          key={country.id} 
                          className={`hover:bg-muted/20 transition-colors ${!country.isActive ? "bg-muted/5 opacity-85" : ""}`}
                        >
                          {/* Country Name & Demonym */}
                          <td className="py-2.5 px-3 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <CountryFlag countryCode={country.isoAlpha2} fallbackEmoji={country.flag || undefined} size="md" />
                              <div className="min-w-0 flex flex-col">
                                <span className="font-semibold text-foreground truncate">
                                  {country.name}
                                </span>
                                {country.nationality && country.nationality !== country.name && (
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {country.nationality}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* ISO-2 */}
                          <td className="py-2.5 px-2.5 text-center font-mono font-medium text-foreground">
                            <span className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/40 text-[11px]">
                              {country.isoAlpha2}
                            </span>
                          </td>

                          {/* ISO-3 */}
                          <td className="py-2.5 px-2.5 text-center font-mono font-bold text-foreground">
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[11px]">
                              {country.isoAlpha3}
                            </span>
                          </td>

                          {/* Numeric */}
                          <td className="py-2.5 px-2.5 text-center font-mono text-muted-foreground text-[11px]">
                            {country.isoNumeric}
                          </td>

                          {/* Region */}
                          <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                            {country.region || "Global"}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center">
                            {country.isActive ? (
                              <Badge variant="outline" className="text-[9px] h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] h-5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold">
                                Inactive
                              </Badge>
                            )}
                          </td>

                          {/* Student Usage */}
                          <td className="py-2.5 px-3 text-center font-mono">
                            {studentCount > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/5 text-[11px]">
                                {studentCount} {studentCount === 1 ? "student" : "students"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 text-[11px]">0 students</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {country.isActive ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCountryToToggle(country)}
                                className="h-6 px-2 text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 font-medium"
                                title={`Deactivate ${country.name}`}
                              >
                                <PowerOff className="h-2.5 w-2.5 mr-1" />
                                Disable
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickEnable(country)}
                                className="h-6 px-2 text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"
                                title={`Re-enable ${country.name}`}
                              >
                                <Power className="h-2.5 w-2.5 mr-1" />
                                Enable
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Disable Confirmation Dialog (Soft Deactivation Protection) */}
      <Dialog 
        open={Boolean(selectedCountryToToggle && selectedCountryToToggle.isActive)} 
        onOpenChange={(open) => { if (!open && !isToggleLoading) setSelectedCountryToToggle(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Disable {selectedCountryToToggle?.name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Soft deactivation removes this country from new selections while safeguarding all existing student records.
            </DialogDescription>
          </DialogHeader>

          {selectedCountryToToggle && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <CountryFlag countryCode={selectedCountryToToggle.isoAlpha2} size="md" />
                  <span>{selectedCountryToToggle.name} ({selectedCountryToToggle.isoAlpha3})</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  <strong>{selectedCountryToToggle.name}</strong> is currently used by <strong>{selectedCountryToToggle.studentUsageCount || 0} student records</strong>.
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground block">Disabling this country will:</span>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Keep all existing student records completely unchanged</li>
                  <li>Remove {selectedCountryToToggle.name} from future student creation dropdowns</li>
                  <li>Preserve all historical compliance records and audit logs</li>
                  <li>Display an Inactive indicator if viewing an existing student</li>
                </ul>
              </div>

              <div className="p-2.5 rounded-md bg-muted/40 border border-border/50 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>This action is completely non-destructive and can be re-enabled at any time.</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedCountryToToggle(null)}
              disabled={isToggleLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleExecuteToggle}
              disabled={isToggleLoading}
              className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isToggleLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Disabling...</span>
                </span>
              ) : (
                <span>Disable Country</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Add Country Master Record Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Register New Country Master Record
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a sovereign nation or territory according to ISO 3166-1 standard codes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCountry} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground" htmlFor="countryName">
                Country Name *
              </label>
              <Input
                id="countryName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Fiji, Republic of Kosovo"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="countryIso2">
                  ISO Alpha-2 *
                </label>
                <Input
                  id="countryIso2"
                  value={formAlpha2}
                  onChange={(e) => setFormAlpha2(e.target.value.toUpperCase())}
                  placeholder="e.g. FJ"
                  maxLength={2}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="countryIso3">
                  ISO Alpha-3 *
                </label>
                <Input
                  id="countryIso3"
                  value={formAlpha3}
                  onChange={(e) => setFormAlpha3(e.target.value.toUpperCase())}
                  placeholder="e.g. FJI"
                  maxLength={3}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="countryNumeric">
                  ISO Numeric *
                </label>
                <Input
                  id="countryNumeric"
                  value={formNumeric}
                  onChange={(e) => setFormNumeric(e.target.value)}
                  placeholder="e.g. 242"
                  maxLength={3}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="countryNationality">
                  Nationality (Demonym)
                </label>
                <Input
                  id="countryNationality"
                  value={formNationality}
                  onChange={(e) => setFormNationality(e.target.value)}
                  placeholder="e.g. Fijian"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="countryRegion">
                  Geographic Region
                </label>
                <select
                  id="countryRegion"
                  value={formRegion}
                  onChange={(e) => setFormRegion(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs"
                >
                  <option value="Asia">Asia</option>
                  <option value="Europe">Europe</option>
                  <option value="Africa">Africa</option>
                  <option value="Americas">Americas</option>
                  <option value="Oceania">Oceania</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="countryOfficial">
                  Official Sovereign Name
                </label>
                <Input
                  id="countryOfficial"
                  value={formOfficialName}
                  onChange={(e) => setFormOfficialName(e.target.value)}
                  placeholder="e.g. Republic of Fiji"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground" htmlFor="countryFlag">
                  Flag Emoji
                </label>
                <Input
                  id="countryFlag"
                  value={formFlag}
                  onChange={(e) => setFormFlag(e.target.value)}
                  placeholder="e.g. 🇫🇯"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={isAddSaving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isAddSaving}
                className="text-xs font-semibold"
              >
                {isAddSaving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Registering...</span>
                  </span>
                ) : (
                  <span>Register Country</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
