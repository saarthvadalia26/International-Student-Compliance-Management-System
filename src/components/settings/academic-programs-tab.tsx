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
  BookOpen,
  Award,
  MapPin,
  CheckCircle2,
  XCircle,
  Users,
  Archive,
  RotateCcw
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
import { ScholarshipScheme, CreateScholarshipSchemeDto, UpdateScholarshipSchemeDto } from "@/domain/scholarships/types";
import { Campus, CreateCampusDto, UpdateCampusDto } from "@/domain/campuses/types";
import { 
  getAllAcademicProgramsAction, 
  createAcademicProgramAction, 
  updateAcademicProgramAction, 
  deleteAcademicProgramAction,
  toggleAcademicProgramStatusAction
} from "@/app/(app)/settings/academic-programs-actions";
import {
  getAllSchoolsAction,
  createSchoolAction,
  updateSchoolAction,
  deleteSchoolAction
} from "@/app/(app)/settings/schools-actions";
import {
  getAllScholarshipSchemesAction,
  createScholarshipSchemeAction,
  updateScholarshipSchemeAction,
  deleteScholarshipSchemeAction
} from "@/app/(app)/settings/scholarship-actions";
import {
  getAllCampusesAction,
  createCampusAction,
  updateCampusAction,
  deleteCampusAction
} from "@/app/(app)/settings/campus-actions";

