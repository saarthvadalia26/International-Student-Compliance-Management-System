"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Search, 
  UserPlus, 
  X, 
  MoreHorizontal,
  Eye,
  Trash2,
  AlertCircle
} from "lucide-react";
import { mockStudents, MockStudent } from "@/lib/mock-data";
import { CountryFlag } from "@/components/ui/country-flag";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";

export default function StudentListPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [complianceFilter, setComplianceFilter] = React.useState<string>("all");
  const [academicFilter, setAcademicFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Filter logic
  const filteredStudents = React.useMemo(() => {
    return mockStudents.filter((student) => {
      // 1. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        student.fullName.toLowerCase().includes(query) ||
        student.registrationNumber.toLowerCase().includes(query) ||
        student.nationalityName.toLowerCase().includes(query) ||
        student.programName.toLowerCase().includes(query) ||
        student.school.toLowerCase().includes(query) ||
        student.passport.number.toLowerCase().includes(query) ||
        student.visa.number.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query);

      // 2. Compliance Status
      const matchesCompliance = 
        complianceFilter === "all" || 
        student.complianceStatus === complianceFilter ||
        (complianceFilter === "critical" && (student.complianceStatus === "non_compliant" || student.complianceStatus === "expired"));

      // 3. Academic Status
      const matchesAcademic = 
        academicFilter === "all" || 
        student.academicStatus === academicFilter;

      return matchesSearch && matchesCompliance && matchesAcademic;
    });
  }, [searchQuery, complianceFilter, academicFilter]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setComplianceFilter("all");
    setAcademicFilter("all");
    setCurrentPage(1);
  };

  // Pagination bounds
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedStudents = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const getComplianceBadge = (status: MockStudent["complianceStatus"]) => {
    switch (status) {
      case "compliant":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Compliant</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Warning</Badge>;
      case "non_compliant":
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">Non-Compliant</Badge>;
      case "expired":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-medium">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getAcademicStatusBadge = (status: MockStudent["academicStatus"]) => {
    switch (status) {
      case "good_standing":
        return <Badge variant="outline" className="border-slate-200 text-slate-700 dark:border-zinc-800 dark:text-zinc-300 font-normal">Good Standing</Badge>;
      case "probation":
        return <Badge variant="secondary" className="bg-orange-500/5 text-orange-600 dark:text-orange-400 border-orange-500/10 font-normal">Academic Probation</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/10 font-normal">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-h1 tracking-tight text-foreground text-2xl">International Student Directory</h1>
          <p className="font-caption text-muted-foreground">
            Search, filter, and audit academic standings and immigration status of registered international students.
          </p>
        </div>
        
        <Link href="/students/add" passHref>
          <Button size="sm" className="h-9 shrink-0">
            <UserPlus className="mr-2 h-4 w-4" /> Register New Student
          </Button>
        </Link>
      </div>

      {/* Filters and Search controls */}
      <Card className="border border-border/60 shadow-sm bg-card/50">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, registration ID, or nationality..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 hover:text-foreground text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Compliance filter */}
          <div className="w-full md:w-[200px]">
            <Select 
              value={complianceFilter} 
              onValueChange={(val) => {
                setComplianceFilter(val || "all");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Compliance Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Compliance Statuses</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="warning">Warning State</SelectItem>
                <SelectItem value="critical">Critical / Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Academic Status filter */}
          <div className="w-full md:w-[200px]">
            <Select 
              value={academicFilter} 
              onValueChange={(val) => {
                setAcademicFilter(val || "all");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Academic Standing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Standings</SelectItem>
                <SelectItem value="good_standing">Good Standing</SelectItem>
                <SelectItem value="probation">Academic Probation</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear filters trigger */}
          {(searchQuery || complianceFilter !== "all" || academicFilter !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetFilters}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Main Student Directory Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[280px] text-xs">Student</TableHead>
                <TableHead className="text-xs">Nationality</TableHead>
                <TableHead className="text-xs">Academic Program</TableHead>
                <TableHead className="text-xs">Academic Standing</TableHead>
                <TableHead className="text-xs">Compliance Status</TableHead>
                <TableHead className="w-[80px] text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                      <p className="font-medium text-sm">No student records found</p>
                      <p className="font-caption text-xs">Try adjusting your filters or search keywords.</p>
                      <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs h-8">
                        Clear all filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student) => (
                  <TableRow key={student.id} className="hover:bg-muted/5 transition-colors">
                    {/* Student Info */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-xs font-display">
                          {student.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <Link href={`/students/${student.id}`} className="text-sm font-medium hover:underline text-foreground block">
                            {student.fullName}
                          </Link>
                          <span className="text-[11px] text-muted-foreground block font-caption">{student.registrationNumber}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Nationality */}
                    <TableCell className="py-3.5 text-xs text-foreground">
                      <div className="flex items-center gap-1.5 font-small">
                        <CountryFlag countryCode={student.nationalityCode} size="md" />
                        <span>{student.nationalityName}</span>
                      </div>
                    </TableCell>

                    {/* Academic Program */}
                    <TableCell className="py-3.5 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-medium text-foreground block">{student.programName}</span>
                        <span className="text-[10px] text-muted-foreground block font-caption">{student.school}</span>
                      </div>
                    </TableCell>

                    {/* Academic Standing */}
                    <TableCell className="py-3.5">
                      {getAcademicStatusBadge(student.academicStatus)}
                    </TableCell>

                    {/* Compliance Status */}
                    <TableCell className="py-3.5">
                      {getComplianceBadge(student.complianceStatus)}
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-[150px]">
                          <DropdownMenuLabel className="text-xs font-semibold">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs cursor-pointer"
                            render={
                              <Link href={`/students/${student.id}`} />
                            }
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Archive Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 bg-muted/20">
            <div className="text-xs text-muted-foreground font-caption">
              Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
              <span className="font-medium text-foreground">{totalItems}</span> students
            </div>
            
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 text-xs px-2.5"
              >
                Previous
              </Button>
              <div className="text-xs font-semibold text-muted-foreground px-2 font-caption">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 text-xs px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
