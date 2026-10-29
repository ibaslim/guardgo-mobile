import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

/** Roles from the GuardGo API (`session.role`), same set as the web access-control.helper.ts. */
export type Role =
  | 'guard_admin'
  | 'client_admin'
  | 'sp_admin'
  | 'admin'
  | 'ops_admin'
  | 'support_admin'
  | 'compliance_admin'
  | 'read_only_admin';

/** Part of the app a role signs in to. Each one is a route folder in src/app with its own tabs. */
export type RoleArea = 'guard' | 'client' | 'provider' | 'platform';

export type AreaIcon = { sf: SFSymbol; md: AndroidSymbol };

/** A tab of a role area. `name` is the route file inside the area folder. */
export type AreaTab = {
  name: string;
  title: string;
  icon: AreaIcon;
  /** What the screen will show, used on the home screen and the placeholder screen. */
  description: string;
};

export type AreaConfig = {
  /** Shown under the username, e.g. "Guard". */
  label: string;
  /** The main thing this role checks on the home screen. */
  focus: { title: string; empty: string };
  /** Tabs in tab bar order. The first is the area's index route; Android allows at most 5. */
  tabs: readonly AreaTab[];
};