import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export function AcademicProgramsTab() {
  // Navigation sub-tab: "programs" | "schools" | "scholarships" | "campuses"
  const [subView, setSubView] = React.useState<"programs" | "schools" | "scholarships" | "campuses">("programs");

  // Master Data States
  const [programs, setPrograms] = React.useState<AcademicProgram[]>([]);
  const [schools, setSchools] = React.useState<School[]>([]);
  const [scholarships, setScholarships] = React.useState<ScholarshipScheme[]>([]);
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
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

  // Scholarship Modal States
  const [isAddScholarshipOpen, setIsAddScholarshipOpen] = React.useState(false);
  const [isEditScholarshipOpen, setIsEditScholarshipOpen] = React.useState(false);
  const [selectedScholarship, setSelectedScholarship] = React.useState<ScholarshipScheme | null>(null);
  const [isDeleteScholarshipOpen, setIsDeleteScholarshipOpen] = React.useState(false);
  const [scholarshipToDelete, setScholarshipToDelete] = React.useState<ScholarshipScheme | null>(null);
  const [isDeletingScholarship, setIsDeletingScholarship] = React.useState(false);
  const [deleteScholarshipError, setDeleteScholarshipError] = React.useState<string | null>(null);

  // Campus Modal States
  const [isAddCampusOpen, setIsAddCampusOpen] = React.useState(false);
  const [isEditCampusOpen, setIsEditCampusOpen] = React.useState(false);
  const [selectedCampus, setSelectedCampus] = React.useState<Campus | null>(null);
  const [isDeleteCampusOpen, setIsDeleteCampusOpen] = React.useState(false);
  const [campusToDelete, setCampusToDelete] = React.useState<Campus | null>(null);
  const [isDeletingCampus, setIsDeletingCampus] = React.useState(false);
  const [deleteCampusError, setDeleteCampusError] = React.useState<string | null>(null);

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
  const [formActive, setFormActive] = React.useState(true);
  const [isSavingProgram, setIsSavingProgram] = React.useState(false);

  // School Form State
  const [schoolFormName, setSchoolFormName] = React.useState("");
  const [schoolFormCode, setSchoolFormCode] = React.useState("");
  const [schoolFormDescription, setSchoolFormDescription] = React.useState("");
  const [schoolFormOrder, setSchoolFormOrder] = React.useState(1);
  const [isSavingSchool, setIsSavingSchool] = React.useState(false);

  // Scholarship Form State
  const [scholarshipFormName, setScholarshipFormName] = React.useState("");
  const [scholarshipFormCode, setScholarshipFormCode] = React.useState("");
  const [scholarshipFormDescription, setScholarshipFormDescription] = React.useState("");
  const [scholarshipFormOrder, setScholarshipFormOrder] = React.useState(1);
  const [scholarshipFormActive, setScholarshipFormActive] = React.useState(true);
  const [isSavingScholarship, setIsSavingScholarship] = React.useState(false);

  // Campus Form State
  const [campusFormName, setCampusFormName] = React.useState("");
  const [campusFormCode, setCampusFormCode] = React.useState("");
  const [campusFormLocation, setCampusFormLocation] = React.useState("");
  const [campusFormOrder, setCampusFormOrder] = React.useState(1);
  const [campusFormActive, setCampusFormActive] = React.useState(true);
  const [isSavingCampus, setIsSavingCampus] = React.useState(false);

  // Load all master data
  const fetchData = React.useCallback(async () => {
    try {
      const [progRes, schoolRes, schRes, campRes] = await Promise.all([
        getAllAcademicProgramsAction(),
        getAllSchoolsAction(),
        getAllScholarshipSchemesAction(),
        getAllCampusesAction()
      ]);

      if (progRes.success && progRes.programs) {
        setPrograms(progRes.programs);
      }
      if (schoolRes.success && schoolRes.schools) {
        setSchools(schoolRes.schools);
      }
      if (schRes.success && schRes.schemes) {
        setScholarships(schRes.schemes);
      }
      if (campRes.success && campRes.campuses) {
        setCampuses(campRes.campuses);
      }
    } catch {
      toast.error("Failed loading academic master data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime Live Sync
  useRealtimeSubscription({
    table: "academic_programs",
    onEvent: () => { fetchData(); },
  });

  useRealtimeSubscription({
    table: "schools",
    onEvent: () => { fetchData(); },
  });

  useRealtimeSubscription({
    table: "scholarship_schemes",
    onEvent: () => { fetchData(); },
  });

  useRealtimeSubscription({
    table: "campuses",
    onEvent: () => { fetchData(); },
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

  // Filtered Scholarships
  const filteredScholarships = React.useMemo(() => {
    return scholarships.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [scholarships, searchQuery]);

  // Filtered Campuses
  const filteredCampuses = React.useMemo(() => {
    return campuses.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [campuses, searchQuery]);

  // Program Handlers
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
    setFormActive(true);
    setIsAddProgramOpen(true);
  };

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
    setFormActive(prog.isActive);
    setIsEditProgramOpen(true);
  };

  const handleToggleProgramStatus = async (prog: AcademicProgram) => {
    try {
      const nextActive = !prog.isActive;
      const res = await toggleAcademicProgramStatusAction(prog.id, nextActive);
      if (res.success) {
        toast.success(nextActive ? "Program Activated" : "Program Archived", {
          description: `"${prog.programName}" is now ${nextActive ? "active" : "archived"}.`
        });
        fetchData();
      } else {
        toast.error(res.error || "Failed to update program status.");
      }
    } catch {
      toast.error("An unexpected error occurred while toggling program status.");
    }
  };

  const handleOpenDeleteProgram = (prog: AcademicProgram) => {
    setProgramToDelete(prog);
    setDeleteProgramError(null);
    setIsDeleteProgramOpen(true);
  };

  const handleConfirmDeleteProgram = async () => {
    if (!programToDelete || isDeletingProgram) return;
    setIsDeletingProgram(true);
    setDeleteProgramError(null);
    try {
      const res = await deleteAcademicProgramAction(programToDelete.id);
      if (res.success) {
        toast.success("Academic Program Deleted", {
          description: `"${programToDelete.programName}" was removed.`
        });
        setIsDeleteProgramOpen(false);
        setProgramToDelete(null);
        fetchData();
      } else {
        setDeleteProgramError(res.error || "Failed to delete program.");
      }
    } catch {
      setDeleteProgramError("An unexpected error occurred while attempting to delete the program.");
    } finally {
      setIsDeletingProgram(false);
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Program name is required.");
      return;
    }
    setIsSavingProgram(true);
    try {
      if (selectedProgram && isEditProgramOpen) {
        const res = await updateAcademicProgramAction(selectedProgram.id, {
          programName: formName.trim(),
          programCode: formCode.trim() || undefined,
          schoolId: formSchoolId || undefined,
          academicLevel: formLevel,
          durationValue: Number(formDurationValue),
          durationUnit: formDurationUnit,
          totalSemesters: Number(formTotalSemesters),
          semesterDuration: Number(formSemesterDuration),
          semesterDurationUnit: formSemesterDurationUnit,
          displayOrder: Number(formOrder),
          isActive: formActive
        });
        if (res.success) {
          toast.success("Academic Program Updated");
          setIsEditProgramOpen(false);
          setSelectedProgram(null);
          fetchData();
        } else {
          toast.error(res.error || "Failed to update program.");
        }
      } else {
        const res = await createAcademicProgramAction({
          programName: formName.trim(),
          programCode: formCode.trim() || undefined,
          schoolId: formSchoolId || undefined,
          academicLevel: formLevel,
          durationValue: Number(formDurationValue),
          durationUnit: formDurationUnit,
          totalSemesters: Number(formTotalSemesters),
          semesterDuration: Number(formSemesterDuration),
          semesterDurationUnit: formSemesterDurationUnit,
          displayOrder: Number(formOrder),
          isActive: formActive
        });
        if (res.success) {
          toast.success("Academic Program Created");
          setIsAddProgramOpen(false);
          fetchData();
        } else {
          toast.error(res.error || "Failed to create program.");
        }
      }
    } catch {
      toast.error("Failed saving program.");
    } finally {
      setIsSavingProgram(false);
    }
  };

  // School Handlers
  const handleOpenAddSchool = () => {
    setSchoolFormName("");
    setSchoolFormCode("");
    setSchoolFormDescription("");
    setSchoolFormOrder(schools.length + 1);
    setIsAddSchoolOpen(true);
  };

  const handleOpenEditSchool = (school: School) => {
    setSelectedSchool(school);
    setSchoolFormName(school.name);
    setSchoolFormCode(school.code || "");
    setSchoolFormDescription(school.description || "");
    setSchoolFormOrder(school.displayOrder);
    setIsEditSchoolOpen(true);
  };

  const handleOpenDeleteSchool = (school: School) => {
    setSchoolToDelete(school);
    setDeleteSchoolError(null);
    setIsDeleteSchoolOpen(true);
  };

  const handleConfirmDeleteSchool = async () => {
    if (!schoolToDelete || isDeletingSchool) return;
    setIsDeletingSchool(true);
    setDeleteSchoolError(null);
    try {
      const res = await deleteSchoolAction(schoolToDelete.id);
      if (res.success) {
        toast.success("School Deleted", {
          description: `"${schoolToDelete.name}" was removed.`
        });
        setIsDeleteSchoolOpen(false);
        setSchoolToDelete(null);
        fetchData();
      } else {
        setDeleteSchoolError(res.error || "Failed to delete school.");
      }
    } catch {
      setDeleteSchoolError("An unexpected error occurred while deleting the school.");
    } finally {
      setIsDeletingSchool(false);
    }
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolFormName.trim()) {
      toast.error("School name is required.");
      return;
    }
    setIsSavingSchool(true);
    try {
      if (selectedSchool && isEditSchoolOpen) {
        const res = await updateSchoolAction(selectedSchool.id, {
          name: schoolFormName.trim(),
          code: schoolFormCode.trim() || null,
          description: schoolFormDescription.trim() || null,
          displayOrder: Number(schoolFormOrder)
        });
        if (res.success) {
          toast.success("School / Department Updated");
          setIsEditSchoolOpen(false);
          setSelectedSchool(null);
          fetchData();
        } else {
          toast.error(res.error || "Failed to update school.");
        }
      } else {
        const res = await createSchoolAction({
          name: schoolFormName.trim(),
          code: schoolFormCode.trim() || null,
          description: schoolFormDescription.trim() || null,
          displayOrder: Number(schoolFormOrder)
        });
        if (res.success) {
          toast.success("School / Department Created");
          setIsAddSchoolOpen(false);
          fetchData();
        } else {
          toast.error(res.error || "Failed to create school.");
        }
      }
    } catch {
      toast.error("Failed saving school.");
    } finally {
      setIsSavingSchool(false);
    }
  };

  // Scholarship Handlers
  const handleOpenAddScholarship = () => {
    setScholarshipFormName("");
    setScholarshipFormCode("");
    setScholarshipFormDescription("");
    setScholarshipFormOrder(scholarships.length + 1);
    setScholarshipFormActive(true);
    setIsAddScholarshipOpen(true);
  };

  const handleOpenEditScholarship = (sch: ScholarshipScheme) => {
    setSelectedScholarship(sch);
    setScholarshipFormName(sch.name);
    setScholarshipFormCode(sch.code || "");
    setScholarshipFormDescription(sch.description || "");
    setScholarshipFormOrder(sch.displayOrder);
    setScholarshipFormActive(sch.isActive);
    setIsEditScholarshipOpen(true);
  };

  const handleOpenDeleteScholarship = (sch: ScholarshipScheme) => {
    setScholarshipToDelete(sch);
    setDeleteScholarshipError(null);
    setIsDeleteScholarshipOpen(true);
  };

  const handleConfirmDeleteScholarship = async () => {
    if (!scholarshipToDelete || isDeletingScholarship) return;
    setIsDeletingScholarship(true);
    setDeleteScholarshipError(null);
    try {
      const res = await deleteScholarshipSchemeAction(scholarshipToDelete.id);
      if (res.success) {
        toast.success("Scholarship Scheme Deleted", {
          description: `"${scholarshipToDelete.name}" was removed.`
        });
        setIsDeleteScholarshipOpen(false);
        setScholarshipToDelete(null);
        fetchData();
      } else {
        setDeleteScholarshipError(res.error || "Failed to delete scholarship scheme.");
      }
    } catch {
      setDeleteScholarshipError("An unexpected error occurred while deleting the scholarship scheme.");
    } finally {
      setIsDeletingScholarship(false);
    }
  };

  const handleSaveScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scholarshipFormName.trim()) {
      toast.error("Scholarship scheme name is required.");
      return;
    }
    setIsSavingScholarship(true);
    try {
      if (selectedScholarship && isEditScholarshipOpen) {
        const res = await updateScholarshipSchemeAction(selectedScholarship.id, {
          name: scholarshipFormName.trim(),
          code: scholarshipFormCode.trim() || null,
          description: scholarshipFormDescription.trim() || null,
          displayOrder: Number(scholarshipFormOrder),
          isActive: scholarshipFormActive
        });
        if (res.success) {
          toast.success("Scholarship Scheme Updated");
          setIsEditScholarshipOpen(false);
          setSelectedScholarship(null);
          fetchData();
        } else {
          toast.error(res.error || "Failed to update scholarship scheme.");
        }
      } else {
        const res = await createScholarshipSchemeAction({
          name: scholarshipFormName.trim(),
          code: scholarshipFormCode.trim() || null,
          description: scholarshipFormDescription.trim() || null,
          displayOrder: Number(scholarshipFormOrder),
          isActive: scholarshipFormActive
        });
        if (res.success) {
          toast.success("Scholarship Scheme Created");
          setIsAddScholarshipOpen(false);
          fetchData();
        } else {
          toast.error(res.error || "Failed to create scholarship scheme.");
        }
      }
    } catch {
      toast.error("Failed saving scholarship scheme.");
    } finally {
      setIsSavingScholarship(false);
    }
  };

  // Campus Handlers
  const handleOpenAddCampus = () => {
    setCampusFormName("");
    setCampusFormCode("");
    setCampusFormLocation("");
    setCampusFormOrder(campuses.length + 1);
    setCampusFormActive(true);
    setIsAddCampusOpen(true);
  };

  const handleOpenEditCampus = (c: Campus) => {
    setSelectedCampus(c);
    setCampusFormName(c.name);
    setCampusFormCode(c.code || "");
    setCampusFormLocation(c.location || "");
    setCampusFormOrder(c.displayOrder);
    setCampusFormActive(c.isActive);
    setIsEditCampusOpen(true);
  };

  const handleOpenDeleteCampus = (c: Campus) => {
    setCampusToDelete(c);
    setDeleteCampusError(null);
    setIsDeleteCampusOpen(true);
  };

  const handleConfirmDeleteCampus = async () => {
    if (!campusToDelete || isDeletingCampus) return;
    setIsDeletingCampus(true);
    setDeleteCampusError(null);
    try {
      const res = await deleteCampusAction(campusToDelete.id);
      if (res.success) {
        toast.success("Campus Deleted", {
          description: `"${campusToDelete.name}" was removed.`
        });
        setIsDeleteCampusOpen(false);
        setCampusToDelete(null);
        fetchData();
      } else {
        setDeleteCampusError(res.error || "Failed to delete campus.");
      }
    } catch {
      setDeleteCampusError("An unexpected error occurred while deleting the campus.");
    } finally {
      setIsDeletingCampus(false);
    }
  };

  const handleSaveCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusFormName.trim()) {
      toast.error("Campus name is required.");
      return;
    }
    setIsSavingCampus(true);
    try {
      if (selectedCampus && isEditCampusOpen) {
        const res = await updateCampusAction(selectedCampus.id, {
          name: campusFormName.trim(),
          code: campusFormCode.trim() || null,
          location: campusFormLocation.trim() || null,
          displayOrder: Number(campusFormOrder),
          isActive: campusFormActive
        });
        if (res.success) {
          toast.success("Campus Updated");
          setIsEditCampusOpen(false);
          setSelectedCampus(null);
          fetchData();
        } else {
          toast.error(res.error || "Failed to update campus.");
        }
      } else {
        const res = await createCampusAction({
          name: campusFormName.trim(),
          code: campusFormCode.trim() || null,
          location: campusFormLocation.trim() || null,
          displayOrder: Number(campusFormOrder),
          isActive: campusFormActive
        });
        if (res.success) {
          toast.success("Campus Created");
          setIsAddCampusOpen(false);
          fetchData();
        } else {
          toast.error(res.error || "Failed to create campus.");
        }
      }
    } catch {
      toast.error("Failed saving campus.");
    } finally {
      setIsSavingCampus(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
      {/* ── Header: Title + Action button ───────────────────────────── */}
      <CardHeader className="bg-muted/30 border-b border-border/60 pb-0 pt-5 px-6">
        <div className="flex flex-col gap-4">
          {/* Top row: icon + title + add button */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {subView === "programs" ? (
                  <GraduationCap className="h-4 w-4" />
                ) : subView === "schools" ? (
                  <Building2 className="h-4 w-4" />
                ) : subView === "scholarships" ? (
                  <Award className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold leading-tight truncate">
                  {subView === "programs" ? "Academic Programs" : 
                   subView === "schools" ? "Schools & Departments" : 
                   subView === "scholarships" ? "Scholarship Schemes" :
                   "NFSU Campuses"}
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
                  {subView === "programs" ? "Degree programs, durations, and semester progression configs" : 
                   subView === "schools" ? "Authoritative academic schools and department records" :
                   subView === "scholarships" ? "Scholarship schemes available to international students" :
                   "NFSU campus locations and institutional sites"}
                </CardDescription>
              </div>
            </div>

            {/* Add action button */}
            {subView === "programs" ? (
              <Button onClick={handleOpenAddProgram} size="sm" className="text-xs h-8 gap-1.5 rounded-lg shadow-xs shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add Program
              </Button>
            ) : subView === "schools" ? (
              <Button onClick={handleOpenAddSchool} size="sm" className="text-xs h-8 gap-1.5 rounded-lg shadow-xs shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add School
              </Button>
            ) : subView === "scholarships" ? (
              <Button onClick={handleOpenAddScholarship} size="sm" className="text-xs h-8 gap-1.5 rounded-lg shadow-xs shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add Scheme
              </Button>
            ) : (
              <Button onClick={handleOpenAddCampus} size="sm" className="text-xs h-8 gap-1.5 rounded-lg shadow-xs shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add Campus
              </Button>
            )}
          </div>

          {/* ── Sub-tab underline bar ─────────────────────────────────── */}
          <div className="flex items-end border-b border-border/50 -mx-6 px-6 gap-0">
            {([
              { id: "programs",     icon: BookOpen,   label: "Programs",     count: programs.length },
              { id: "schools",      icon: Building2,  label: "Schools",      count: schools.length },
              { id: "scholarships", icon: Award,      label: "Scholarships", count: scholarships.length },
              { id: "campuses",     icon: MapPin,     label: "Campuses",     count: campuses.length },
            ] as const).map(({ id, icon: Icon, label, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSubView(id)}
                className={[
                  "relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all duration-150 select-none whitespace-nowrap",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-t",
                  subView === id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{label}</span>
                <span className={[
                  "inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums",
                  subView === id
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                ].join(" ")}>
                  {count}
                </span>
                {/* Active underline indicator */}
                {subView === id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={
                subView === "programs" ? "Search programs, codes, or schools..." : 
                subView === "schools" ? "Search schools, codes, or descriptions..." : 
                subView === "scholarships" ? "Search scholarship schemes..." :
                "Search campuses or locations..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl"
            />
          </div>
        </div>

        {/* Dynamic Sub-View Tables */}
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
                      <td className="py-2.5 px-3">
                        {prog.isActive ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Archived
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleProgramStatus(prog)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title={prog.isActive ? `Archive ${prog.programName}` : `Activate ${prog.programName}`}
                          >
                            {prog.isActive ? (
                              <Archive className="h-3.5 w-3.5" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditProgram(prog)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title={`Edit ${prog.programName}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteProgram(prog)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Delete ${prog.programName}`}
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
        ) : subView === "schools" ? (
          filteredSchools.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">No Schools Found</p>
              <p className="text-[11px]">No schools or academic departments match your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border/60 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">School / Department Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Programs</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSchools.map((school) => (
                    <tr key={school.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-muted-foreground">#{school.displayOrder}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{school.name}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{school.code || "—"}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {programs.filter(p => p.schoolId === school.id).length} programs
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        {school.description || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditSchool(school)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title={`Edit ${school.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteSchool(school)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Delete ${school.name}`}
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
        ) : subView === "scholarships" ? (
          filteredScholarships.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">No Scholarship Schemes Found</p>
              <p className="text-[11px]">No scholarship schemes match your current search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border/60 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Scholarship Scheme Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Active Students</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredScholarships.map((sch) => (
                    <tr key={sch.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-muted-foreground">#{sch.displayOrder}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{sch.name}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{sch.code || "—"}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-foreground">{sch.studentUsageCount || 0}</span>
                          <span>enrolled</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {sch.isActive ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        {sch.description || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditScholarship(sch)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title={`Edit ${sch.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteScholarship(sch)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Delete ${sch.name}`}
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
          filteredCampuses.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">No NFSU Campuses Found</p>
              <p className="text-[11px]">No campuses match your current search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border/60 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">NFSU Campus Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Active Students</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCampuses.map((campus) => (
                    <tr key={campus.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-muted-foreground">#{campus.displayOrder}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{campus.name}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{campus.code || "—"}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{campus.location || "—"}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-foreground">{campus.studentUsageCount || 0}</span>
                          <span>enrolled</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {campus.isActive ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditCampus(campus)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title={`Edit ${campus.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteCampus(campus)}
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Delete ${campus.name}`}
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

      {/* Program Add/Edit Dialog */}
      <Dialog open={isAddProgramOpen || isEditProgramOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddProgramOpen(false);
          setIsEditProgramOpen(false);
          setSelectedProgram(null);
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {isEditProgramOpen ? "Edit Academic Program" : "Add Academic Program"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProgram} className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Program Name <span className="text-destructive">*</span></label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. M.Sc. Digital Forensics & Information Security"
                className="text-xs h-9 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Program Code</label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. MSC-DFIS"
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Academic Level</label>
                <Select value={formLevel} onValueChange={(v) => setFormLevel(v || "PG")}>
                  <SelectTrigger className="text-xs h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {ACADEMIC_LEVEL_OPTIONS.map(opt => (
                      <SelectItem key={opt.code} value={opt.code} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">School / Department</label>
              <Select value={formSchoolId} onValueChange={(v) => setFormSchoolId(v || "")}>
                <SelectTrigger className="text-xs h-9 rounded-xl">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {schools.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Semesters</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formTotalSemesters}
                  onChange={(e) => setFormTotalSemesters(Number(e.target.value))}
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Sem Duration</label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={formSemesterDuration}
                  onChange={(e) => setFormSemesterDuration(Number(e.target.value))}
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Order</label>
                <Input
                  type="number"
                  min={0}
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="programActiveCheck"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="programActiveCheck" className="text-xs font-medium text-foreground cursor-pointer">
                Active (Available in student registration & editing dropdowns)
              </label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsAddProgramOpen(false); setIsEditProgramOpen(false); }} className="text-xs h-9 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingProgram} className="text-xs h-9 rounded-xl gap-1.5">
                {isSavingProgram && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditProgramOpen ? "Update Program" : "Create Program"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Program Delete Dialog */}
      <Dialog open={isDeleteProgramOpen} onOpenChange={(open) => { if (!open) { setIsDeleteProgramOpen(false); setProgramToDelete(null); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <DialogTitle className="text-sm font-semibold">Delete Academic Program</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <p className="text-foreground">Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{programToDelete?.programName}&rdquo;</span>?</p>
            {deleteProgramError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteProgramError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteProgramOpen(false)} className="text-xs h-9 rounded-xl">
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={isDeletingProgram} onClick={handleConfirmDeleteProgram} className="text-xs h-9 rounded-xl gap-1.5">
              {isDeletingProgram && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* School Add/Edit Dialog */}
      <Dialog open={isAddSchoolOpen || isEditSchoolOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddSchoolOpen(false);
          setIsEditSchoolOpen(false);
          setSelectedSchool(null);
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {isEditSchoolOpen ? "Edit School / Department" : "Add School / Department"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSchool} className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">School / Department Name <span className="text-destructive">*</span></label>
              <Input
                value={schoolFormName}
                onChange={(e) => setSchoolFormName(e.target.value)}
                placeholder="e.g. School of Cyber Security & Digital Forensics"
                className="text-xs h-9 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Code / Acronym</label>
                <Input
                  value={schoolFormCode}
                  onChange={(e) => setSchoolFormCode(e.target.value)}
                  placeholder="e.g. SCSDF"
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Order</label>
                <Input
                  type="number"
                  min={0}
                  value={schoolFormOrder}
                  onChange={(e) => setSchoolFormOrder(Number(e.target.value))}
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description (Optional)</label>
              <Textarea
                value={schoolFormDescription}
                onChange={(e) => setSchoolFormDescription(e.target.value)}
                placeholder="Brief details about the academic school or department..."
                className="text-xs rounded-xl min-h-[70px]"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsAddSchoolOpen(false); setIsEditSchoolOpen(false); }} className="text-xs h-9 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingSchool} className="text-xs h-9 rounded-xl gap-1.5">
                {isSavingSchool && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditSchoolOpen ? "Update School" : "Create School"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* School Delete Dialog */}
      <Dialog open={isDeleteSchoolOpen} onOpenChange={(open) => { if (!open) { setIsDeleteSchoolOpen(false); setSchoolToDelete(null); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <DialogTitle className="text-sm font-semibold">Delete School / Department</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <p className="text-foreground">Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{schoolToDelete?.name}&rdquo;</span>?</p>
            {deleteSchoolError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteSchoolError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteSchoolOpen(false)} className="text-xs h-9 rounded-xl">
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={isDeletingSchool} onClick={handleConfirmDeleteSchool} className="text-xs h-9 rounded-xl gap-1.5">
              {isDeletingSchool && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scholarship Add/Edit Dialog */}
      <Dialog open={isAddScholarshipOpen || isEditScholarshipOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddScholarshipOpen(false);
          setIsEditScholarshipOpen(false);
          setSelectedScholarship(null);
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {isEditScholarshipOpen ? "Edit Scholarship Scheme" : "Add Scholarship Scheme"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveScholarship} className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Scheme Name <span className="text-destructive">*</span></label>
              <Input
                value={scholarshipFormName}
                onChange={(e) => setScholarshipFormName(e.target.value)}
                placeholder="e.g. Atal Bihari Vajpayee General Scholarship Scheme (A1201)"
                className="text-xs h-9 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Scheme Code</label>
                <Input
                  value={scholarshipFormCode}
                  onChange={(e) => setScholarshipFormCode(e.target.value)}
                  placeholder="e.g. A1201"
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Order</label>
                <Input
                  type="number"
                  min={0}
                  value={scholarshipFormOrder}
                  onChange={(e) => setScholarshipFormOrder(Number(e.target.value))}
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description (Optional)</label>
              <Textarea
                value={scholarshipFormDescription}
                onChange={(e) => setScholarshipFormDescription(e.target.value)}
                placeholder="Brief information about sponsoring body, eligibility..."
                className="text-xs rounded-xl min-h-[70px]"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="scholarshipActiveCheck"
                checked={scholarshipFormActive}
                onChange={(e) => setScholarshipFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="scholarshipActiveCheck" className="text-xs font-medium text-foreground cursor-pointer">
                Active (Available in student registration & editing dropdowns)
              </label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsAddScholarshipOpen(false); setIsEditScholarshipOpen(false); }} className="text-xs h-9 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingScholarship} className="text-xs h-9 rounded-xl gap-1.5">
                {isSavingScholarship && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditScholarshipOpen ? "Update Scheme" : "Create Scheme"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scholarship Delete Dialog with Safety Alert */}
      <Dialog open={isDeleteScholarshipOpen} onOpenChange={(open) => { if (!open) { setIsDeleteScholarshipOpen(false); setScholarshipToDelete(null); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <DialogTitle className="text-sm font-semibold">Delete Scholarship Scheme</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <p className="text-foreground">
              Are you sure you want to delete scholarship scheme <span className="font-semibold text-foreground">&ldquo;{scholarshipToDelete?.name}&rdquo;</span>?
            </p>
            {scholarshipToDelete?.studentUsageCount && scholarshipToDelete.studentUsageCount > 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">In Use by Active Students</p>
                  <p className="text-[11px] mt-0.5">
                    This scheme is currently assigned to <span className="font-bold">{scholarshipToDelete.studentUsageCount}</span> student record(s). Deletion is blocked until all students are reassigned.
                  </p>
                </div>
              </div>
            ) : null}
            {deleteScholarshipError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteScholarshipError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteScholarshipOpen(false)} className="text-xs h-9 rounded-xl">
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              size="sm" 
              disabled={isDeletingScholarship || Boolean(scholarshipToDelete?.studentUsageCount && scholarshipToDelete.studentUsageCount > 0)} 
              onClick={handleConfirmDeleteScholarship} 
              className="text-xs h-9 rounded-xl gap-1.5"
            >
              {isDeletingScholarship && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete Scheme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campus Add/Edit Dialog */}
      <Dialog open={isAddCampusOpen || isEditCampusOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddCampusOpen(false);
          setIsEditCampusOpen(false);
          setSelectedCampus(null);
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {isEditCampusOpen ? "Edit NFSU Campus" : "Add NFSU Campus"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCampus} className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Campus Name <span className="text-destructive">*</span></label>
              <Input
                value={campusFormName}
                onChange={(e) => setCampusFormName(e.target.value)}
                placeholder="e.g. Gandhinagar Campus"
                className="text-xs h-9 rounded-xl"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Campus Code</label>
                <Input
                  value={campusFormCode}
                  onChange={(e) => setCampusFormCode(e.target.value)}
                  placeholder="e.g. GNR"
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Order</label>
                <Input
                  type="number"
                  min={0}
                  value={campusFormOrder}
                  onChange={(e) => setCampusFormOrder(Number(e.target.value))}
                  className="text-xs h-9 rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Location / City</label>
              <Input
                value={campusFormLocation}
                onChange={(e) => setCampusFormLocation(e.target.value)}
                placeholder="e.g. Gujarat, India"
                className="text-xs h-9 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="campusActiveCheck"
                checked={campusFormActive}
                onChange={(e) => setCampusFormActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="campusActiveCheck" className="text-xs font-medium text-foreground cursor-pointer">
                Active (Available in student registration & filtering dropdowns)
              </label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsAddCampusOpen(false); setIsEditCampusOpen(false); }} className="text-xs h-9 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingCampus} className="text-xs h-9 rounded-xl gap-1.5">
                {isSavingCampus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditCampusOpen ? "Update Campus" : "Create Campus"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campus Delete Dialog with Safety Alert */}
      <Dialog open={isDeleteCampusOpen} onOpenChange={(open) => { if (!open) { setIsDeleteCampusOpen(false); setCampusToDelete(null); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <DialogTitle className="text-sm font-semibold">Delete NFSU Campus</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs">
            <p className="text-foreground">
              Are you sure you want to delete campus <span className="font-semibold text-foreground">&ldquo;{campusToDelete?.name}&rdquo;</span>?
            </p>
            {campusToDelete?.studentUsageCount && campusToDelete.studentUsageCount > 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">In Use by Active Students</p>
                  <p className="text-[11px] mt-0.5">
                    This campus is currently assigned to <span className="font-bold">{campusToDelete.studentUsageCount}</span> student record(s). Deletion is blocked until all students are reassigned.
                  </p>
                </div>
              </div>
            ) : null}
            {deleteCampusError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteCampusError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteCampusOpen(false)} className="text-xs h-9 rounded-xl">
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              size="sm" 
              disabled={isDeletingCampus || Boolean(campusToDelete?.studentUsageCount && campusToDelete.studentUsageCount > 0)} 
              onClick={handleConfirmDeleteCampus} 
              className="text-xs h-9 rounded-xl gap-1.5"
            >
              {isDeletingCampus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete Campus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
