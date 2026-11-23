import type { AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

/** Status badge colours, same set as the web badge.component.ts. */
export type ToastVariant = 'success' | 'warning' | 'failure';

export type BadgeKind = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

/** An icon as an SF Symbol (iOS) and a Material Symbol (Android, web). */
export type SymbolIcon = { sf: SFSymbol; md: AndroidSymbol };

/** Label, hint and error shown around every form field. */
export type FieldMeta = {
  label: string;
  /** Help text under the field. Hidden while there is an error. */
  hint?: string;
  error?: string;
  /** Marks the field invalid (red box) without the message under it, when the form shows the message elsewhere. */
  hideErrorText?: boolean;
  /** Leaves the label off the field, for fields grouped under one label. It is still read aloud. */
  hideLabel?: boolean;
  /** A tighter box for half-width fields: no up/down arrows, so the value has the room. */
  compact?: boolean;
  /** Adds "(optional)" to the label. Fields are required by default. */
  optional?: boolean;
  disabled?: boolean;
};

export type ToastMessage = { id: number; variant: ToastVariant; message: string };
