import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ai-hiring-os-3rgo.onrender.com';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 120000,
    headers: {
        'Content-Type': 'application/json'
    }
});

const memoryCache = new Map();
const inflightGets = new Map();

export function clearApiMemoryCache() {
    memoryCache.clear();
    inflightGets.clear();
}

const originalGet = api.get.bind(api);
api.get = (url, config) => {
    const cacheKey = `${url}${config?.params ? JSON.stringify(config.params) : ''}`;
    if (memoryCache.has(cacheKey)) {
        return Promise.resolve(memoryCache.get(cacheKey));
    }
    if (inflightGets.has(cacheKey)) {
        return inflightGets.get(cacheKey);
    }
    const request = originalGet(url, config)
        .then((data) => {
            memoryCache.set(cacheKey, data);
            inflightGets.delete(cacheKey);
            return data;
        })
        .catch((err) => {
            inflightGets.delete(cacheKey);
            throw err;
        });
    inflightGets.set(cacheKey, request);
    return request;
};

api.invalidateGet = (urlPrefix) => {
    for (const key of memoryCache.keys()) {
        if (key.startsWith(urlPrefix)) {
            memoryCache.delete(key);
        }
    }
    for (const key of inflightGets.keys()) {
        if (key.startsWith(urlPrefix)) {
            inflightGets.delete(key);
        }
    }
};

// Request interceptor for JWT
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Response interceptor for auth errors
api.interceptors.response.use(response => {
    return response.data;
}, error => {
    if (error.response && error.response.status === 401) {
        const isMeEndpoint = error.config.url && error.config.url.includes('/me');
        const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
        
        if (!isMeEndpoint && !isAuthPage) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    }
    return Promise.reject(error.response ? error.response.data : error);
});

export default api;
