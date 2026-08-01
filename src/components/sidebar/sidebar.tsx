"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { desktopNavigation, NavItem } from "@/config/navigation";
import { useUserRole } from "@/hooks/use-user-role";

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function Sidebar({ className, ...props }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdministrator } = useUserRole();
  const prefetchedRoutesRef = React.useRef<Set<string>>(new Set());

  const getResolvedHref = (href: string) => {
    if (href.includes(":id")) {
      const segments = pathname.split("/");
      const studentIdx = segments.indexOf("students");
      let studentId = "";
      if (studentIdx !== -1 && segments[studentIdx + 1] && segments[studentIdx + 1] !== "add") {
        studentId = segments[studentIdx + 1];
      }
      if (!studentId) {
        studentId = "1"; // Fallback identifier
      }
      return href.replace(":id", studentId);
    }
    return href;
  };

  // Eager background route prefetching with deduplication
  const handlePrefetch = React.useCallback(
    (href: string) => {
      const resolved = getResolvedHref(href);
      if (!prefetchedRoutesRef.current.has(resolved)) {
        prefetchedRoutesRef.current.add(resolved);
        router.prefetch(resolved);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, pathname]
  );

  const isLinkActive = (href: string) => {
    const resolved = getResolvedHref(href);
    if (resolved === "/dashboard") {
      return pathname === resolved;
    }
    return pathname.startsWith(resolved);
  };

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent =
      iconName in Icons
        ? (Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>)
        : null;

    if (!IconComponent) return null;
    return <IconComponent className="h-5 w-5 shrink-0" />;
  };

  return (
    <aside
      className={cn(
        "flex flex-col w-20 border-r border-border bg-card text-card-foreground select-none shrink-0 items-center py-4",
        className
      )}
      {...props}
    >
      {/* Permanent Icon-Only Navigation List */}
      <nav className="flex flex-col items-center space-y-3 w-full px-3">
        {desktopNavigation.items
          .filter((item: NavItem) => {
            // Settings is Administrator-only
            if (item.href === "/settings") return isAdministrator;
            return true;
          })
          .map((item: NavItem) => {
            const active = isLinkActive(item.href);
            const resolvedHref = getResolvedHref(item.href);

            return (
              <Link
                key={item.title}
                href={resolvedHref}
                prefetch={true}
                onMouseEnter={() => handlePrefetch(item.href)}
                onFocus={() => handlePrefetch(item.href)}
                title={item.title}
                aria-label={item.title}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-105",
                  active &&
                    "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 hover:bg-primary/95 hover:text-primary-foreground scale-[1.02]"
                )}
              >
                {renderIcon(item.icon)}
                <span className="sr-only">{item.title}</span>
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
