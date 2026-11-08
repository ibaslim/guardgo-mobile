/**
 * The sections of a saved profile, one per onboarding step, that the Account screen lists and that
 * can be opened to see and update them. The keys are the step keys of each onboarding flow's schema
 * (GUARD_STEP_FIELDS, PROVIDER_STEP_FIELDS, CLIENT_STEP_FIELDS), so a section checks the same fields
 * as its onboarding step.
 */
export const GUARD_PROFILE_STEPS = [
  { key: 'you', title: 'You & contact' },
  { key: 'home', title: 'Home' },
  { key: 'work', title: 'Work area' },
  { key: 'identity', title: 'Identity' },
  { key: 'licenses', title: 'Licenses' },
  { key: 'training', title: 'Training' },
  { key: 'availability', title: 'Availability' },
] as const;

export const PROVIDER_PROFILE_STEPS = [
  { key: 'company', title: 'Company' },
  { key: 'head', title: 'Head office' },
  { key: 'contacts', title: 'Contacts' },
  { key: 'licenses', title: 'Licenses' },
  { key: 'coverage', title: 'Coverage' },
] as const;

/** The client's account type (individual or company) is chosen once, so it is not a section here. */
export const CLIENT_PROFILE_STEPS = [
  { key: 'identity', title: 'Details' },
  { key: 'contacts', title: 'Contacts' },
  { key: 'billing', title: 'Billing' },
  { key: 'sites', title: 'Sites' },
] as const;

export type GuardProfileStep = (typeof GUARD_PROFILE_STEPS)[number]['key'];
export type ProviderProfileStep = (typeof PROVIDER_PROFILE_STEPS)[number]['key'];
export type ClientProfileStep = (typeof CLIENT_PROFILE_STEPS)[number]['key'];
