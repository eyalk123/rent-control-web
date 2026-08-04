import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  Store,
  BarChart2,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
}

export const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: 'tabs.home',         path: '/home' },
  { icon: Building2,       labelKey: 'tabs.properties',   path: '/properties' },
  { icon: Users,           labelKey: 'tabs.renters',      path: '/renters' },
  { icon: Wallet,          labelKey: 'tabs.transactions',  path: '/transactions' },
  { icon: BarChart2,       labelKey: 'tabs.reports',      path: '/reports' },
];

export const bottomNavItems: NavItem[] = [
  { icon: Store,    labelKey: 'tabs.suppliers', path: '/suppliers' },
  { icon: Settings, labelKey: 'tabs.settings',  path: '/settings' },
];

// The bottom bar fits ~5 targets at 390px, but the app has 7 destinations. The first
// four are the primary tabs; everything else lives behind a "More" sheet so that
// Reports and Suppliers stay reachable on mobile (they previously were not).
export const mobileNavItems: NavItem[] = mainNavItems.slice(0, 4);

export const mobileMoreItems: NavItem[] = [
  { icon: BarChart2, labelKey: 'tabs.reports',   path: '/reports' },
  { icon: Store,     labelKey: 'tabs.suppliers', path: '/suppliers' },
  { icon: Settings,  labelKey: 'tabs.settings',  path: '/settings' },
];
