import { ROLE_AREAS, ROLE_LABELS } from '@/constants/roles';
import type { Role, RoleArea } from '@/types/roles';

/** Lower-cases a role and drops an enum prefix ("UserRole.guard_admin"), like the web normalizeRole. */
export function normalizeRole(role: string | null | undefined): string {
  const raw = String(role ?? '').trim().toLowerCase();
  return raw.includes('.') ? (raw.split('.').pop() ?? '') : raw;
}

function isKnownRole(role: string): role is Role {
  return Object.hasOwn(ROLE_AREAS, role);
}

/** The app area for a role, or null if the mobile app doesn't support it. */
export function roleAreaFor(role: string | null | undefined): RoleArea | null {
  const normalized = normalizeRole(role);
  return isKnownRole(normalized) ? ROLE_AREAS[normalized] : null;
}

export function roleLabelFor(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  return isKnownRole(normalized) ? ROLE_LABELS[normalized] : normalized.replace(/_/g, ' ');
}
