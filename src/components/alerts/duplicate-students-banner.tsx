"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, Users, ArrowRight, ShieldAlert, X, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/use-user-role";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { checkDuplicateStudentsAction, markStudentsAsDifferentAction } from "@/app/(app)/students/actions";
import { 
  DuplicateStudentGroup, 
  normalizeNameForComparison 
} from "@/domain/students/utils/duplicate-student-detection.util";
import { cn } from "@/lib/utils";

interface DuplicateStudentsBannerProps {
  className?: string;
  initialGroups?: DuplicateStudentGroup[];
  onDifferentStudentsConfirmed?: (groupKey: string) => void;
}

export function DuplicateStudentsBanner({ 
  className, 
  initialGroups,
  onDifferentStudentsConfirmed 
}: DuplicateStudentsBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdministrator, isStaff } = useUserRole();
  const [duplicateGroups, setDuplicateGroups] = React.useState<DuplicateStudentGroup[]>(initialGroups || []);
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(!initialGroups);
  const [resolvingGroupKey, setResolvingGroupKey] = React.useState<string | null>(null);

  const fetchDuplicates = React.useCallback(async () => {
    try {
      const res = await checkDuplicateStudentsAction();
      if (res.success && res.duplicateGroups) {
        setDuplicateGroups(res.duplicateGroups);
      }
    } catch (err) {
      console.warn("[DUPLICATE_STUDENTS_BANNER] Failed to check duplicates:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!initialGroups) {
      fetchDuplicates();
    }
  }, [fetchDuplicates, initialGroups]);

  // Realtime subscription: Re-evaluate duplicates if students or audit_log changes
  useRealtimeSubscription({
    table: "students",
    onEvent: () => {
      fetchDuplicates();
    }
  });
  useRealtimeSubscription({
    table: "student_personal",
    onEvent: () => {
      fetchDuplicates();
    }
  });
  useRealtimeSubscription({
    table: "audit_log",
    onEvent: () => {
      fetchDuplicates();
    }
  });

  const handleMarkDifferent = async (group: DuplicateStudentGroup) => {
    try {
      setResolvingGroupKey(group.groupKey);
      const res = await markStudentsAsDifferentAction({
        groupKey: group.groupKey,
        studentIds: group.studentIds,
        reason: "Administrator confirmed both are different students via banner",
      });

      if (!res.success) {
        toast.error(res.error || "Failed to confirm students as different.");
        return;
      }

      toast.success("Both students confirmed as different individuals. Duplicate alert resolved across the website.");

      // Optimistically remove group from UI banner
      setDuplicateGroups((prev) => prev.filter((g) => g.groupKey !== group.groupKey));

      // Notify parent callback (e.g. StudentListPage to clear filter and reload list)
      if (onDifferentStudentsConfirmed) {
        onDifferentStudentsConfirmed(group.groupKey);
      }

      // Clear search query filter from URL if it matches this duplicate's search query
      if (pathname && pathname.includes("/students") && searchParams) {
        const currentSearch = searchParams.get("search") || searchParams.get("q") || "";
        if (currentSearch) {
          const normCurrent = normalizeNameForComparison(currentSearch);
          const normTerm = normalizeNameForComparison(group.searchTerm);
          const normPrimary = normalizeNameForComparison(group.primaryName);
          
          if (
            normCurrent === normTerm ||
            normCurrent.includes(normTerm) ||
            normPrimary.includes(normCurrent)
          ) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete("search");
            newParams.delete("q");
            const newQuery = newParams.toString();
            router.replace(newQuery ? `${pathname}?${newQuery}` : pathname);
          }
        }
      }

      router.refresh();
    } catch (err) {
      console.error("[DUPLICATE_BANNER] Error marking students as different:", err);
      toast.error("An unexpected error occurred while confirming distinct students.");
    } finally {
      setResolvingGroupKey(null);
    }
  };

  // Only display to staff / administrators
  if (!isAdministrator && !isStaff) return null;
  if (isDismissed || isLoading || duplicateGroups.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {duplicateGroups.map((group) => {
        const studentCount = group.students.length;
        const targetUrl = `/students?search=${encodeURIComponent(group.searchTerm)}`;
        const isResolving = resolvingGroupKey === group.groupKey;

        return (
          <div
            key={group.groupKey}
            className="group relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 md:p-5 shadow-sm transition-all duration-200 hover:border-amber-500/60 hover:shadow-md animate-card-enter backdrop-blur-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left Column: Icon and Description */}
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-display">
                      Duplicate Student Records Detected
                    </span>
                    <Badge
                      variant="outline"
                      className="border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    >
                      {studentCount} Profiles
                    </Badge>
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed">
                    <span className="font-semibold text-foreground">
                      {studentCount} student records with matching names (
                      <span className="font-mono underline decoration-amber-500/50 underline-offset-2">
                        {group.primaryName}
                      </span>
                      )
                    </span>{" "}
                    have been registered. This may cause compliance count and permit discrepancies.
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      Reason: {group.reason}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Action Buttons */}
              <div className="flex items-center gap-2 sm:shrink-0 self-end sm:self-center flex-wrap">
                {/* Button: Both are Different Student */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isResolving}
                  onClick={() => handleMarkDifferent(group)}
                  className="h-9 px-3.5 text-xs font-medium gap-1.5 border-emerald-600/40 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-600 dark:hover:text-white transition-all shadow-xs"
                >
                  {isResolving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-0.5" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>Both are Different Student</span>
                </Button>

                {/* Button: Review Duplicates */}
                <Link href={targetUrl} passHref>
                  <Button
                    size="sm"
                    className="h-9 px-3.5 text-xs font-medium gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs hover:shadow-sm transition-all"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Review Duplicates</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-0.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                  onClick={() => setIsDismissed(true)}
                  title="Dismiss alert for this session"
                  aria-label="Dismiss alert"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
