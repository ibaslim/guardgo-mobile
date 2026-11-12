import { FormTextField } from '@/components/form/form-fields';
import type { RequestForm } from '@/components/requests/form/request-form-type';
import { FormSection } from '@/components/ui/form-section';
import { ICONS } from '@/constants/icons';

/** Where invoices and receipts for the job are emailed. */
export function BillingSection({ form }: { form: RequestForm }) {
  return (
    <FormSection title="Invoices" description="Invoices and payment receipts for this job are emailed here.">
      <FormTextField
        control={form.control}
        name="invoice_email"
        label="Invoice email"
        placeholder="accounts@example.com"
        icon={ICONS.mail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />
    </FormSection>
  );
}
