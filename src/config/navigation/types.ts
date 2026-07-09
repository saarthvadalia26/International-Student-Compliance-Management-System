export interface NavItem {
  title: string;
  href: string;
  icon?: string; // Lucide icon identifier string
  items?: NavItem[];
}

export interface NavigationConfig {
  items: NavItem[];
}
