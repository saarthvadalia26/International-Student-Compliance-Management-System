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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
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
        <DialogPrimitive.Popup className="fixed top-0 left-0 bottom-0 z-50 flex h-full w-20 flex-col items-center border-r border-border bg-card text-card-foreground shadow-lg duration-200 outline-none data-open:animate-in data-open:slide-in-from-left-full data-closed:animate-out data-closed:slide-out-to-left-full py-4">
          {/* Header Area — Close Button */}
          <div className="flex h-12 w-full items-center justify-center border-b border-border pb-3">
            <DialogPrimitive.Close render={<Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground" />}>
              <Icons.XIcon className="h-5 w-5" />
              <span className="sr-only">Close menu</span>
            </DialogPrimitive.Close>
          </div>

          <DialogTitle className="sr-only">Mobile Icon Navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Icon-only mobile navigation drawer.
          </DialogDescription>

          <nav className="flex-1 overflow-y-auto pt-4 px-2 space-y-3 w-full flex flex-col items-center scrollbar-none">
            {mobileNavigation.items.map((item: NavItem) => {
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
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
