/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    }, []);

    const fetchUser = useCallback(async () => {
        try {
            const data = await api.get('/me');
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
            return data;
        } catch (error) {
            const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
            if (!isAuthPage) {
                logout();
            }
            throw error;
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        // Detect Supabase OAuth tokens in the hash fragment
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
            const tokenMatch = hash.match(/access_token=([^&]*)/);
            if (tokenMatch && tokenMatch[1]) {
                localStorage.setItem('token', tokenMatch[1]);
                // Clear the hash from address bar to keep it clean
                window.history.replaceState(null, null, window.location.pathname + window.location.search);
            }
        }

        const token = localStorage.getItem('token');
        if (token && !user) {
            fetchUser().catch(err => {
                console.log('Failed to fetch user on mount:', err.detail || err.message || err);
            });
        } else {
            setLoading(false);
        }
    }, [fetchUser, user]);

    const login = useCallback(async (email, password) => {
        const data = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.access_token);
        await fetchUser();
    }, [fetchUser]);

    const signup = useCallback(async (payload) => {
        await api.post('/auth/signup', payload);
        await login(payload.email, payload.password);
    }, [login]);

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
