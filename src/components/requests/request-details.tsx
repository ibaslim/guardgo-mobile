import { View } from 'react-native';

import { RequestCard } from '@/components/requests/request-card';
import { Card } from '@/components/ui/card';
import { InfoCard } from '@/components/ui/info-card';
import { Text } from '@/components/ui/text';
import type { RequestDetail, RequestWave } from '@/types/request';
import { formatDate, formatMoney, formatTime } from '@/utils/format';
import { FULFILLMENT_LABELS, WAVE_LABELS } from '@/utils/request-status';

const stamp = (date: Date | null) => (date ? `${formatDate(date)}, ${formatTime(date)}` : '');
const sentenceCase = (code: string) => {
  const text = code.replace(/_/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export type RequestDetailsProps = {
  request: RequestDetail;
  /** Offer rounds, newest first. Leave out when the viewer isn't shown them. */
  waves?: RequestWave[];
};

/**
 * Everything about one request, read-only: the summary card on top, then job, site, instructions,
 * price and offer rounds. The price card only appears when the server sent a price, which is for the
 * client. Shared by every role's request screen.
 */
export function RequestDetails({ request, waves }: RequestDetailsProps) {
  const price = request.pricing;
  const currency = price?.currency;

  return (
    <View className="gap-4">
      <RequestCard request={request} />

      <InfoCard
        title="Job"
        rows={[
          { label: 'Who can cover it', value: request.fulfillment ? FULFILLMENT_LABELS[request.fulfillment] : '' },
          { label: 'Guard type', value: sentenceCase(request.guardType) },
          { label: 'Guards needed', value: request.guardsRequired ? String(request.guardsRequired) : '' },
          { label: 'Respond by', value: stamp(request.expiresAt) },
          { label: 'Created', value: request.createdAt ? formatDate(request.createdAt) : '' },
          { label: 'Update', value: request.revision > 1 ? String(request.revision) : '' },
        ]}
      />

      <InfoCard
        title="Site"
        rows={[
          { label: 'Name', value: request.siteName },
          { label: 'Address', value: request.site.address },
          { label: 'Manager', value: request.site.contact },
          { label: 'Manager email', value: request.site.email },
        ]}
      />

      {request.instructions ? (
        <Card title="Special instructions">
          <View className="p-4">
            <Text variant="small">{request.instructions}</Text>
          </View>
        </Card>
      ) : null}

      {price ? (
        <InfoCard
          title="Price"
          rows={[
            { label: 'Hourly rate', value: price.hourlyRate !== null ? formatMoney(price.hourlyRate, currency) : '' },
            { label: 'Estimated hours', value: price.estimatedHours !== null ? String(price.estimatedHours) : '' },
            { label: 'Estimated total', value: price.estimatedTotal !== null ? formatMoney(price.estimatedTotal, currency) : '' },
            { label: 'Billing', value: sentenceCase(request.billingCycle) },
            { label: 'Invoices sent to', value: request.invoiceEmail },
          ]}
        />
      ) : null}

      {waves && waves.length > 0 ? (
        <InfoCard
          title="Offer rounds"
          rows={waves.map((wave) => ({
            label: `Round ${wave.number}`,
            value: `${WAVE_LABELS[wave.status] ?? sentenceCase(wave.status)}, ${wave.offers} ${wave.offers === 1 ? 'offer' : 'offers'}`,
          }))}
        />
      ) : null}
    </View>
  );
}
