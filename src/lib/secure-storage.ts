/**
 * Small secrets (the saved sign-in) in the Android keystore / iOS keychain, through expo-secure-store.
 * Anything that isn't secret belongs in lib/storage. Keys live in constants/storage-keys.ts.
 *
 * None of these throw: a device without secure storage (or a failed read) just means the user signs
 * in again. Values are never logged.
 */
import * as SecureStore from 'expo-secure-store';

// Not included in device backups or moved to a new device, and only readable while the phone is unlocked.
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function readSecret(key: string): Promise<string | null> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return null;
    return await SecureStore.getItemAsync(key, OPTIONS);
  } catch {
    console.warn(`Could not read "${key}" from secure storage.`);
    return null;
  }
}

export async function writeSecret(key: string, value: string) {
  try {
    if (!(await SecureStore.isAvailableAsync())) return;
    await SecureStore.setItemAsync(key, value, OPTIONS);
  } catch {
    console.warn(`Could not save "${key}" to secure storage.`);
  }
}

export async function removeSecret(key: string) {
  try {
    if (!(await SecureStore.isAvailableAsync())) return;
    await SecureStore.deleteItemAsync(key, OPTIONS);
  } catch {
    console.warn(`Could not remove "${key}" from secure storage.`);
  }
}
