import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && !user) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const data = await api.get('/me');
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
        } catch (error) {
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const data = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.access_token);
        await fetchUser();
    };

    const signup = async (payload) => {
        await api.post('/auth/signup', payload);
        await login(payload.email, payload.password);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
