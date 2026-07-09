import { NavigationConfig } from "./types";

export const mobileNavigation: NavigationConfig = {
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
