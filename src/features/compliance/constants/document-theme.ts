export type ComplianceDocumentType = "passport" | "visa" | "efrro";

export interface DocumentTheme {
  type: ComplianceDocumentType;
  label: string;
  shortLabel: string;
  title: string;
  // Core Accent Classes
  accentColor: string;
  accentText: string;
  accentHeading: string;
  // Background & Borders
  bgSoft: string;
  bgHover: string;
  border: string;
  borderSoft: string;
  borderHover: string;
  // Indicators & Badges
  dotClass: string;
  iconClass: string;
  iconContainerClass: string;
  badgeClass: string;
  badgeActiveClass: string;
  // Informational / Metadata Banner
  bannerClass: string;
  bannerIconClass: string;
  bannerTitleClass: string;
  // Tabs & Buttons
  tabActiveClass: string;
  buttonOutlineClass: string;
  ringClass: string;
}

export const DOCUMENT_THEMES: Record<ComplianceDocumentType, DocumentTheme> = {
  passport: {
    type: "passport",
    label: "Passport",
    shortLabel: "PASSPORT",
    title: "Passport Document",
    accentColor: "text-blue-600 dark:text-blue-400",
    accentText: "text-blue-700 dark:text-blue-300",
    accentHeading: "text-blue-900 dark:text-blue-100",
    bgSoft: "bg-blue-500/10 dark:bg-blue-500/15",
    bgHover: "hover:bg-blue-500/10",
    border: "border-blue-500/30 dark:border-blue-500/30",
    borderSoft: "border-blue-500/20 dark:border-blue-500/20",
    borderHover: "hover:border-blue-500/50",
    dotClass: "bg-blue-500 dark:bg-blue-400",
    iconClass: "text-blue-500 dark:text-blue-400",
    iconContainerClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    badgeActiveClass: "bg-blue-600 text-white shadow-xs",
    bannerClass: "bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200",
    bannerIconClass: "text-blue-600 dark:text-blue-400",
    bannerTitleClass: "text-blue-800 dark:text-blue-300",
    tabActiveClass: "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10 shadow-xs",
    buttonOutlineClass: "border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10",
    ringClass: "ring-blue-500/30"
  },
  visa: {
    type: "visa",
    label: "Visa",
    shortLabel: "VISA",
    title: "Visa Permit",
    accentColor: "text-purple-600 dark:text-purple-400",
    accentText: "text-purple-700 dark:text-purple-300",
    accentHeading: "text-purple-900 dark:text-purple-100",
    bgSoft: "bg-purple-500/10 dark:bg-purple-500/15",
    bgHover: "hover:bg-purple-500/10",
    border: "border-purple-500/30 dark:border-purple-500/30",
    borderSoft: "border-purple-500/20 dark:border-purple-500/20",
    borderHover: "hover:border-purple-500/50",
    dotClass: "bg-purple-500 dark:bg-purple-400",
    iconClass: "text-purple-500 dark:text-purple-400",
    iconContainerClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
    badgeActiveClass: "bg-purple-600 text-white shadow-xs",
    bannerClass: "bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200",
    bannerIconClass: "text-purple-600 dark:text-purple-400",
    bannerTitleClass: "text-purple-800 dark:text-purple-300",
    tabActiveClass: "border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10 shadow-xs",
    buttonOutlineClass: "border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10",
    ringClass: "ring-purple-500/30"
  },
  efrro: {
    type: "efrro",
    label: "eFRRO",
    shortLabel: "eFRRO",
    title: "eFRRO / Residential Permit",
    accentColor: "text-amber-600 dark:text-amber-400",
    accentText: "text-amber-700 dark:text-amber-300",
    accentHeading: "text-amber-900 dark:text-amber-100",
    bgSoft: "bg-amber-500/10 dark:bg-amber-500/15",
    bgHover: "hover:bg-amber-500/10",
    border: "border-amber-500/30 dark:border-amber-500/30",
    borderSoft: "border-amber-500/20 dark:border-amber-500/20",
    borderHover: "hover:border-amber-500/50",
    dotClass: "bg-amber-500 dark:bg-amber-400",
    iconClass: "text-amber-500 dark:text-amber-400",
    iconContainerClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    badgeActiveClass: "bg-amber-600 text-white shadow-xs",
    bannerClass: "bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200",
    bannerIconClass: "text-amber-600 dark:text-amber-400",
    bannerTitleClass: "text-amber-800 dark:text-amber-300",
    tabActiveClass: "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 shadow-xs",
    buttonOutlineClass: "border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
    ringClass: "ring-amber-500/30"
  }
};

export function getDocumentTheme(type?: string | null): DocumentTheme {
  const norm = (type || "").toLowerCase().trim();
  if (norm === "passport") return DOCUMENT_THEMES.passport;
  if (norm === "visa") return DOCUMENT_THEMES.visa;
  if (norm === "efrro" || norm === "residential_permit" || norm === "efrro_residential_permit") return DOCUMENT_THEMES.efrro;
  return DOCUMENT_THEMES.passport;
}

export function getDocumentBadgeClass(type?: string | null): string {
  const norm = (type || "").toLowerCase().trim();
  if (norm === "passport") return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
  if (norm === "visa") return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
  if (norm === "efrro" || norm === "residential_permit" || norm === "efrro_residential_permit") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  if (norm === "general") return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
  return "bg-muted text-muted-foreground border-border";
}
