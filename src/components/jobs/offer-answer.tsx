import { View } from 'react-native';

import { BlinkDot } from '@/components/ui/blink-dot';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useNow } from '@/hooks/use-now';
import type { GuardJob, JobAction } from '@/types/job';
import { awaitingAnswer, replyCountdown } from '@/utils/job-status';

const TABULAR = { fontVariant: ['tabular-nums' as const] };

/** "Reply in 1d 4h" with a dot, running down live. Amber when less than a day is left. Nothing when no answer is due. */
export function ReplyTimer({ job }: { job: Pick<GuardJob, 'dueAt' | 'status'> }) {
  const now = useNow(awaitingAnswer(job));
  const left = replyCountdown(job, now);
  if (!left) return null;

  return (
    <View className="min-w-0 flex-row items-center gap-2" accessibilityLiveRegion="none">
      <BlinkDot className={`size-2 rounded-full ${left.urgent ? 'bg-warning' : 'bg-primary'}`} />
      <Text variant="small" tone={left.urgent ? 'default' : 'secondary'} style={TABULAR} numberOfLines={1} className="shrink">
        {left.text}
      </Text>
    </View>
  );
}

export type AnswerButtonsProps = {
  actions: JobAction[];
  busy: boolean;
  onAct: (action: JobAction) => void;
  /** Read out after each label, e.g. the job's title on a card in a list. */
  context?: string;
};

/**
 * The answers to an offer, side by side: the destructive one on the left in a red outline, the main one
 * on the right (where the thumb rests) a little wider. Labels are in capitals; screen readers get them as words.
 */
export function AnswerButtons({ actions, busy, onAct, context }: AnswerButtonsProps) {
  const ordered = [...actions].sort((a, b) => (a.kind === 'primary' ? 1 : 0) - (b.kind === 'primary' ? 1 : 0));

  return (
    <View className="flex-row gap-3">
      {ordered.map((action) => {
        const primary = action.kind === 'primary';
        return (
          <View key={action.status} className={primary ? 'flex-[1.4]' : 'flex-1'}>
            <Button
              title={action.label.toUpperCase()}
              accessibilityLabel={context ? `${action.label} ${context}` : action.label}
              icon={primary ? ICONS.check : action.kind === 'danger' ? ICONS.close : undefined}
              variant={primary ? 'primary' : action.kind === 'danger' ? 'dangerOutline' : 'secondary'}
              size="md"
              loading={busy && primary}
              disabled={busy}
              onPress={() => onAct(action)}
            />
          </View>
        );
      })}
    </View>
  );
}
