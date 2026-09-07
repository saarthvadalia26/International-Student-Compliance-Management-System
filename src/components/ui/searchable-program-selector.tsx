"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X, GraduationCap, Building2 } from "lucide-react";
import { AcademicProgram, getAcademicLevelLabel } from "@/domain/academic-programs/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchableProgramSelectorProps {
  id?: string;
  programs: AcademicProgram[];
  value?: string | null; // program.id, programCode, or programName
  onChange: (selectedProgram: AcademicProgram | null) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  className?: string;
}

function normalizeSearch(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\b([a-z])\s+(?=[a-z]\b)/g, "$1")
    .replace(/[,-_()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesProgram(query: string, prog: AcademicProgram): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const progName = (prog.programName || "").toLowerCase();
  const progCode = (prog.programCode || "").toLowerCase();
  const schoolName = (prog.schoolName || "").toLowerCase();
  const level = (prog.academicLevel || "").toLowerCase();
  const levelLabel = prog.academicLevel ? getAcademicLevelLabel(prog.academicLevel).toLowerCase() : "";

  // 1. Direct substring match
  if (
    progName.includes(q) ||
    progCode.includes(q) ||
    schoolName.includes(q) ||
    level.includes(q) ||
    levelLabel.includes(q)
  ) {
    return true;
  }

  // 2. Normalized search (stripping periods, collapsing spaced initials like 'M. A.' -> 'ma')
  const normQ = normalizeSearch(query);
  const normName = normalizeSearch(prog.programName);
  const normCode = normalizeSearch(prog.programCode);
  const normSchool = normalizeSearch(prog.schoolName);

  if (normName.includes(normQ) || normCode.includes(normQ) || normSchool.includes(normQ)) {
    return true;
  }

  // 3. Spaceless match (e.g. 'm.a.' vs 'ma', 'bscfs')
  const spacelessQ = normQ.replace(/\s+/g, "");
  const spacelessName = normName.replace(/\s+/g, "");
  if (spacelessQ && spacelessName.includes(spacelessQ)) {
    return true;
  }

  // 4. Token-level match (all non-empty search words present in normalized name, code, or school)
  const tokens = normQ.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every(tok =>
      normName.includes(tok) || normCode.includes(tok) || normSchool.includes(tok)
    );
    if (allTokensMatch) return true;
  }

  return false;
}

export function SearchableProgramSelector({
  id = "academic-program-selector",
  programs = [],
  value,
  onChange,
  disabled = false,
  placeholder = "Search and select academic program...",
  error,
  className
}: SearchableProgramSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Resolve currently selected program object by id, code, exact or normalized name (including base name before specialization)
  const selectedProgram = React.useMemo(() => {
    if (!value) return null;
    const valTrim = String(value).trim().toLowerCase();
    const directMatch = programs.find(p => 
      p.id.toLowerCase() === valTrim ||
      (p.programCode && p.programCode.toLowerCase() === valTrim) ||
      p.programName.toLowerCase() === valTrim
    );
    if (directMatch) return directMatch;

    const normVal = normalizeSearch(valTrim);
    return programs.find(p => {
      const pNorm = normalizeSearch(p.programName);
      const pBaseNorm = normalizeSearch(p.programName.split("(")[0]);
      const pCodeNorm = p.programCode ? normalizeSearch(p.programCode) : "";
      return (
        pNorm === normVal ||
        pBaseNorm === normVal ||
        pCodeNorm === normVal ||
        pNorm.startsWith(normVal)
      );
    }) || null;
  }, [value, programs]);

  // Filter programs based on multi-field query (Name, Code, Level, School) with normalization
  const filteredPrograms = React.useMemo(() => {
    if (!search.trim()) return programs;
    return programs.filter(p => matchesProgram(search, p));
  }, [programs, search]);

  // Click outside listener
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (program: AcademicProgram) => {
    onChange(program);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch("");
  };

  const getLevelBadgeVariant = (level?: string | null) => {
    const norm = (level || "").toUpperCase();
    if (norm === "INTEGRATED" || norm.includes("INTEG")) {
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
    }
    if (norm === "PG" || norm === "POSTGRADUATE") {
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30";
    }
    if (norm === "UG" || norm === "UNDERGRADUATE") {
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
    }
    if (norm === "PHD" || norm === "DOCTORATE") {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div ref={containerRef} className={cn("relative w-full min-w-0 font-sans", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs transition-colors outline-hidden select-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-rose-500 focus-visible:ring-rose-500/30" : "border-input hover:border-border/80",
          "min-w-0"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <GraduationCap className="h-4 w-4 text-primary shrink-0 opacity-80" />
          {selectedProgram ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
              <span className="font-semibold text-foreground truncate block text-xs" title={selectedProgram.programName}>
                {selectedProgram.programName}
              </span>
              {selectedProgram.academicLevel && (
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium border shrink-0 hidden min-[400px]:inline-block", getLevelBadgeVariant(selectedProgram.academicLevel))}>
                  {getAcademicLevelLabel(selectedProgram.academicLevel)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1.5">
          {selectedProgram && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClear(e as any); }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              title="Clear selection"
              aria-label="Clear program selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-70" />
        </div>
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div 
          role="listbox" 
          className="absolute top-full left-0 z-50 mt-1 w-full max-w-[calc(100vw-2rem)] min-w-[280px] sm:min-w-[360px] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Search Header */}
          <div className="p-2.5 border-b border-border bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Type course name, code (e.g. MSC-TOX), or level..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs rounded-md"
              />
            </div>
          </div>

          {/* Programs List */}
          <div className="max-h-64 overflow-y-auto p-1 divide-y divide-border/30">
            {filteredPrograms.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No matching academic programs found for &ldquo;{search}&rdquo;.
              </div>
            ) : (
              filteredPrograms.map((prog) => {
                const isSelected = selectedProgram?.id === prog.id || selectedProgram?.programName === prog.programName;

                return (
                  <div
                    key={prog.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(prog)}
                    className={cn(
                      "flex items-start justify-between gap-2.5 p-2.5 rounded-lg text-xs cursor-pointer transition-colors",
                      isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent hover:text-accent-foreground text-foreground"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Program Full Name */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground text-xs leading-snug break-words" title={prog.programName}>
                          {prog.programName}
                        </span>
                        {prog.programCode && (
                          <span className="font-mono text-[10px] text-muted-foreground/80 bg-muted px-1.5 py-0.2 rounded border border-border/50">
                            {prog.programCode}
                          </span>
                        )}
                      </div>

                      {/* Department / School & Structure Details */}
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        {prog.schoolName && (
                          <span className="flex items-center gap-1 truncate text-muted-foreground/90">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {prog.schoolName}
                          </span>
                        )}
                        <span>· {prog.totalSemesters || 8} Semesters</span>
                        {prog.academicLevel && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[9px] px-1.5 py-0 font-medium shrink-0", getLevelBadgeVariant(prog.academicLevel))}
                          >
                            {getAcademicLevelLabel(prog.academicLevel)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-500 font-medium mt-1 animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
