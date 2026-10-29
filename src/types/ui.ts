import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

/** Status badge colours, same set as the web badge.component.ts. */
export type BadgeKind = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

/** An icon as an SF Symbol (iOS) and a Material Symbol (Android, web). */
export type SymbolIcon = { sf: SFSymbol; md: AndroidSymbol };

/** Label, hint and error shown around every form field. */
export type FieldMeta = {
  label: string;
  /** Help text under the field. Hidden while there is an error. */
  hint?: string;
  error?: string;
  /** Adds "(optional)" to the label. Fields are required by default. */
  optional?: boolean;
  disabled?: boolean;
};
