import { useState, useEffect, useCallback, useRef } from 'react';
import { getCached, setCached } from '../services/dataCache';

/**
 * Cache-first data hook. Shows cached data instantly on revisit/refresh,
 * refreshes in the background, and never surfaces fetch errors to the UI.
 */
export function useCachedFetch(cacheKey, fetcher, defaultValue = null) {
    const initialCache = getCached(cacheKey);
    const [data, setData] = useState(initialCache ?? defaultValue);
    const [loading, setLoading] = useState(!initialCache);
    const hasCache = useRef(!!initialCache);

    const refresh = useCallback(async () => {
        if (!hasCache.current) {
            setLoading(true);
        }
        try {
            const result = await fetcher();
            setData(result);
            setCached(cacheKey, result);
            hasCache.current = true;
        } catch (err) {
            console.error(`Background refresh failed for ${cacheKey}:`, err);
            if (!hasCache.current) {
                setData(defaultValue);
            }
        } finally {
            setLoading(false);
        }
    }, [cacheKey, fetcher, defaultValue]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { data, setData, loading, refresh, hasCache: hasCache.current };
}
