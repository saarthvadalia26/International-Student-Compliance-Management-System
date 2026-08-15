import { NavigationConfig } from "./types";

export const desktopNavigation: NavigationConfig = {
  items: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: "LayoutDashboard",
    },
    {
      title: "Students",
      href: "/students",
      icon: "Users",
      items: [
        {
          title: "Student List",
          href: "/students",
        },
        {
          title: "Add Student",
          href: "/students/add",
        },
        {
          title: "Bulk Import",
          href: "/students/import",
        },
      ],
    },
    {
      title: "Documents",
      href: "/students/:id/passport",
      icon: "FileText",
      items: [
        {
          title: "Passport",
          href: "/students/:id/passport",
        },
        {
          title: "Visa",
          href: "/students/:id/visa",
        },
        {
          title: "eFRRO",
          href: "/students/:id/efrro",
        },
      ],
    },
    {
      title: "Replacement Requests",
      href: "/replacement-requests",
      icon: "FileCheck2",
    },
    {
      title: "Reminders",
      href: "/reminders",
      icon: "Bell",
    },
    {
      title: "Reports",
      href: "/reports",
      icon: "BarChart3",
    },
    {
      title: "Settings",
      href: "/settings",
      icon: "Settings",
    },
  ],
};
