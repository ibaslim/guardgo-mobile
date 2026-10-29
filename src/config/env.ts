/**
 * Build-time environment values. Expo inlines EXPO_PUBLIC_* variables, and only when they are
 * referenced statically as `process.env.EXPO_PUBLIC_NAME`, so read them here and nowhere else.
 * These values are public: never put secrets in them.
 */
export const env = {
  /** Server from .env, used until the user picks another one on the IP Config screen. */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
} as const;
