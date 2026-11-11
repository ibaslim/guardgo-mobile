import type { ToastVariant } from '@/types/ui';

export type ToastMessage = { id: number; variant: ToastVariant; message: string };

let current: ToastMessage | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function set(value: ToastMessage | null) {
  current = value;
  listeners.forEach((listener) => listener());
}

export const subscribeToast = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const getToast = () => current;

/** Shows a toast at the bottom of the screen, replacing any toast already showing. */
export function showToast(variant: ToastVariant, message: string) {
  set({ id: nextId++, variant, message });
}

export function hideToast(id?: number) {
  if (id === undefined || current?.id === id) set(null);
}

export const toast = {
  success: (message: string) => showToast('success', message),
  warning: (message: string) => showToast('warning', message),
  failure: (message: string) => showToast('failure', message),
  hide: hideToast,
};
