import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Entrance } from "@/components/ui/entrance";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { ICONS } from "@/constants/icons";
import { ApiError } from "@/services/api";
import {
  AuthError,
  hasVerificationCredentials,
  resendVerificationEmail,
  setVerificationCredentials,
} from "@/services/auth";

/** The server sends one confirmation email per minute per account. */
const RESEND_COOLDOWN_SECONDS = 60;

const STEPS = [
  {
    title: "Open the email",
    detail:
      "It comes from GuardGo. Check your spam folder if it is not in your inbox.",
  },
  {
    title: "Tap the confirmation link",
    detail: "It opens a page in your browser that confirms your email.",
  },
  { title: "Come back and sign in", detail: "Use your username and password." },
] as const;

function resendErrorMessage(error: unknown) {
  if (error instanceof AuthError) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 429)
      return "You asked for an email a moment ago. Wait a minute, then try again.";
    if (error.status === 0 || error.status === 408)
      return "Couldn't reach GuardGo. Check your connection and try again.";
    if (error.status === 401)
      return "Your sign-in details no longer match. Go back and sign in again.";
  }
  return "Couldn't send the email. Try again in a minute.";
}

/**
 * Shown until a new account's email is confirmed: right after registering (`reason` is empty), or
 * when a sign-in was refused because the email isn't confirmed (`reason=sign-in`). Either way the
 * user can ask for a new link.
 */
export default function VerifyEmailScreen() {
  const { email, reason } = useLocalSearchParams<{
    email?: string;
    reason?: string;
  }>();
  const fromSignIn = reason === "sign-in";

  // After registering, an email has just been sent, so the first resend has to wait.
  const [cooldown, setCooldown] = useState(
    fromSignIn ? 0 : RESEND_COOLDOWN_SECONDS,
  );
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canResend] = useState(hasVerificationCredentials);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      setSentTo(
        (await resendVerificationEmail()) ?? email ?? "your email address",
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (caught) {
      setError(resendErrorMessage(caught));
      if (caught instanceof ApiError && caught.status === 429)
        setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setSending(false);
    }
  }, [email]);

  const address = sentTo ?? email;

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="gap-7 px-6 pb-6 pt-8"
        showsVerticalScrollIndicator={false}
      >
        <Entrance step={0}>
          <View className="gap-2">
            <Text variant="title" accessibilityRole="header">
              {fromSignIn ? "Confirm your email" : "Check your email"}
            </Text>
            <Text tone="secondary">
              {fromSignIn
                ? "Your account is ready as soon as you confirm your email."
                : "One tap on the link in this email and your account is ready."}
            </Text>
          </View>
        </Entrance>

        {/* A preview of the email to look for in the inbox. */}
        <Entrance step={1}>
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <View className="flex-row items-center gap-3 bg-primary-soft px-4 py-3.5">
              <View
                className="size-9 items-center justify-center rounded-full bg-primary"
                accessible={false}
              >
                <Icon
                  icon={ICONS.mailUnread}
                  size={18}
                  colorVar="--color-on-primary"
                />
              </View>
              <Text
                variant="label"
                tone="inherit"
                className="flex-1 text-primary-soft-content"
              >
                New email waiting for you
              </Text>
            </View>
            <View className="gap-3 p-4">
              <View className="flex-row gap-3">
                <Text variant="small" tone="muted" className="w-16">
                  From
                </Text>
                <Text variant="small" className="flex-1 font-sans-medium">
                  GuardGo
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text variant="small" tone="muted" className="w-16">
                  To
                </Text>
                <Text
                  variant="small"
                  className="flex-1 font-sans-medium"
                  selectable
                >
                  {address || "The email you signed up with"}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text variant="small" tone="muted" className="w-16">
                  Subject
                </Text>
                <Text variant="small" className="flex-1 font-sans-medium">
                  Confirm your email
                </Text>
              </View>
            </View>
            <View className="border-t border-border px-4 py-3">
              <Text variant="caption" tone="muted">
                Not there? Check your spam or junk folder.
              </Text>
            </View>
          </View>
        </Entrance>

        <Entrance step={2}>
          <View>
            {STEPS.map((step, index) => (
              <View key={step.title} className="flex-row gap-4">
                <View className="items-center">
                  <View
                    className="size-7 items-center justify-center rounded-full bg-primary-soft"
                    accessible={false}
                  >
                    <Text
                      variant="label"
                      tone="inherit"
                      className="text-primary-soft-content"
                    >
                      {index + 1}
                    </Text>
                  </View>
                  {index < STEPS.length - 1 ? (
                    <View className="w-0.5 flex-1 bg-border" />
                  ) : null}
                </View>
                <View
                  className={`flex-1 gap-0.5 ${index < STEPS.length - 1 ? "pb-5" : ""}`}
                >
                  <Text variant="label">{step.title}</Text>
                  <Text variant="small" tone="muted">
                    {step.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Entrance>

        <View className="gap-3">
          <View accessibilityLiveRegion="polite" className="min-h-5">
            {error ? (
              <Text variant="small" tone="danger">
                {error}
              </Text>
            ) : sentTo ? (
              <Text variant="small" tone="success">
                New email sent to {sentTo}.
              </Text>
            ) : (
              <Text variant="small" tone="muted">
                The link expires after 24 hours.
              </Text>
            )}
          </View>
          {canResend ? (
            <View className="flex-row flex-wrap items-center justify-center">
              <Text variant="small" tone="secondary">
                Didn&apos;t get the email?{" "}
              </Text>
              {cooldown > 0 || sending ? (
                // Waiting: the server sends one email a minute, so say when the link works again.
                <Text variant="label" tone="muted" accessibilityState={{ disabled: true }}>
                  {sending ? "Sending…" : `Resend in ${cooldown}s`}
                </Text>
              ) : (
                <Pressable
                  accessibilityRole="link"
                  hitSlop={12}
                  onPress={resend}
                  className="min-h-8 justify-center active:opacity-70"
                >
                  <Text variant="label" tone="link">
                    Resend email
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
          <Button
            title="Back to sign in"
            size="lg"
            onPress={() => {
              // The saved sign-in details are only needed while this screen is open.
              setVerificationCredentials(null);
              router.replace("/login");
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
