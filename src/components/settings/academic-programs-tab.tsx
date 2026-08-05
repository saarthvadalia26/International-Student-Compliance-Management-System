"use client";

import * as React from "react";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Edit2, 
  Archive, 
  RotateCcw, 
  Loader2, 
  AlertCircle,
  Filter,
  Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { AcademicProgram, AcademicProgramDurationUnit } from "@/domain/academic-programs/types";
import { 
  getAllAcademicProgramsAction, 
  createAcademicProgramAction, 
  updateAcademicProgramAction, 
  toggleAcademicProgramStatusAction 
} from "@/app/(app)/settings/academic-programs-actions";

export function AcademicProgramsTab() {
  const [programs, setPrograms] = React.useState<AcademicProgram[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "archived">("all");

  // Modal States
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [selectedProgram, setSelectedProgram] = React.useState<AcademicProgram | null>(null);

  // Form State
  const [formName, setFormName] = React.useState("");
  const [formCode, setFormCode] = React.useState("");
  const [formLevel, setFormLevel] = React.useState("UG");
  const [formDurationValue, setFormDurationValue] = React.useState(4);
  const [formDurationUnit, setFormDurationUnit] = React.useState<AcademicProgramDurationUnit>("Years");
  const [formOrder, setFormOrder] = React.useState(1);
  const [isSaving, setIsSaving] = React.useState(false);

  // Load programs
  const fetchProgramsData = React.useCallback(async () => {
    const res = await getAllAcademicProgramsAction();
    if (res.success && res.programs) {
      setPrograms(res.programs);
    } else {
      toast.error("Failed loading academic programs master data.");
    }
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    getAllAcademicProgramsAction().then((res) => {
      if (isMounted) {
        if (res.success && res.programs) {
          setPrograms(res.programs);
        } else {
          toast.error("Failed loading academic programs master data.");
        }
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Programs
  const filteredPrograms = React.useMemo(() => {
    return programs.filter(p => {
      const matchesSearch = 
        p.programName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.programCode && p.programCode.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "active" ? p.isActive :
        !p.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [programs, searchQuery, statusFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName("");
    setFormCode("");
    setFormLevel("UG");
    setFormDurationValue(4);
    setFormDurationUnit("Years");
    setFormOrder(programs.length + 1);
    setIsAddOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (prog: AcademicProgram) => {
    setSelectedProgram(prog);
    setFormName(prog.programName);
    setFormCode(prog.programCode || "");
    setFormLevel(prog.academicLevel || "UG");
    setFormDurationValue(prog.durationValue || 4);
    setFormDurationUnit((prog.durationUnit as AcademicProgramDurationUnit) || "Years");
    setFormOrder(prog.displayOrder);
    setIsEditOpen(true);
  };

  // Save New Program
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Program name is required.");
      return;
    }

    if (!formDurationValue || formDurationValue <= 0) {
      toast.error("Program Duration Value must be a positive integer.");
      return;
    }

    setIsSaving(true);
    const res = await createAcademicProgramAction({
      programName: formName,
      programCode: formCode,
      academicLevel: formLevel,
      durationValue: Number(formDurationValue),
      durationUnit: formDurationUnit,
      displayOrder: Number(formOrder) || 1,
      isActive: true
    });

    if (res.success) {
      toast.success("Academic Program Created Successfully", {
        description: `"${formName.trim()}" (${formDurationValue} ${formDurationUnit}) added to master data.`
      });
      setIsAddOpen(false);
      fetchProgramsData();
    } else {
      toast.error(res.error || "Failed creating program.");
    }
    setIsSaving(false);
  };

  // Save Edit Program
  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram || !formName.trim()) return;

    if (!formDurationValue || formDurationValue <= 0) {
      toast.error("Program Duration Value must be a positive integer.");
      return;
    }

    setIsSaving(true);
    const res = await updateAcademicProgramAction(selectedProgram.id, {
      programName: formName,
      programCode: formCode,
      academicLevel: formLevel,
      durationValue: Number(formDurationValue),
      durationUnit: formDurationUnit,
      displayOrder: Number(formOrder) || selectedProgram.displayOrder
    });

    if (res.success) {
      toast.success("Academic Program Updated", {
        description: `Changes saved for "${formName.trim()}" (${formDurationValue} ${formDurationUnit}).`
      });
      setIsEditOpen(false);
      fetchProgramsData();
    } else {
      toast.error(res.error || "Failed updating program.");
    }
    setIsSaving(false);
  };

  // Toggle Active/Archive Status
  const handleToggleStatus = async (prog: AcademicProgram) => {
    const nextStatus = !prog.isActive;
    const actionName = nextStatus ? "Restored" : "Archived";

    const res = await toggleAcademicProgramStatusAction(prog.id, nextStatus);

    if (res.success) {
      toast.success(`Academic Program ${actionName}`, {
        description: `"${prog.programName}" is now ${nextStatus ? "active" : "archived"}.`
      });
      fetchProgramsData();
    } else {
      toast.error(res.error || `Failed to ${actionName.toLowerCase()} program.`);
    }
  };

  return (
    <Card className="border border-border/80 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <GraduationCap className="h-5 w-5 text-primary" />
            Administrator-Managed Academic Programs
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Configure master data academic programs, program duration, and level for university enrollment.
          </CardDescription>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="text-xs font-semibold h-9 gap-1.5 rounded-xl">
          <Plus className="h-4 w-4" /> Add Program
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search program or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(val: "all" | "active" | "archived" | null) => setStatusFilter(val || "all")}>
              <SelectTrigger className="h-9 text-xs w-36 rounded-xl">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="archived">Archived Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Programs Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Loading master data programs...</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="font-medium text-foreground">No Academic Programs Found</p>
            <p className="text-[11px]">No active or archived programs match your current search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border/60 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-3">Order</th>
                  <th className="py-2.5 px-3">Program Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Level</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredPrograms.map((prog) => (
                  <tr key={prog.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-muted-foreground">#{prog.displayOrder}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{prog.programName}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{prog.programCode || "—"}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {prog.academicLevel || "Degree"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 text-foreground font-medium text-[11px]">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{prog.durationValue || 4} {prog.durationUnit || "Years"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={prog.isActive ? "default" : "secondary"} className="text-[10px] rounded-md">
                        {prog.isActive ? "Active" : "Archived"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(prog)}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Edit Program"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(prog)}
                          className={`h-7 w-7 rounded-lg ${prog.isActive ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"}`}
                          title={prog.isActive ? "Archive Program" : "Restore Program"}
                        >
                          {prog.isActive ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Add Program Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Add Academic Program
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Program Name <span className="text-rose-500">*</span></label>
              <Input
                placeholder="e.g. B.Tech in Cyber Security"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Program Code</label>
                <Input
                  placeholder="e.g. BTECH_CS"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Academic Level</label>
                <Select value={formLevel} onValueChange={(val) => setFormLevel(val || "UG")}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UG">Undergraduate (UG)</SelectItem>
                    <SelectItem value="PG">Postgraduate (PG)</SelectItem>
                    <SelectItem value="PhD">Doctorate (PhD)</SelectItem>
                    <SelectItem value="Diploma">Diploma / Cert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration Configuration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Program Duration <span className="text-rose-500">*</span></label>
                <Input
                  type="number"
                  min={1}
                  placeholder="4"
                  value={formDurationValue}
                  onChange={(e) => setFormDurationValue(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Duration Unit <span className="text-rose-500">*</span></label>
                <Select value={formDurationUnit} onValueChange={(val) => setFormDurationUnit((val as AcademicProgramDurationUnit) || "Years")}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Years">Years</SelectItem>
                    <SelectItem value="Semesters">Semesters</SelectItem>
                    <SelectItem value="Trimesters">Trimesters</SelectItem>
                    <SelectItem value="Months">Months</SelectItem>
                    <SelectItem value="Credits">Credits</SelectItem>
                    <SelectItem value="Research_Months">Research Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Display Order</label>
              <Input
                type="number"
                min={1}
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !formName.trim()} size="sm" className="text-xs rounded-xl">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Save Program
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Program Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Edit Academic Program
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUpdate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Program Name <span className="text-rose-500">*</span></label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Program Code</label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="h-9 text-xs rounded-xl font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Academic Level</label>
                <Select value={formLevel} onValueChange={(val) => setFormLevel(val || "UG")}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UG">Undergraduate (UG)</SelectItem>
                    <SelectItem value="PG">Postgraduate (PG)</SelectItem>
                    <SelectItem value="PhD">Doctorate (PhD)</SelectItem>
                    <SelectItem value="Diploma">Diploma / Cert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration Configuration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Program Duration <span className="text-rose-500">*</span></label>
                <Input
                  type="number"
                  min={1}
                  value={formDurationValue}
                  onChange={(e) => setFormDurationValue(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Duration Unit <span className="text-rose-500">*</span></label>
                <Select value={formDurationUnit} onValueChange={(val) => setFormDurationUnit((val as AcademicProgramDurationUnit) || "Years")}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Years">Years</SelectItem>
                    <SelectItem value="Semesters">Semesters</SelectItem>
                    <SelectItem value="Trimesters">Trimesters</SelectItem>
                    <SelectItem value="Months">Months</SelectItem>
                    <SelectItem value="Credits">Credits</SelectItem>
                    <SelectItem value="Research_Months">Research Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Display Order</label>
              <Input
                type="number"
                min={1}
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)} className="text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !formName.trim()} size="sm" className="text-xs rounded-xl">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Update Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
