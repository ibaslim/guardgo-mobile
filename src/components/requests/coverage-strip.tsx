import { View } from 'react-native';

// Up to this many positions each get their own segment. Beyond it, segments would be too thin to tell apart.
const MAX_SEGMENTS = 12;

export type CoverageStripProps = {
  /** Positions already covered. */
  filled: number;
  /** Positions the job needs. */
  required: number;
  /** Draws the covered positions in a neutral tone, for an offer that has run out. */
  muted?: boolean;
};

/**
 * How many of the job's guard positions are covered: one segment per position, solid when covered.
 * A large job falls back to one continuous bar. Shared by the client, guard and provider lists.
 */
export function CoverageStrip({ filled, required, muted = false }: CoverageStripProps) {
  const total = Math.max(required, 0);
  const done = Math.min(Math.max(filled, 0), total);
  const fill = muted ? 'bg-border-strong' : 'bg-primary';

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Positions covered"
      accessibilityValue={{ min: 0, max: total, now: done }}>
      {total > 0 && total <= MAX_SEGMENTS ? (
        <View className="flex-row gap-1">
          {Array.from({ length: total }, (_, index) => (
            <View key={index} className={`h-1.5 flex-1 rounded-full ${index < done ? fill : 'bg-border'}`} />
          ))}
        </View>
      ) : (
        <View className="h-1.5 overflow-hidden rounded-full bg-border">
          <View className={`h-full rounded-full ${fill}`} style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
        </View>
      )}
    </View>
  );
}
