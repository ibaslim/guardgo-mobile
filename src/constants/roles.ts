import type { AreaConfig, AreaTab, Role, RoleArea } from '@/types/roles';

/** Which part of the app each role uses. Roles missing here can't use the mobile app. */
export const ROLE_AREAS: Readonly<Record<Role, RoleArea>> = {
  guard_admin: 'guard',
  client_admin: 'client',
  sp_admin: 'provider',
  admin: 'platform',
  ops_admin: 'platform',
  support_admin: 'platform',
  compliance_admin: 'platform',
  read_only_admin: 'platform',
};

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  guard_admin: 'Guard',
  client_admin: 'Client',
  sp_admin: 'Service provider',
  admin: 'Platform admin',
  ops_admin: 'Operations admin',
  support_admin: 'Support admin',
  compliance_admin: 'Compliance admin',
  read_only_admin: 'Read-only admin',
};

/** Home route of each area. Must match the folders in src/app. */
export const AREA_HOME = {
  guard: '/guard',
  client: '/client',
  provider: '/provider',
  platform: '/platform',
} as const satisfies Record<RoleArea, string>;

export const ROLE_AREA_NAMES = Object.keys(AREA_HOME) as RoleArea[];

const accountTab: AreaTab = {
  name: 'account',
  title: 'Account',
  icon: { sf: 'person.crop.circle', md: 'account_circle' },
  description: 'Your profile, appearance and sign out.',
};

const homeTab = (description: string): AreaTab => ({
  name: 'index',
  title: 'Home',
  icon: { sf: 'house', md: 'home' },
  description,
});

// Placeholder content until the screens are built. Tabs follow the web dashboard menu per role.
export const AREA_CONFIGS: Readonly<Record<RoleArea, AreaConfig>> = {
  guard: {
    label: 'Guard',
    focus: { title: 'Next shift', empty: 'No upcoming shifts. Shifts appear here once a job is assigned to you.' },
    tabs: [
      homeTab('Your next shift and recent activity.'),
      { name: 'jobs', title: 'Jobs', icon: { sf: 'briefcase', md: 'work' }, description: 'Jobs offered and assigned to you.' },
      { name: 'leaves', title: 'Leaves', icon: { sf: 'calendar', md: 'event_busy' }, description: 'Request time off and see its status.' },
      { name: 'invoices', title: 'Invoices', icon: { sf: 'doc.text', md: 'receipt_long' }, description: 'Payouts for completed shifts.' },
      accountTab,
    ],
  },
  client: {
    label: 'Client',
    focus: { title: 'Open requests', empty: 'No open requests. Requests you create show their staffing status here.' },
    tabs: [
      homeTab('Open requests and recent activity.'),
      { name: 'requests', title: 'Requests', icon: { sf: 'tray.full', md: 'assignment' }, description: 'Create guard requests and track who is assigned.' },
      { name: 'notifications', title: 'Alerts', icon: { sf: 'bell', md: 'notifications' }, description: 'Updates about your requests and sites.' },
      accountTab,
    ],
  },
  provider: {
    label: 'Service provider',
    focus: { title: 'Requests to staff', empty: 'Nothing to staff right now. New requests for your guards appear here.' },
    tabs: [
      homeTab('Requests to staff and guard activity.'),
      { name: 'requests', title: 'Requests', icon: { sf: 'tray.full', md: 'assignment' }, description: 'Requests sent to your company and their assignments.' },
      { name: 'guards', title: 'My guards', icon: { sf: 'person.2', md: 'groups' }, description: 'Guards in your company and their availability.' },
      { name: 'invoices', title: 'Invoices', icon: { sf: 'doc.text', md: 'receipt_long' }, description: 'Payouts for completed work.' },
      accountTab,
    ],
  },
  platform: {
    label: 'Platform',
    focus: { title: 'Needs review', empty: 'Nothing waiting for review. Tenants and requests that need action appear here.' },
    tabs: [
      homeTab('Items waiting for review across the platform.'),
      { name: 'tenants', title: 'Tenants', icon: { sf: 'building.2', md: 'apartment' }, description: 'Guard, client and service provider accounts.' },
      { name: 'requests', title: 'Requests', icon: { sf: 'tray.full', md: 'assignment' }, description: 'All requests and their staffing status.' },
      { name: 'finance', title: 'Finance', icon: { sf: 'chart.bar', md: 'payments' }, description: 'Invoices and payouts across tenants.' },
      accountTab,
    ],
  },
};
