"use client";

import * as React from "react";
import { 
  GraduationCap, 
  Building2,
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  AlertTriangle,
  Loader2, 
  AlertCircle,
  Layers,
  BookOpen
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { AcademicProgram, AcademicProgramDurationUnit, SemesterDurationUnit, ACADEMIC_LEVEL_OPTIONS, getAcademicLevelLabel } from "@/domain/academic-programs/types";
import { School, CreateSchoolDto, UpdateSchoolDto } from "@/domain/schools/types";
import { 
  getAllAcademicProgramsAction, 
  createAcademicProgramAction, 
  updateAcademicProgramAction, 
  deleteAcademicProgramAction 
} from "@/app/(app)/settings/academic-programs-actions";
import {
  getAllSchoolsAction,
  createSchoolAction,
  updateSchoolAction,
  deleteSchoolAction
} from "@/app/(app)/settings/schools-actions";

import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export function AcademicProgramsTab() {
  // Navigation sub-tab: "programs" | "schools"
  const [subView, setSubView] = React.useState<"programs" | "schools">("programs");

  // Master Data States
  const [programs, setPrograms] = React.useState<AcademicProgram[]>([]);
  const [schools, setSchools] = React.useState<School[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Program Modal States
  const [isAddProgramOpen, setIsAddProgramOpen] = React.useState(false);
  const [isEditProgramOpen, setIsEditProgramOpen] = React.useState(false);
  const [selectedProgram, setSelectedProgram] = React.useState<AcademicProgram | null>(null);

  // Program Delete Modal State
  const [isDeleteProgramOpen, setIsDeleteProgramOpen] = React.useState(false);
  const [programToDelete, setProgramToDelete] = React.useState<AcademicProgram | null>(null);
  const [isDeletingProgram, setIsDeletingProgram] = React.useState(false);
  const [deleteProgramError, setDeleteProgramError] = React.useState<string | null>(null);

  // School Modal States
  const [isAddSchoolOpen, setIsAddSchoolOpen] = React.useState(false);
  const [isEditSchoolOpen, setIsEditSchoolOpen] = React.useState(false);
  const [selectedSchool, setSelectedSchool] = React.useState<School | null>(null);

  // School Delete Modal State
  const [isDeleteSchoolOpen, setIsDeleteSchoolOpen] = React.useState(false);
  const [schoolToDelete, setSchoolToDelete] = React.useState<School | null>(null);
  const [isDeletingSchool, setIsDeletingSchool] = React.useState(false);
  const [deleteSchoolError, setDeleteSchoolError] = React.useState<string | null>(null);

  // Program Form State
  const [formName, setFormName] = React.useState("");
  const [formCode, setFormCode] = React.useState("");
  const [formSchoolId, setFormSchoolId] = React.useState("");
  const [formLevel, setFormLevel] = React.useState("UG");
  const [formDurationValue, setFormDurationValue] = React.useState(4);
  const [formDurationUnit, setFormDurationUnit] = React.useState<AcademicProgramDurationUnit>("Years");
  const [formTotalSemesters, setFormTotalSemesters] = React.useState(8);
  const [formSemesterDuration, setFormSemesterDuration] = React.useState(6);
  const [formSemesterDurationUnit, setFormSemesterDurationUnit] = React.useState<SemesterDurationUnit>("months");
  const [formOrder, setFormOrder] = React.useState(1);
  const [isSavingProgram, setIsSavingProgram] = React.useState(false);



  // School Form State
  const [schoolFormName, setSchoolFormName] = React.useState("");
  const [schoolFormCode, setSchoolFormCode] = React.useState("");
  const [schoolFormDescription, setSchoolFormDescription] = React.useState("");
  const [schoolFormOrder, setSchoolFormOrder] = React.useState(1);
  const [isSavingSchool, setIsSavingSchool] = React.useState(false);

  // Load programs and schools data
  const fetchData = React.useCallback(async () => {
    try {
      const [progRes, schoolRes] = await Promise.all([
        getAllAcademicProgramsAction(),
        getAllSchoolsAction()
      ]);

      if (progRes.success && progRes.programs) {
        setPrograms(progRes.programs);
      }
      if (schoolRes.success && schoolRes.schools) {
        setSchools(schoolRes.schools);
      }
    } catch {
      toast.error("Failed loading academic master data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime Live Sync for academic_programs and schools
  useRealtimeSubscription({
    table: "academic_programs",
    onEvent: () => {
      fetchData();
    },
  });

  useRealtimeSubscription({
    table: "schools",
    onEvent: () => {
      fetchData();
    },
  });

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered Programs
  const filteredPrograms = React.useMemo(() => {
    return programs.filter(p => {
      const matchesSearch = 
        p.programName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.programCode && p.programCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.schoolName && p.schoolName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [programs, searchQuery]);

  // Filtered Schools
  const filteredSchools = React.useMemo(() => {
    return schools.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [schools, searchQuery]);

  // Count programs per school
  const programCountBySchoolId = React.useMemo(() => {
    const counts: Record<string, number> = {};
    programs.forEach(p => {
      if (p.schoolId) {
        counts[p.schoolId] = (counts[p.schoolId] || 0) + 1;
      }
    });
    return counts;
  }, [programs]);

  // Open Add Program Modal
  const handleOpenAddProgram = () => {
    setFormName("");
    setFormCode("");
    setFormSchoolId(schools.find(s => s.isActive)?.id || "");
    setFormLevel("UG");
    setFormDurationValue(4);
    setFormDurationUnit("Years");
    setFormTotalSemesters(8);
    setFormSemesterDuration(6);
    setFormSemesterDurationUnit("months");
    setFormOrder(programs.length + 1);
    setIsAddProgramOpen(true);
  };

  // Open Edit Program Modal
  const handleOpenEditProgram = (prog: AcademicProgram) => {
    setSelectedProgram(prog);
    setFormName(prog.programName);
    setFormCode(prog.programCode || "");
    setFormSchoolId(prog.schoolId || "");
    setFormLevel(prog.academicLevel || "UG");
    setFormDurationValue(prog.durationValue || 4);
    setFormDurationUnit((prog.durationUnit as AcademicProgramDurationUnit) || "Years");
    setFormTotalSemesters(prog.totalSemesters || 8);
    setFormSemesterDuration(prog.semesterDuration || 6);
    setFormSemesterDurationUnit((prog.semesterDurationUnit as SemesterDurationUnit) || "months");
    setFormOrder(prog.displayOrder);
    setIsEditProgramOpen(true);
  };

  // Open Delete Program Dialog
  const handleOpenDeleteProgram = (prog: AcademicProgram) => {
    setProgramToDelete(prog);
    setDeleteProgramError(null);
    setIsDeleteProgramOpen(true);
  };

  // Confirm Delete Program
  const handleConfirmDeleteProgram = async () => {
    if (!programToDelete || isDeletingProgram) return;

    setIsDeletingProgram(true);
    setDeleteProgramError(null);

    try {
      const res = await deleteAcademicProgramAction(programToDelete.id);
      if (res.success) {
        toast.success("Academic Program Deleted", {
          description: `"${programToDelete.programName}" was permanently deleted from the database.`
        });
        setIsDeleteProgramOpen(false);
        setProgramToDelete(null);
        fetchData();
      } else {
        const errMsg = res.error || "Failed to delete academic program.";
        setDeleteProgramError(errMsg);
        toast.error("Deletion Blocked", { description: errMsg });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setDeleteProgramError(msg);
      toast.error("Deletion Failed", { description: msg });
    } finally {
      setIsDeletingProgram(false);
    }
  };

  // Open Add School Modal
  const handleOpenAddSchool = () => {
    setSchoolFormName("");
    setSchoolFormCode("");
    setSchoolFormDescription("");
    setSchoolFormOrder(schools.length + 1);
    setIsAddSchoolOpen(true);
  };

  // Open Edit School Modal
  const handleOpenEditSchool = (sch: School) => {
    setSelectedSchool(sch);
    setSchoolFormName(sch.name);
    setSchoolFormCode(sch.code || "");
    setSchoolFormDescription(sch.description || "");
    setSchoolFormOrder(sch.displayOrder);
    setIsEditSchoolOpen(true);
  };

  // Open Delete School Dialog
  const handleOpenDeleteSchool = (sch: School) => {
    setSchoolToDelete(sch);
    setDeleteSchoolError(null);
    setIsDeleteSchoolOpen(true);
  };

  // Confirm Delete School
  const handleConfirmDeleteSchool = async () => {
    if (!schoolToDelete || isDeletingSchool) return;

    setIsDeletingSchool(true);
    setDeleteSchoolError(null);

    try {
      const res = await deleteSchoolAction(schoolToDelete.id);
      if (res.success) {
        toast.success("School / Department Deleted", {
          description: `"${schoolToDelete.name}" was permanently deleted from the database.`
        });
        setIsDeleteSchoolOpen(false);
        setSchoolToDelete(null);
        fetchData();
      } else {
        const errMsg = res.error || "Failed to delete school / department.";
        setDeleteSchoolError(errMsg);
        toast.error("Deletion Blocked", { description: errMsg });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setDeleteSchoolError(msg);
      toast.error("Deletion Failed", { description: msg });
    } finally {
      setIsDeletingSchool(false);
    }
  };

  // Save Create Program
  const handleSaveCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Program name is required.");
      return;
    }
    if (!formSchoolId) {
      toast.error("Please select a canonical School / Department.");
      return;
    }
    if (!formTotalSemesters || formTotalSemesters <= 0) {
      toast.error("Total Semesters must be greater than 0.");
      return;
    }
    if (!formSemesterDuration || formSemesterDuration <= 0) {
      toast.error("Semester Duration must be greater than 0.");
      return;
    }

    setIsSavingProgram(true);
    const selectedSchoolObj = schools.find(s => s.id === formSchoolId);
    const res = await createAcademicProgramAction({
      programName: formName,
      programCode: formCode,
      schoolId: formSchoolId,
      schoolName: selectedSchoolObj?.name || null,
      academicLevel: formLevel,
      durationValue: Number(formDurationValue),
      durationUnit: formDurationUnit,
      totalSemesters: Number(formTotalSemesters),
      semesterDuration: Number(formSemesterDuration),
      semesterDurationUnit: formSemesterDurationUnit,
      displayOrder: Number(formOrder) || 1,
      isActive: true
    });

    if (res.success) {
      toast.success("Academic Program Created Successfully", {
        description: `"${formName.trim()}" associated with ${selectedSchoolObj?.name || "School"}.`
      });
      setIsAddProgramOpen(false);
      fetchData();
    } else {
      toast.error(res.error || "Failed creating program.");
    }
    setIsSavingProgram(false);
  };

  // Save Edit Program
  const handleSaveUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram || !formName.trim()) return;

    if (!formSchoolId) {
      toast.error("Please select a canonical School / Department.");
      return;
    }
    if (!formTotalSemesters || formTotalSemesters <= 0) {
      toast.error("Total Semesters must be greater than 0.");
      return;
    }
    if (!formSemesterDuration || formSemesterDuration <= 0) {
      toast.error("Semester Duration must be greater than 0.");
      return;
    }

    setIsSavingProgram(true);
    const selectedSchoolObj = schools.find(s => s.id === formSchoolId);
    const res = await updateAcademicProgramAction(selectedProgram.id, {
      programName: formName,
      programCode: formCode,
      schoolId: formSchoolId,
      schoolName: selectedSchoolObj?.name || null,
      academicLevel: formLevel,
      durationValue: Number(formDurationValue),
      durationUnit: formDurationUnit,
      totalSemesters: Number(formTotalSemesters),
      semesterDuration: Number(formSemesterDuration),
      semesterDurationUnit: formSemesterDurationUnit,
      displayOrder: Number(formOrder) || selectedProgram.displayOrder
    });

    if (res.success) {
      toast.success("Academic Program Updated", {
        description: `Changes saved for "${formName.trim()}".`
      });
      setIsEditProgramOpen(false);
      fetchData();
    } else {
      toast.error(res.error || "Failed updating program.");
    }
    setIsSavingProgram(false);
  };

  // Save Create School
  const handleSaveCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolFormName.trim()) {
      toast.error("School / Department name is required.");
      return;
    }

    setIsSavingSchool(true);
    const dto: CreateSchoolDto = {
      name: schoolFormName.trim(),
      code: schoolFormCode.trim() || null,
      description: schoolFormDescription.trim() || null,
      displayOrder: Number(schoolFormOrder) || 1,
      isActive: true
    };

    const res = await createSchoolAction(dto);
    if (res.success) {
      toast.success("School / Department Created", {
        description: `"${schoolFormName.trim()}" added to canonical master data.`
      });
      setIsAddSchoolOpen(false);
      fetchData();
    } else {
      toast.error(res.error || "Failed creating school.");
    }
    setIsSavingSchool(false);
  };

  // Save Edit School
  const handleSaveUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool || !schoolFormName.trim()) return;

    setIsSavingSchool(true);
    const dto: UpdateSchoolDto = {
      name: schoolFormName.trim(),
      code: schoolFormCode.trim() || null,
      description: schoolFormDescription.trim() || null,
      displayOrder: Number(schoolFormOrder) || selectedSchool.displayOrder
    };

    const res = await updateSchoolAction(selectedSchool.id, dto);
    if (res.success) {
      toast.success("School / Department Updated", {
        description: `Changes saved for "${schoolFormName.trim()}".`
      });
      setIsEditSchoolOpen(false);
      fetchData();
    } else {
      toast.error(res.error || "Failed updating school.");
    }
    setIsSavingSchool(false);
  };

  return (
    <Card className="border border-border/80 shadow-sm rounded-2xl">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <GraduationCap className="h-5 w-5 text-primary" />
            Academic Master Data & Course Hierarchy
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Manage canonical Schools/Departments, Academic Degree Programs, and automated progression tracks.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sub-view switcher */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40 text-xs">
            <button
              type="button"
              onClick={() => setSubView("programs")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${subView === "programs" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Programs ({programs.length})
            </button>
            <button
              type="button"
              onClick={() => setSubView("schools")}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${subView === "schools" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Schools ({schools.length})
            </button>
          </div>

          {subView === "programs" ? (
            <Button 
              onClick={handleOpenAddProgram} 
              size="sm" 
              className="text-xs h-9 gap-1.5 rounded-xl shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Program
            </Button>
          ) : (
            <Button 
              onClick={handleOpenAddSchool} 
              size="sm" 
              className="text-xs h-9 gap-1.5 rounded-xl shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add School
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={subView === "programs" ? "Search programs, codes, or schools..." : "Search schools, codes, or descriptions..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl"
            />
          </div>
        </div>

        {/* Programs Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Loading master data...</p>
          </div>
        ) : subView === "programs" ? (
          filteredPrograms.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">No Academic Programs Found</p>
              <p className="text-[11px]">No academic programs match your current search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border/60 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Academic Program Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">School / Department</th>
                    <th className="py-2.5 px-3">Level</th>
                    <th className="py-2.5 px-3">Progression Structure</th>
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
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {prog.schoolName || "Academic Department"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {getAcademicLevelLabel(prog.academicLevel)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-foreground font-medium text-[11px]">
                          <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{prog.totalSemesters || 8} Semesters</span>
                          <span className="text-muted-foreground text-[10px]">({prog.semesterDuration || 6} {prog.semesterDurationUnit || "mo"}/sem)</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditProgram(prog)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title={`Edit ${prog.programName}`}
                            aria-label={`Edit ${prog.programName}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteProgram(prog)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Delete ${prog.programName}`}
                            aria-label={`Delete ${prog.programName}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Schools Table */
          filteredSchools.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">No Schools / Departments Found</p>
              <p className="text-[11px]">No schools match your current search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border/60 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">School / Department Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Associated Programs</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSchools.map((sch) => (
                    <tr key={sch.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-muted-foreground">#{sch.displayOrder}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{sch.name}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-primary">{sch.code || "—"}</td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">{sch.description || "—"}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {programCountBySchoolId[sch.id] || 0} Programs
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditSchool(sch)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title={`Edit ${sch.name}`}
                            aria-label={`Edit ${sch.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteSchool(sch)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Delete ${sch.name}`}
                            aria-label={`Delete ${sch.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </CardContent>

      {/* Add Program Modal */}
      <Dialog open={isAddProgramOpen} onOpenChange={setIsAddProgramOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Add Academic Program
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCreateProgram} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Program Name <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g. M. Sc. Toxicology"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Canonical School / Department <span className="text-destructive">*</span></label>
              <Select value={formSchoolId} onValueChange={(val) => setFormSchoolId(val || "")}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select authoritative school..." />
                </SelectTrigger>
                <SelectContent>
                  {schools.filter(s => s.isActive).map((sch) => (
                    <SelectItem key={sch.id} value={sch.id}>
                      {sch.name} {sch.code ? `(${sch.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Program Code</label>
                <Input
                  placeholder="e.g. MSC-TOX"
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
                    {ACADEMIC_LEVEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.code} value={opt.code}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Semester Progression Configuration */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-muted-foreground text-xs space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Automatic Semester Progression Structure
              </div>
              <p className="text-[11px] leading-relaxed">
                Semester duration and total semesters determine the student&apos;s automatic academic progression.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Total Semesters *</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="8"
                  value={formTotalSemesters}
                  onChange={(e) => setFormTotalSemesters(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Semester Duration *</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  placeholder="6"
                  value={formSemesterDuration}
                  onChange={(e) => setFormSemesterDuration(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Duration Unit</label>
                <Select value={formSemesterDurationUnit} onValueChange={(val: SemesterDurationUnit | null) => setFormSemesterDurationUnit(val || "months")}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Degree Duration Value</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formDurationValue}
                  onChange={(e) => setFormDurationValue(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Degree Duration Unit</label>
                <Select value={formDurationUnit} onValueChange={(val: AcademicProgramDurationUnit | null) => setFormDurationUnit(val || "Years")}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Years">Years</SelectItem>
                    <SelectItem value="Semesters">Semesters</SelectItem>
                    <SelectItem value="Months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Display Sort Order</label>
              <Input
                type="number"
                min={1}
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddProgramOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingProgram} className="text-xs gap-1.5">
                {isSavingProgram && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Program
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Program Modal */}
      <Dialog open={isEditProgramOpen} onOpenChange={setIsEditProgramOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Edit Academic Program
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUpdateProgram} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Program Name <span className="text-destructive">*</span></label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Canonical School / Department <span className="text-destructive">*</span></label>
              <Select value={formSchoolId} onValueChange={(val) => setFormSchoolId(val || "")}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select authoritative school..." />
                </SelectTrigger>
                <SelectContent>
                  {schools.filter(s => s.isActive || s.id === formSchoolId).map((sch) => (
                    <SelectItem key={sch.id} value={sch.id}>
                      {sch.name} {sch.code ? `(${sch.code})` : ""}{!sch.isActive ? " (Archived)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    {ACADEMIC_LEVEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.code} value={opt.code}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Semester Progression Configuration */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-muted-foreground text-xs space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Automatic Semester Progression Structure
              </div>
              <p className="text-[11px] leading-relaxed">
                Semester duration and total semesters determine the student&apos;s automatic academic progression.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Total Semesters *</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formTotalSemesters}
                  onChange={(e) => setFormTotalSemesters(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Semester Duration *</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={formSemesterDuration}
                  onChange={(e) => setFormSemesterDuration(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Duration Unit</label>
                <Select value={formSemesterDurationUnit} onValueChange={(val: SemesterDurationUnit | null) => setFormSemesterDurationUnit(val || "months")}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Degree Duration Value</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formDurationValue}
                  onChange={(e) => setFormDurationValue(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Degree Duration Unit</label>
                <Select value={formDurationUnit} onValueChange={(val: AcademicProgramDurationUnit | null) => setFormDurationUnit(val || "Years")}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Years">Years</SelectItem>
                    <SelectItem value="Semesters">Semesters</SelectItem>
                    <SelectItem value="Months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Display Sort Order</label>
              <Input
                type="number"
                min={1}
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditProgramOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingProgram} className="text-xs gap-1.5">
                {isSavingProgram && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add School Modal */}
      <Dialog open={isAddSchoolOpen} onOpenChange={setIsAddSchoolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Add Canonical School / Department
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCreateSchool} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">School / Department Name <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g. School of Cyber Security & Digital Forensics"
                value={schoolFormName}
                onChange={(e) => setSchoolFormName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">School Code / Acronym</label>
              <Input
                placeholder="e.g. SCSDF"
                value={schoolFormCode}
                onChange={(e) => setSchoolFormCode(e.target.value)}
                className="h-9 text-xs rounded-xl font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description & Specializations</label>
              <Textarea
                placeholder="Brief administrative notes or departmental focus..."
                value={schoolFormDescription}
                onChange={(e) => setSchoolFormDescription(e.target.value)}
                className="text-xs rounded-xl min-h-[70px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Display Sort Order</label>
              <Input
                type="number"
                min={1}
                value={schoolFormOrder}
                onChange={(e) => setSchoolFormOrder(Number(e.target.value))}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddSchoolOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingSchool} className="text-xs gap-1.5">
                {isSavingSchool && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save School
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit School Modal */}
      <Dialog open={isEditSchoolOpen} onOpenChange={setIsEditSchoolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Edit School / Department
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUpdateSchool} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">School / Department Name <span className="text-destructive">*</span></label>
              <Input
                value={schoolFormName}
                onChange={(e) => setSchoolFormName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">School Code / Acronym</label>
              <Input
                value={schoolFormCode}
                onChange={(e) => setSchoolFormCode(e.target.value)}
                className="h-9 text-xs rounded-xl font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description & Specializations</label>
              <Textarea
                value={schoolFormDescription}
                onChange={(e) => setSchoolFormDescription(e.target.value)}
                className="text-xs rounded-xl min-h-[70px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Display Sort Order</label>
              <Input
                type="number"
                min={1}
                value={schoolFormOrder}
                onChange={(e) => setSchoolFormOrder(Number(e.target.value))}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditSchoolOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingSchool} className="text-xs gap-1.5">
                {isSavingSchool && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Program Confirmation Dialog */}
      <Dialog 
        open={isDeleteProgramOpen} 
        onOpenChange={(open) => {
          if (!isDeletingProgram) {
            setIsDeleteProgramOpen(open);
            if (!open) {
              setProgramToDelete(null);
              setDeleteProgramError(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Delete Academic Program
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-foreground">
              Are you sure you want to permanently delete <span className="font-semibold text-foreground">&ldquo;{programToDelete?.programName}&rdquo;</span>?
            </p>

            <div className="p-3 bg-muted/50 rounded-xl border border-border/60 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Program Code:</span>
                <span className="font-medium text-foreground">{programToDelete?.programCode || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level:</span>
                <span className="font-medium text-foreground">{getAcademicLevelLabel(programToDelete?.academicLevel)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">School / Department:</span>
                <span className="font-medium text-foreground">{programToDelete?.schoolName || "—"}</span>
              </div>
            </div>

            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[11px] leading-relaxed flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Permanent Database Deletion</p>
                <p>This action permanently removes this academic program from the database and cannot be undone. Programs associated with existing students cannot be deleted.</p>
              </div>
            </div>

            {deleteProgramError && (
              <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-destructive text-[11px] leading-relaxed flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Deletion Blocked</p>
                  <p>{deleteProgramError}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteProgramOpen(false)}
              disabled={isDeletingProgram}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteProgram}
              disabled={isDeletingProgram}
              className="text-xs gap-1.5"
            >
              {isDeletingProgram && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isDeletingProgram ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete School Confirmation Dialog */}
      <Dialog 
        open={isDeleteSchoolOpen} 
        onOpenChange={(open) => {
          if (!isDeletingSchool) {
            setIsDeleteSchoolOpen(open);
            if (!open) {
              setSchoolToDelete(null);
              setDeleteSchoolError(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Delete School / Department
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-foreground">
              Are you sure you want to permanently delete <span className="font-semibold text-foreground">&ldquo;{schoolToDelete?.name}&rdquo;</span>?
            </p>

            <div className="p-3 bg-muted/50 rounded-xl border border-border/60 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">School Code:</span>
                <span className="font-medium text-foreground">{schoolToDelete?.code || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Associated Programs:</span>
                <span className="font-medium text-foreground">{schoolToDelete ? (programCountBySchoolId[schoolToDelete.id] || 0) : 0}</span>
              </div>
            </div>

            {schoolToDelete && (programCountBySchoolId[schoolToDelete.id] || 0) > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Associated Programs Detected</p>
                  <p>This school currently contains {programCountBySchoolId[schoolToDelete.id]} academic program(s). You must delete or reassign those programs before this school can be deleted.</p>
                </div>
              </div>
            )}

            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[11px] leading-relaxed flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Permanent Database Deletion</p>
                <p>This action permanently removes this school/department from the database and cannot be undone.</p>
              </div>
            </div>

            {deleteSchoolError && (
              <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-xl text-destructive text-[11px] leading-relaxed flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Deletion Blocked</p>
                  <p>{deleteSchoolError}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteSchoolOpen(false)}
              disabled={isDeletingSchool}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteSchool}
              disabled={isDeletingSchool || (schoolToDelete ? (programCountBySchoolId[schoolToDelete.id] || 0) > 0 : false)}
              className="text-xs gap-1.5"
            >
              {isDeletingSchool && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isDeletingSchool ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
