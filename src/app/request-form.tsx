import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { EditHeading } from "@/components/account/edit-step-shell";
import { BillingSection } from "@/components/requests/form/billing-section";
import { JobSection } from "@/components/requests/form/job-section";
import { SiteSection } from "@/components/requests/form/site-section";
import { WhenSection } from "@/components/requests/form/when-section";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormScrollView } from "@/components/ui/form-scroll-view";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useApiForm } from "@/hooks/use-api-form";
import { useClientMetadata } from "@/hooks/use-client-metadata";
import { useGuardMetadata } from "@/hooks/use-guard-metadata";
import {
  publishIssues,
  REQUEST_FORM_DEFAULTS,
  requestFormSchema,
} from "@/schemas/request-form";
import { getAccount } from "@/services/account";
import {
  createRequest,
  getRequest,
  getRequestSchedule,
  publishRequest,
  publishRequestUpdate,
  requestsErrorMessage,
  saveRequestSchedule,
  updateRequest,
} from "@/services/requests";
import { toast } from "@/services/toast";
import type { ClientMetadata, MetadataOption } from "@/types/onboarding";
import type { RequestSchedule, SavedSite } from "@/types/request";
import type { RequestFormValues } from "@/types/request-form";
import { repeats } from "@/utils/request-form";
import {
  buildRequestPayload,
  buildSchedulePayload,
  buildUpdatePayload,
  formFromRequest,
  savedSitesFrom,
} from "@/utils/request-payload";

type Loaded = {
  savedSites: SavedSite[];
  /** The values to start from, and the id and repeat pattern of the draft being edited. */
  initial: RequestFormValues;
  requestId: string | null;
  /** The schedule the draft already has, so saving its repeat keeps the attendance rules set for it. */
  schedule: RequestSchedule | null;
  invoiceEmail: string;
};

type BodyProps = {
  /** Changing a request that is already out, rather than a draft. */
  updating: boolean;
  loaded: Loaded;
  metadata: ClientMetadata | null;
  guardTypes: readonly MetadataOption[];
};

