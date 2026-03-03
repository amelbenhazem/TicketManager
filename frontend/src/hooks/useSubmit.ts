'use client';

import { useState, useCallback } from 'react';

/**
 * Hook for form submission with loading and error state.
 */
export function useSubmit<T>(submitFn: () => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await submitFn();
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue';
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [submitFn]);

  return { submit, loading, error };
}
