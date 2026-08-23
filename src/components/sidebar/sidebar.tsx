"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { desktopNavigation, NavItem } from "@/config/navigation";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Branding } from "@/config/branding";

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function Sidebar({ className, ...props }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdministrator } = useUserRole();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});
  const prefetchedRoutesRef = React.useRef<Set<string>>(new Set());

  // Expand / Collapse state initialized from localStorage
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("iscms_sidebar_collapsed");
        return saved ? Boolean(JSON.parse(saved)) : false;
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("iscms_sidebar_collapsed", JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

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

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

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
        "flex flex-col border-r border-border bg-card text-card-foreground transition-[width] duration-300 ease-in-out select-none shrink-0",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
      {...props}
    >
      {/* Branding Header Area — Application Title ONLY (Zero Logo Images / Badges) */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/50 overflow-hidden">
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden truncate">
            <span className="text-primary font-display text-sm font-bold tracking-tight truncate">
              {Branding.appShortName} Workspace
            </span>
            <span className="text-[10px] text-muted-foreground truncate font-normal">
              Compliance Portal
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={cn(
            "h-8 w-8 shrink-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            isCollapsed ? "mx-auto" : "ml-auto"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <Icons.ChevronRight className="h-4 w-4" />
          ) : (
            <Icons.ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-none">
        {desktopNavigation.items
          .filter((item: NavItem) => {
            // Settings is Administrator-only
            if (item.href === "/settings") return isAdministrator;
            return true;
          })
          .map((item: NavItem) => {
            const hasChildren = item.items && item.items.length > 0;
            const active = isLinkActive(item.href);
            const isOpen = openMenus[item.title];
            const resolvedHref = getResolvedHref(item.href);

            return (
              <div key={item.title} className="space-y-1">
                {hasChildren ? (
                  // Parent Link with Sub-menu toggles
                  <div>
                    <button
                      onClick={() => !isCollapsed && toggleMenu(item.title)}
                      onMouseEnter={() => handlePrefetch(item.href)}
                      onFocus={() => handlePrefetch(item.href)}
                      title={isCollapsed ? item.title : undefined}
                      className={cn(
                        "flex min-h-[44px] w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.99] active:duration-75",
                        active && (isCollapsed ? "bg-primary/15 text-primary font-semibold" : "bg-accent/60 text-foreground"),
                        isCollapsed ? "justify-center px-0" : "justify-between"
                      )}
                    >
                      <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                        {renderIcon(item.icon)}
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </div>
                      {!isCollapsed && (
                        <Icons.ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-200 ease-out",
                            isOpen && "rotate-180"
                          )}
                        />
                      )}
                    </button>

                    {/* Sub-menu rendering */}
                    {!isCollapsed && isOpen && (
                      <div className="mt-1 ml-8 space-y-1 border-l border-border pl-3 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                        {item.items?.map((subItem) => {
                          const subResolved = getResolvedHref(subItem.href);
                          const subActive = pathname === subResolved;
                          return (
                            <Link
                              key={subItem.title}
                              href={subResolved}
                              prefetch={true}
                              onMouseEnter={() => handlePrefetch(subItem.href)}
                              onFocus={() => handlePrefetch(subItem.href)}
                              className={cn(
                                "block rounded-md px-3 py-2 text-xs font-medium transition-all duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.99] active:duration-75",
                                subActive && "text-primary font-semibold bg-accent/40"
                              )}
                            >
                              {subItem.title}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  // Direct Navigation Link
                  <Link
                    href={resolvedHref}
                    prefetch={true}
                    onMouseEnter={() => handlePrefetch(item.href)}
                    onFocus={() => handlePrefetch(item.href)}
                    title={isCollapsed ? item.title : undefined}
                    className={cn(
                      "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.99] active:duration-75",
                      active && "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 hover:text-primary-foreground",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    {renderIcon(item.icon)}
                    {!isCollapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                )}
              </div>
            );
          })}
      </nav>
    </aside>
  );
}
