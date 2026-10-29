/**
 * Small persistent app settings (server address, theme, ...), one JSON file per setting in the
 * app's document directory. Not for secrets. Keys live in constants/storage-keys.ts.
 */
import { File, Paths } from 'expo-file-system';

const settingFile = (name: string) => new File(Paths.document, `${name}.json`);

export async function readSetting<T>(name: string): Promise<T | null> {
  try {
    const file = settingFile(name);
    if (!file.exists) return null;
    return JSON.parse(await file.text()) as T;
  } catch (error) {
    console.warn(`Could not read the "${name}" setting.`, error);
    return null;
  }
}

export async function writeSetting<T>(name: string, value: T) {
  await settingFile(name).write(JSON.stringify(value));
}

export function removeSetting(name: string) {
  const file = settingFile(name);
  if (file.exists) file.delete();
}
