/** Names of the settings saved with lib/storage. Changing one loses the saved value. */
export const STORAGE_KEYS = {
  serverConfig: 'server-config',
  theme: 'theme',
} as const;

/** Names of the secrets kept with lib/secure-storage (letters, digits, "." "-" "_" only). */
export const SECURE_STORAGE_KEYS = {
  /** The signed-in user's access token and session details. */
  session: 'guardgo.session',
} as const;
