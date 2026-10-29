import type { BadgeKind } from '@/types/ui';

/** Status keyword -> badge colour, same as the web badge.component.ts keywordMap(). */
export const BADGE_KEYWORD_KINDS: Readonly<Record<string, BadgeKind>> = {
  active: 'success',
  enabled: 'success',
  verified: 'success',
  ok: 'success',
  running: 'success',
  draft: 'secondary',
  unverified: 'secondary',
  banned: 'danger',
  suspended: 'danger',
  blocked: 'danger',
  deleted: 'danger',
  error: 'danger',
  failed: 'danger',
  rejected: 'danger',
  denied: 'danger',
  disable: 'danger',
  inactive: 'danger',
  warning: 'warning',
  attention: 'warning',
  caution: 'warning',
  onboarding: 'warning',
  pending_activation: 'warning',
  pending_verification: 'warning',
};
