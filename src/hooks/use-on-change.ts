import { useEffect, useRef } from 'react';

/**
 * Runs `callback` with the new and the previous value when `value` changes after the first render,
 * not when the screen first shows with a value already filled in. Use it to clear a field that
 * depends on another one (a city after the province changes).
 */
export function useOnChange<V>(value: V, callback: (value: V, previous: V) => void) {
  const previous = useRef(value);
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (previous.current === value) return;
    const before = previous.current;
    previous.current = value;
    latest.current(value, before);
  }, [value]);
}
