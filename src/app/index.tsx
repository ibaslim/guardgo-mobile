import { UnsupportedRoleScreen } from '@/components/screens/unsupported-role-screen';

/**
 * Only reachable when signed in with a role the mobile app doesn't support (see _layout.tsx).
 * Supported roles go straight to their area.
 */
export default function IndexScreen() {
  return <UnsupportedRoleScreen />;
}
