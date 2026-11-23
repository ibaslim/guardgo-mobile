import { useCallback, useEffect, useState } from 'react';

import { guardsErrorMessage, searchProviderGuards } from '@/services/provider-guards';
import { toast } from '@/services/toast';
import type { ProviderGuardsPage } from '@/types/provider-guard';

const SEARCH_DELAY_MS = 350;

type Result = { term: string; page: ProviderGuardsPage };

/**
 * Searches the provider's guards by name or email as the user types, after a short pause. `searching`
 * is true while the box holds text. `data` is the matches for what is typed now, or null while they
 * load, so an answer to an older search never shows under a newer one. More pages load with `loadMore`.
 */
export function useGuardSearch(query: string) {
  const term = query.trim();
  const [settled, setSettled] = useState(term);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<{ term: string; message: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Wait for a pause in typing. Clearing the box takes effect at once.
  useEffect(() => {
    const timer = setTimeout(() => setSettled(term), term ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (!settled) return;
    let live = true;
    searchProviderGuards(1, settled).then(
      (page) => {
        if (!live) return;
        setResult({ term: settled, page });
        setError(null);
      },
      (failure) => live && setError({ term: settled, message: guardsErrorMessage(failure, "Couldn't search your guards. Try again.") })
    );
    return () => {
      live = false;
    };
  }, [settled]);

  // Answers are kept with the search they belong to, so one for an older search is never shown.
  const data = result && result.term === term ? result.page : null;
  const searchError = error && error.term === term ? error.message : null;

  const loadMore = useCallback(async () => {
    if (!data || loadingMore || data.page >= data.totalPages) return;
    setLoadingMore(true);
    try {
      const next = await searchProviderGuards(data.page + 1, term);
      // Keep the pages only if the box still holds the same search.
      setResult((current) =>
        current && current.term === term ? { term, page: { ...next, items: [...current.page.items, ...next.items] } } : current
      );
    } catch (failure) {
      toast.failure(guardsErrorMessage(failure, "Couldn't load more guards."));
    } finally {
      setLoadingMore(false);
    }
  }, [data, loadingMore, term]);

  return { searching: term !== '', data, error: searchError, loadingMore, loadMore };
}
