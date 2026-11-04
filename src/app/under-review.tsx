import { UnderReviewScreen } from '@/components/screens/under-review-screen';

/**
 * Only reachable for a guard whose profile an admin hasn't approved yet (see _layout.tsx). Once it
 * is approved the root layout's guard moves the guard to the home screen.
 */
export default function UnderReviewRoute() {
  return <UnderReviewScreen />;
}