/** The form itself, once the client's sites (and the draft, when editing) have loaded. */
function RequestFormBody({
  updating,
  loaded,
  metadata,
  guardTypes,
}: BodyProps) {
  const editing = loaded.requestId !== null;
  const form = useApiForm({
    schema: requestFormSchema,
    defaultValues: loaded.initial,
  });
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // The draft's id once it exists, so a retry after a half-finished save updates it instead of making another.
  const [draftId, setDraftId] = useState(loaded.requestId);
  const [scheduleSaved, setScheduleSaved] = useState(loaded.schedule !== null);

  const title = updating
    ? "Update request"
    : editing
      ? "Edit request"
      : "New request";

  /** Saves the draft (and its repeat pattern), then publishes when asked. Returns true when it all went through. */
  async function persist(values: RequestFormValues, publish: boolean) {
    if (values.site_source === "saved") {
      const site = loaded.savedSites.find(
        (item) => String(item.index) === values.saved_site,
      );
      if (site && !site.hasCoordinates) {
        form.setError("saved_site", {
          message:
            "This site has no location. Add one in your profile, or enter a new address.",
        });
        toast.warning("Some details need your attention.");
        return false;
      }
    }

    setBusy(publish || updating ? "publish" : "draft");
    // True once this attempt has created the draft, so a later failure can say it was kept.
    let created = false;
    try {
      if (updating && loaded.requestId) {
        await publishRequestUpdate(
          loaded.requestId,
          buildUpdatePayload(values, metadata),
        );
        toast.success("Update sent.");
        router.back();
        return true;
      }

      const payload = buildRequestPayload(values, metadata);
      let id = draftId;
      if (id) {
        await updateRequest(id, payload);
      } else {
        id = await createRequest(payload);
        created = true;
        setDraftId(id);
      }

      if (repeats(values)) {
        await saveRequestSchedule(
          id,
          buildSchedulePayload(values, loaded.schedule),
          scheduleSaved,
        );
        setScheduleSaved(true);
      }
      if (publish) await publishRequest(id);

      toast.success(publish ? "Request published." : "Draft saved.");
      router.back();
      return true;
    } catch (failure) {
      toast.failure(
        requestsErrorMessage(
          failure,
          publish
            ? "Couldn't publish the request."
            : "Couldn't save the draft.",
        ) + (created ? " Your draft was saved: try again to continue." : ""),
      );
      return false;
    } finally {
      setBusy(null);
    }
  }

  const invalid = () => toast.warning("Some details need your attention.");

  const saveDraft = form.handleSubmit(
    (values) => persist(values, false),
    invalid,
  );
  const saveUpdate = form.handleSubmit(
    (values) => persist(values, true),
    invalid,
  );

  // Publishing sends offers out, so check the extra rules and ask first.
  const askToPublish = form.handleSubmit((values) => {
    const issues = publishIssues(values);
    const fields = Object.keys(issues) as (keyof RequestFormValues)[];
    if (fields.length > 0) {
      for (const field of fields)
        form.setError(field, { message: issues[field] });
      invalid();
      return;
    }
    setConfirmOpen(true);
  }, invalid);

  return (
    <Screen>
      <EditHeading title={title} />
      <FormScrollView
        contentContainerStyle={{ gap: 20, padding: 20, paddingBottom: 40 }}
      >
        <JobSection form={form} guardTypes={guardTypes} locked={updating} />
        <SiteSection
          form={form}
          metadata={metadata}
          savedSites={editing ? [] : loaded.savedSites}
        />
        <WhenSection form={form} allowRepeat={!updating} />
        <BillingSection form={form} />

        <View className="gap-3">
          {updating ? null : (
            <Button
              title="Save draft"
              variant="secondary"
              size="lg"
              onPress={() => saveDraft()}
              loading={busy === "draft"}
              disabled={busy !== null}
            />
          )}
          <Button
            title={updating ? "Publish update" : "Publish"}
            size="lg"
            onPress={() => (updating ? saveUpdate() : askToPublish())}
            loading={busy === "publish"}
            disabled={busy !== null}
          />
          <Text variant="small" tone="muted" className="text-center">
            {updating
              ? "Matching guards are offered the changed job. Their earlier answers may need to be confirmed again."
              : "Publishing sends the job to matching guards. A draft stays private until you publish it."}
          </Text>
        </View>
      </FormScrollView>

      <ConfirmDialog
        visible={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Publish this request?"
        message="Matching guards will be offered the job. You can still add coverage or cancel it afterwards."
        confirmLabel="Publish"
        onConfirm={async () => {
          await form.handleSubmit((values) => persist(values, true))();
        }}
      />
    </Screen>
  );
}

/**
 * Create a job request, or edit a draft (`?id=`). One long form of sections: the job, the site (a
 * saved one or a new address), when it runs and whether it repeats, and where to send invoices.
 */
export default function RequestFormScreen() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const updating = Boolean(id) && mode === "update";
  const { metadata, failed: metadataFailed, retry } = useClientMetadata();
  const { metadata: guardMetadata } = useGuardMetadata();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Editing waits for the province and city lists, to match the saved address to them.
    if (id && !metadata) return;
    let active = true;
    (async () => {
      const account = await getAccount();
      const savedSites = savedSitesFrom(account.tenant.profile);
      // New requests start with the invoice email the account already uses.
      const billingEmail = String(account.user.email ?? "");
      if (!id) {
        return {
          savedSites,
          initial: { ...REQUEST_FORM_DEFAULTS, invoice_email: billingEmail },
          requestId: null,
          schedule: null,
          invoiceEmail: billingEmail,
        };
      }
      const [request, schedule] = await Promise.all([
        getRequest(id),
        getRequestSchedule(id),
      ]);
      return {
        savedSites,
        initial: formFromRequest(request, schedule, metadata),
        requestId: id,
        schedule,
        invoiceEmail: request.invoiceEmail,
      };
    })()
      .then((result) => {
        if (!active) return;
        setLoaded(result);
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id, metadata, attempt]);

  const guardTypes = useMemo(
    () => guardMetadata?.guardTypeOptions ?? [],
    [guardMetadata],
  );

  if (failed || metadataFailed) {
    return (
      <Screen>
        <EditHeading title={id ? "Edit request" : "New request"} />
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            Could not load the form
          </Text>
          <Text tone="secondary" className="text-center">
            Check your connection and try again.
          </Text>
          <Button
            title="Try again"
            variant="secondary"
            onPress={() => {
              if (metadataFailed) retry();
              setAttempt((count) => count + 1);
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!loaded) {
    return (
      <Screen>
        <EditHeading title={id ? "Edit request" : "New request"} />
        <View
          className="flex-1 items-center justify-center gap-3"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <RequestFormBody
      updating={updating}
      loaded={loaded}
      metadata={metadata}
      guardTypes={guardTypes}
    />
  );
}
