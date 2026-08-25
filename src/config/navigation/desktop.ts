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
