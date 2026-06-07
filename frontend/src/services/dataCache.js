const PREFIX = 'ai_hiring_cache_';

function getScopeId() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return user?.id || user?.company_id || 'anonymous';
    } catch {
        return 'anonymous';
    }
}

export function buildCacheKey(key) {
    return `${PREFIX}${getScopeId()}_${key}`;
}

export function getCached(key) {
    try {
        const raw = localStorage.getItem(buildCacheKey(key));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function setCached(key, data) {
    try {
        localStorage.setItem(buildCacheKey(key), JSON.stringify(data));
    } catch (e) {
        console.warn('Cache write failed:', e);
    }
}

export function removeCached(key) {
    localStorage.removeItem(buildCacheKey(key));
}

export function clearAllCache() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX) || k?.startsWith('company_')) {
            keys.push(k);
        }
    }
    keys.forEach((k) => localStorage.removeItem(k));
}
