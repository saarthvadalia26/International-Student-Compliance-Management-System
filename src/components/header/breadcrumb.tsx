"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getRouteMetadata } from "@/config/breadcrumbs";
import { cn } from "@/lib/utils";

function HeaderBreadcrumbInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { breadcrumbs } = getRouteMetadata(pathname || "/dashboard", searchParams);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-muted-foreground font-small overflow-hidden"
    >
      {breadcrumbs.map((item, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        const isFirst = idx === 0;

        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {idx > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-border shrink-0" aria-hidden="true" />
            )}

            {isLast ? (
              <span
                className="font-medium text-foreground truncate max-w-[140px] sm:max-w-[220px] md:max-w-xs"
                aria-current="page"
                title={item.label}
              >
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-[160px]",
                  isFirst && "hidden sm:inline"
                )}
                title={item.label}
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn("truncate max-w-[100px] sm:max-w-[160px]", isFirst && "hidden sm:inline")}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function HeaderBreadcrumb() {
  return (
    <React.Suspense
      fallback={
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground font-small">
          <span>Workspace</span>
        </nav>
      }
    >
      <HeaderBreadcrumbInner />
    </React.Suspense>
  );
}
