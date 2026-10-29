/** Saved choice from the IP Config screen. */
export type ServerConfig = {
  apiUrl: string;
};

/** Result of the IP Config screen's connection test. */
export type ConnectionStatus =
  | { kind: 'idle' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };
