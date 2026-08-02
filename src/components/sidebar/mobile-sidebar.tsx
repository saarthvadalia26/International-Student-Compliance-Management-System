"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileNavigation, NavItem } from "@/config/navigation";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/use-user-role";
import { Branding } from "@/config/branding";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
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

  // Eager prefetching on touch / hover for mobile navigation
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup className="fixed top-0 left-0 bottom-0 z-50 flex h-full w-72 max-w-[80vw] flex-col border-r border-border bg-card text-card-foreground shadow-xl duration-200 outline-none data-open:animate-in data-open:slide-in-from-left-full data-closed:animate-out data-closed:slide-out-to-left-full">
          {/* Header Area — Application Title ONLY (Zero Logo Images / Badges) */}
          <div className="flex h-16 w-full items-center justify-between border-b border-border/50 px-4">
            <div className="flex flex-col overflow-hidden truncate">
              <span className="text-primary font-display text-sm font-bold tracking-tight truncate">
                {Branding.appShortName} Workspace
              </span>
              <span className="text-[10px] text-muted-foreground truncate font-normal">
                Compliance Portal
              </span>
            </div>
            <DialogPrimitive.Close render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground" />}>
              <Icons.XIcon className="h-4 w-4" />
              <span className="sr-only">Close menu</span>
            </DialogPrimitive.Close>
          </div>

          <DialogTitle className="sr-only">Mobile Navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Mobile navigation menu drawer.
          </DialogDescription>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-none">
            {mobileNavigation.items
              .filter((item: NavItem) => {
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
                    onClick={onClose}
                    prefetch={true}
                    onTouchStart={() => handlePrefetch(item.href)}
                    onMouseEnter={() => handlePrefetch(item.href)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      active && "bg-primary text-primary-foreground font-semibold shadow-sm"
                    )}
                  >
                    {renderIcon(item.icon)}
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
          </nav>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
