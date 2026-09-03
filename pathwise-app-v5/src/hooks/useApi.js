// ─────────────────────────────────────────────────────────────────────
// src/hooks/useApi.js — Generic data fetching hook
// ─────────────────────────────────────────────────────────────────────
// Handles loading states, errors, and refetching for any API call.
// All domain hooks (useCourses, useSkills, etc.) are built on this.
// ─────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Generic hook for API calls with loading/error state.
 *
 * @param {Function} apiFn - async function that returns data
 * @param {Object} options
 * @param {boolean} options.immediate - fetch on mount (default: true)
 * @param {any[]} options.deps - re-fetch when these change
 * @param {any} options.initialData - initial data value
 * @param {Function} options.transform - transform response before setting data
 * @param {boolean} options.enabled - skip fetch when false
 *
 * @returns {{ data, loading, error, refetch, setData, mutate }}
 */
export function useApi(apiFn, options = {}) {
  const {
    immediate = true,
    deps = [],
    initialData = null,
    transform = (d) => d,
    enabled = true,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate && enabled);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Track if the component is still mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      if (!mountedRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        if (mountedRef.current) {
          const transformed = transform(result);
          setData(transformed);
          return transformed;
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message || "Something went wrong");
          throw err;
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [apiFn, transform]
  );

  // Auto-fetch on mount and when deps change
  useEffect(() => {
    if (immediate && enabled) {
      execute();
    }
  }, [immediate, enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Optimistic update: set data immediately, then revalidate.
   * If the API call fails, data is rolled back.
   */
  const mutate = useCallback(
    async (mutateFn, optimisticData) => {
      const previousData = data;
      if (optimisticData !== undefined) {
        setData(optimisticData);
      }
      try {
        await mutateFn();
        await execute(); // revalidate
      } catch (err) {
        setData(previousData); // rollback
        throw err;
      }
    },
    [data, execute]
  );

  return {
    data,
    loading,
    error,
    refetch: execute,
    setData,
    mutate,
  };
}

/**
 * Hook for mutations (POST/PUT/DELETE) that don't auto-fetch.
 * Returns { execute, loading, error, data }.
 */
export function useMutation(apiFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        if (mountedRef.current) {
          setData(result);
          return result;
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message || "Something went wrong");
        }
        throw err;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [apiFn]
  );

  return { execute, loading, error, data, reset: () => setError(null) };
}

