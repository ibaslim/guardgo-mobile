import { BADGE_KEYWORD_KINDS } from '@/constants/badge';
import type { BadgeKind } from '@/types/ui';

// Longest first, so "inactive" wins over "active" and "unverified" over "verified".
const keywords = Object.keys(BADGE_KEYWORD_KINDS).sort((a, b) => b.length - a.length);

/** Picks a badge colour from a status label, like the web app. Unmatched labels are `primary`. */
export function badgeKindFor(label: string): BadgeKind {
  const text = (label || '').toLowerCase();
  const keyword = keywords.find((key) => text.includes(key));
  return keyword ? BADGE_KEYWORD_KINDS[keyword] : 'primary';
}
