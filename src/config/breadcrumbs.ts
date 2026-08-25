"use client";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export interface RouteMetadata {
  section: string;
  pageTitle: string;
  breadcrumbs: BreadcrumbItem[];
}

/**
 * Route metadata mapping for static and pattern-matched routes across ISCMS.
 */
const staticRouteMap: Record<string, { section: string; title: string; parentLabel?: string; parentHref?: string }> = {
  "/dashboard": { section: "Workspace", title: "Dashboard" },
  "/dashboard/health": { section: "Workspace", title: "System Health & Diagnostics", parentLabel: "Dashboard", parentHref: "/dashboard" },
  "/students": { section: "Workspace", title: "Students" },
  "/students/add": { section: "Workspace", title: "Add Student", parentLabel: "Students", parentHref: "/students" },
  "/reminders": { section: "Workspace", title: "Reminders & Communication" },
  "/reports": { section: "Workspace", title: "Reports" },
  "/reports/audit": { section: "Workspace", title: "Audit Logs Report", parentLabel: "Reports", parentHref: "/reports" },
  "/reports/students": { section: "Workspace", title: "Student Registry Report", parentLabel: "Reports", parentHref: "/reports" },
  "/reports/notifications": { section: "Workspace", title: "Notification Delivery Report", parentLabel: "Reports", parentHref: "/reports" },
  "/reports/efrro": { section: "Workspace", title: "eFRRO Compliance Report", parentLabel: "Reports", parentHref: "/reports" },
  "/notifications": { section: "Workspace", title: "Notification Center" },
  "/monitoring": { section: "Workspace", title: "System Monitoring" },
  "/profile": { section: "Workspace", title: "Administrator Profile" },
  "/settings": { section: "Workspace", title: "Settings" },
  "/help": { section: "Workspace", title: "Help & Support" },
  "/setup": { section: "System", title: "Initial Setup Wizard" },
  "/student/dashboard": { section: "Student Portal", title: "Dashboard" },
  "/student/profile": { section: "Student Portal", title: "Profile" },
  "/student/efrro": { section: "Student Portal", title: "Document Centre" },
  "/student/history": { section: "Student Portal", title: "Activity History" },
  "/student/settings": { section: "Student Portal", title: "Preferences" },
  "/student/notifications": { section: "Student Portal", title: "Notifications" },
};

/**
 * Humanize URL slugs (e.g., "passport" -> "Passport", "efrro" -> "eFRRO", "add" -> "Add Student")
 */
function humanizeSegment(segment: string): string {
  if (segment === "efrro") return "eFRRO";
  if (segment === "passport") return "Passport";
  if (segment === "visa") return "Visa";
  if (segment === "audit") return "Audit Logs";
  if (segment === "health") return "System Health";

  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Derive full dynamic route metadata & breadcrumb trail based on current pathname & search parameters.
 */
export function getRouteMetadata(pathname: string, searchParams?: URLSearchParams | null): RouteMetadata {
  // Clean trailing slash
  const cleanPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // Special tab handling for /settings?tab=...
  if (cleanPath === "/settings" && searchParams) {
    const tab = searchParams.get("tab");
    if (tab === "notifications") {
      return {
        section: "Workspace",
        pageTitle: "Notification Preferences",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "Notification Preferences", isCurrent: true },
        ],
      };
    } else if (tab === "users") {
      return {
        section: "Workspace",
        pageTitle: "User Management",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "User Management", isCurrent: true },
        ],
      };
    } else if (tab === "programs") {
      return {
        section: "Workspace",
        pageTitle: "Academic Programs",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "Academic Programs", isCurrent: true },
        ],
      };
    } else if (tab === "retention") {
      return {
        section: "Workspace",
        pageTitle: "Document Retention",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "Document Retention", isCurrent: true },
        ],
      };
    }
  }

  // 1. Direct Static Match
  if (staticRouteMap[cleanPath]) {
    const route = staticRouteMap[cleanPath];
    const items: BreadcrumbItem[] = [
      { label: route.section, href: cleanPath.startsWith("/student/") ? "/student/dashboard" : "/dashboard" },
    ];

    if (route.parentLabel && route.parentHref) {
      items.push({ label: route.parentLabel, href: route.parentHref });
    }

    items.push({ label: route.title, isCurrent: true });

    return {
      section: route.section,
      pageTitle: route.title,
      breadcrumbs: items,
    };
  }

  // 2. Dynamic Student Routes (/students/[id])
  if (cleanPath.startsWith("/students/")) {
    const segments = cleanPath.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [
      { label: "Workspace", href: "/dashboard" },
      { label: "Students", href: "/students" },
    ];

    if (segments.length >= 2 && segments[1] !== "add") {
      items.push({ label: "Student Details", isCurrent: true });
      return {
        section: "Workspace",
        pageTitle: "Student Details",
        breadcrumbs: items,
      };
    }
  }

  // 3. Fallback Dynamic Segment Parser for Unmatched Routes
  const segments = cleanPath.split("/").filter(Boolean);
  const isStudentPortal = cleanPath.startsWith("/student");
  const defaultSection = isStudentPortal ? "Student Portal" : "Workspace";
  const defaultHome = isStudentPortal ? "/student/dashboard" : "/dashboard";

  const items: BreadcrumbItem[] = [{ label: defaultSection, href: defaultHome }];

  let currentPath = "";
  segments.forEach((seg, idx) => {
    if (seg.startsWith("(") && seg.endsWith(")")) return;

    currentPath += `/${seg}`;
    const isLast = idx === segments.length - 1;
    const label = humanizeSegment(seg);

    items.push({
      label,
      href: isLast ? undefined : currentPath,
      isCurrent: isLast,
    });
  });

  const lastItem = items[items.length - 1];
  const pageTitle = lastItem ? lastItem.label : "Dashboard";

  return {
    section: defaultSection,
    pageTitle,
    breadcrumbs: items,
  };
}
