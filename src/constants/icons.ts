import type { SymbolIcon } from '@/types/ui';

/** Icons used by the shared UI components. */
export const ICONS = {
  calendar: { sf: 'calendar', md: 'calendar_today' },
  clock: { sf: 'clock', md: 'schedule' },
  chevronDown: { sf: 'chevron.down', md: 'expand_more' },
  chevronUpDown: { sf: 'chevron.up.chevron.down', md: 'unfold_more' },
  user: { sf: 'person', md: 'person' },
  lock: { sf: 'lock', md: 'lock' },
  mail: { sf: 'envelope', md: 'mail' },
  location: { sf: 'mappin.and.ellipse', md: 'location_on' },
  note: { sf: 'text.alignleft', md: 'notes' },
  eye: { sf: 'eye', md: 'visibility' },
  eyeOff: { sf: 'eye.slash', md: 'visibility_off' },
  search: { sf: 'magnifyingglass', md: 'search' },
  check: { sf: 'checkmark', md: 'check' },
  close: { sf: 'xmark', md: 'close' },
  clear: { sf: 'xmark.circle.fill', md: 'cancel' },
  error: { sf: 'exclamationmark.circle', md: 'error' },
  camera: { sf: 'camera', md: 'photo_camera' },
  library: { sf: 'photo.on.rectangle', md: 'photo_library' },
  trash: { sf: 'trash', md: 'delete' },
  shield: { sf: 'shield.lefthalf.filled', md: 'shield' },
  server: { sf: 'server.rack', md: 'dns' },
} as const satisfies Record<string, SymbolIcon>;
