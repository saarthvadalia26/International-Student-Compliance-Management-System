"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileNavigation, NavItem } from "@/config/navigation";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { mockStudents } from "@/lib/mock-data";
import { Branding } from "@/config/branding";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});

  const getResolvedHref = (href: string) => {
    if (href.includes(":id")) {
      const segments = pathname.split("/");
      const studentIdx = segments.indexOf("students");
      let studentId = "";
      if (studentIdx !== -1 && segments[studentIdx + 1] && segments[studentIdx + 1] !== "add") {
        studentId = segments[studentIdx + 1];
      }
      if (!studentId) {
        studentId = mockStudents[0]?.id || "s1";
      }
      return href.replace(":id", studentId);
    }
    return href;
  };

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
    const IconComponent = iconName in Icons
      ? (Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>)
      : null;

    if (!IconComponent) return null;
    return <IconComponent className="h-5 w-5 shrink-0" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          className="fixed top-0 left-0 bottom-0 z-50 flex h-full w-72 max-w-xs flex-col border-r border-border bg-card text-card-foreground shadow-lg duration-200 outline-none data-open:animate-in data-open:slide-in-from-left-full data-closed:animate-out data-closed:slide-out-to-left-full"
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-2">
              <img src={Branding.logoPaths.logo} alt={Branding.shortName} className="h-6 w-6 object-contain" />
              <span className="font-display text-sm font-semibold text-primary">{Branding.appShortName} Mobile</span>
            </div>
            <DialogPrimitive.Close render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" />}>
              <Icons.XIcon className="h-4 w-4" />
              <span className="sr-only">Close menu</span>
            </DialogPrimitive.Close>
          </div>

          <DialogTitle className="sr-only">Mobile Navigation Sidebar</DialogTitle>
          <DialogDescription className="sr-only">
            This sidebar navigation allows you to switch between different workspaces of the ISMS application.
          </DialogDescription>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-none">
            {mobileNavigation.items.map((item: NavItem) => {
              const hasChildren = item.items && item.items.length > 0;
              const active = isLinkActive(item.href);
              const isOpenMenu = openMenus[item.title];

              return (
                <div key={item.title} className="space-y-1">
                  {hasChildren ? (
                    <div>
                      <button
                        onClick={() => toggleMenu(item.title)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          active && "bg-accent/50 text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {renderIcon(item.icon)}
                          <span>{item.title}</span>
                        </div>
                        <Icons.ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isOpenMenu && "rotate-180"
                          )}
                        />
                      </button>

                      {isOpenMenu && (
                        <div className="mt-1 ml-8 space-y-1 border-l border-border pl-3">
                          {item.items?.map((subItem) => {
                            const subActive = pathname === getResolvedHref(subItem.href);
                            return (
                              <Link
                                key={subItem.title}
                                href={getResolvedHref(subItem.href)}
                                onClick={onClose}
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
                    <Link
                      href={getResolvedHref(item.href)}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      )}
                    >
                      {renderIcon(item.icon)}
                      <span>{item.title}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
