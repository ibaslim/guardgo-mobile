import { Redirect } from 'expo-router';

import { UnsupportedRoleScreen } from '@/components/screens/unsupported-role-screen';
import { AREA_HOME } from '@/constants/roles';
import { useRoleArea } from '@/hooks/use-session';

/** Entry point after login: sends the user to their role's area. */
export default function IndexScreen() {
  const area = useRoleArea();
  if (area) {
    return <Redirect href={AREA_HOME[area]} />;
  }
  return <UnsupportedRoleScreen />;
}
