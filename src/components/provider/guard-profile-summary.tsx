import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { DocumentPreview } from '@/components/provider/document-preview';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { TenantImage } from '@/services/tenant';
import type { GuardMetadata, GuardOnboardingValues, UploadedFile } from '@/types/guard-onboarding';
import type { MetadataOption } from '@/types/onboarding';
import { formatDate } from '@/utils/format';
import { cityLabelFor } from '@/utils/profile';

type Row = { label: string; value?: string | null; node?: ReactNode };

const labelOf = (options: readonly MetadataOption[], value: string | null | undefined) =>
  options.find((option) => option.value === value)?.label ?? value ?? '';

const dateText = (date: Date | null) => (date ? formatDate(date) : '');

/** A titled card of label and value rows. Rows without a value are left out, and a card with none is not shown. */
function InfoCard({ title, rows }: { title: string; rows: Row[] }) {
  const shown = rows.filter((row) => row.value || row.node);
  if (shown.length === 0) return null;

  return (
    <Card title={title}>
      <View className="gap-3 p-4">
        {shown.map((row) => (
          <View key={row.label} className="gap-0.5">
            <Text variant="caption" tone="muted">
              {row.label}
            </Text>
            {row.node ?? <Text variant="small">{row.value}</Text>}
          </View>
        ))}
      </View>
    </Card>
  );
}

/** The document's picture (tap to enlarge), or "No file" when none was uploaded. */
const fileRow = (file: UploadedFile | null, title: string): Row =>
  file ? { label: 'File', node: <DocumentPreview file={file} title={title} /> } : { label: 'File', value: 'No file' };

export type GuardProfileSummaryProps = {
  /** The guard's saved profile (see `parseGuardProfile`). */
  values: Partial<GuardOnboardingValues>;
  metadata: GuardMetadata;
  /** The guard's uploaded profile photo, when they have one. */
  photo?: TenantImage | null;
};

/** The guard's profile photo, square, in the personal details card. */
function ProfilePhoto({ photo }: { photo: TenantImage }) {
  return (
    <View className="h-28 w-28 overflow-hidden rounded-2xl border border-border bg-surface-muted">
      <Image
        source={{ uri: photo.uri, headers: photo.headers }}
        contentFit="cover"
        transition={150}
        accessibilityLabel="Profile photo"
        accessibilityIgnoresInvertColors
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}

/** What a guard entered in onboarding, read-only, one card per section. */
export function GuardProfileSummary({ values, metadata, photo }: GuardProfileSummaryProps) {
  const cities = metadata.canadianCitiesByProvince;
  const provinces = metadata.canadianProvinces;

  const secondary = [values.secondary_name, values.secondary_email, values.secondary_phone].filter(Boolean).join(' · ');
  const address = [
    values.street,
    values.city && values.province ? cityLabelFor(cities, values.province, values.city) : '',
    labelOf(provinces, values.province),
    values.postal_code,
  ]
    .filter(Boolean)
    .join(', ');
  const guardTypes = (values.preferred_guard_types ?? []).map((type) => labelOf(metadata.guardTypeOptions, type)).join(', ');

  return (
    <View className="gap-4">
      <InfoCard
        title="Personal details"
        rows={[
          { label: 'Profile photo', node: photo ? <ProfilePhoto photo={photo} /> : undefined },
          { label: 'Full name', value: values.full_name },
          { label: 'Date of birth', value: dateText(values.date_of_birth ?? null) },
          { label: 'Mobile phone', value: values.mobile_phone },
          { label: 'Landline', value: values.landline_phone },
          { label: 'Emergency contact', value: secondary },
        ]}
      />

      <InfoCard title="Home address" rows={[{ label: 'Address', value: address }]} />

      {(values.identification ?? [])
        .filter((doc) => doc.document_type || doc.number)
        .map((doc, index) => (
          <InfoCard
            key={`identity-${index}`}
            title={index === 0 ? 'Identity document' : `Identity document ${index + 1}`}
            rows={[
              { label: 'Type', value: labelOf(metadata.identityDocumentTypes, doc.document_type) },
              { label: 'Number', value: doc.number },
              { label: 'Province', value: doc.province ? labelOf(provinces, doc.province) : '' },
              { label: 'Expires', value: dateText(doc.expiry_date) },
              fileRow(doc.file, 'Identity document'),
            ]}
          />
        ))}

      {(values.security_licenses ?? [])
        .filter((license) => license.license_number)
        .map((license, index) => (
          <InfoCard
            key={`license-${index}`}
            title={index === 0 ? 'Security license' : `Security license ${index + 1}`}
            rows={[
              { label: 'Name on license', value: license.full_legal_name },
              { label: 'Number', value: license.license_number },
              { label: 'Type', value: labelOf(metadata.securityLicenseTypes, license.license_type) },
              { label: 'Issued by', value: [license.issuing_authority, labelOf(provinces, license.issuing_province)].filter(Boolean).join(', ') },
              { label: 'Issued', value: dateText(license.issue_date) },
              { label: 'Expires', value: dateText(license.expiry_date) },
              fileRow(license.file, 'Security license'),
            ]}
          />
        ))}

      {(values.police_clearances ?? [])
        .filter((record) => record.issuing_authority_type || record.reference_number)
        .map((record, index) => (
          <InfoCard
            key={`clearance-${index}`}
            title={index === 0 ? 'Police clearance' : `Police clearance ${index + 1}`}
            rows={[
              {
                label: 'Issued by',
                value:
                  record.issuing_authority_type === 'other'
                    ? record.issuing_authority_other
                    : labelOf(metadata.policeClearanceAuthorityTypes, record.issuing_authority_type),
              },
              { label: 'Province', value: record.issuing_province ? labelOf(provinces, record.issuing_province) : '' },
              {
                label: 'City',
                value:
                  record.issuing_city && record.issuing_province
                    ? cityLabelFor(cities, record.issuing_province, record.issuing_city)
                    : '',
              },
              { label: 'Reference number', value: record.reference_number },
              { label: 'Issued', value: dateText(record.issue_date) },
              fileRow(record.file, 'Police clearance'),
            ]}
          />
        ))}

      {(values.training_certificates ?? [])
        .filter((cert) => cert.certificate_name)
        .map((cert, index) => (
          <InfoCard
            key={`training-${index}`}
            title={index === 0 ? 'Training certificate' : `Training certificate ${index + 1}`}
            rows={[
              { label: 'Certificate', value: labelOf(metadata.trainingCertificateTypes, cert.certificate_name) },
              {
                label: 'Issued by',
                value:
                  cert.issuing_organization === 'other'
                    ? cert.issuing_organization_other
                    : labelOf(metadata.trainingIssuerOptionsMap[cert.certificate_name ?? ''] ?? [], cert.issuing_organization),
              },
              { label: 'Issued', value: dateText(cert.issue_date) },
              { label: 'Expires', value: dateText(cert.expiry_date) },
              fileRow(cert.file, 'Training certificate'),
            ]}
          />
        ))}

      <InfoCard title="Kind of work" rows={[{ label: 'Guard types', value: guardTypes }]} />
    </View>
  );
}
