export type RealtimeEvent = {
  /** "created" and "updated" are one notification; "read-all" is every one; "restored" is a (re)connect. */
  type: 'created' | 'updated' | 'read-all' | 'restored';
  id: string;
  /** Where it came from, e.g. "requests" or "leaves". Empty for "read-all" and "restored". */
  sourceModule: string;
};
