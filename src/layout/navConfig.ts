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

export const mobileNavItems: NavItem[] = [
  ...mainNavItems.slice(0, 4),
  { icon: Settings, labelKey: 'tabs.settings', path: '/settings' },
];
