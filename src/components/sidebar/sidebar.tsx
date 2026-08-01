"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { desktopNavigation, NavItem } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Branding } from "@/config/branding";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed, className, ...props }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});
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
        "flex flex-col border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out select-none",
        isCollapsed ? "w-[72px]" : "w-64",
        className
      )}
      {...props}
    >
      {/* Branding Header Area — Logo removed as per specification */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-primary font-display text-sm font-bold tracking-tight">
              {Branding.appShortName} Workspace
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="flex mx-auto items-center justify-center font-display text-xs font-bold text-primary">
            {Branding.appShortName}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("mx-auto h-8 w-8 text-muted-foreground", !isCollapsed && "ml-auto")}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
        {desktopNavigation.items.map((item: NavItem) => {
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
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      active && "bg-accent/50 text-foreground",
                      isCollapsed ? "justify-center" : "justify-between"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {renderIcon(item.icon)}
                      {!isCollapsed && <span>{item.title}</span>}
                    </div>
                    {!isCollapsed && (
                      <Icons.ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    )}
                  </button>

                  {/* Sub-menu rendering */}
                  {!isCollapsed && isOpen && (
                    <div className="mt-1 ml-8 space-y-1 border-l border-border pl-3">
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
                              "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                              subActive && "text-primary font-semibold"
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
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                    isCollapsed && "justify-center"
                  )}
                >
                  {renderIcon(item.icon)}
                  {!isCollapsed && <span>{item.title}</span>}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
