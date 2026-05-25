import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Loader2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { clearGoogleOAuthFlow, getGoogleOAuthFlow, setGoogleOAuthFlow } from '../utils/auth';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'AI Hiring OS - Login';
    }, []);

    useEffect(() => {
        if (user) {
            navigate(`/dashboard/${user.role.toLowerCase()}`);
        }
    }, [user, navigate]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('oauth') === 'true' && !loading && !user && localStorage.getItem('token')) {
            const flow = getGoogleOAuthFlow();
            if (flow === 'signup') {
                navigate('/signup?oauth=true', { replace: true });
            }
        }
    }, [user, loading, navigate]);

    const handleGoogleLogin = async () => {
        try {
            setGoogleOAuthFlow('login');
            const redirectUri = `${window.location.origin}/login?oauth=true`;
            const data = await api.get(`/auth/google?redirect_to=${encodeURIComponent(redirectUri)}`);
            if (data && data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            alert('Failed to initialize Google login');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
            clearGoogleOAuthFlow();
            const user = JSON.parse(localStorage.getItem('user'));
            navigate(`/dashboard/${user.role.toLowerCase()}`);
        } catch (err) {
            alert(err.detail || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-inter">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/50 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-100/50 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-grid opacity-20" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, cubicBezier: [0.16, 1, 0.3, 1] }}
                className="glass-morphism w-full max-w-[460px] p-8 md:p-12 relative z-10 rounded-[2.5rem] shadow-2xl shadow-indigo-600/10"
            >
                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex justify-center items-center gap-3 mb-6 group">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform duration-300">
                            <Rocket size={28} className="text-white" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter gradient-text">AI Hiring OS</span>
                    </Link>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
                    <p className="text-slate-500 mt-2 font-medium">Enter your details to access your portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Mail size={18} />
                            </div>
                            <input 
                                type="email" 
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium" 
                                placeholder="name@company.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Password</label>
                            <a href="#" className="text-xs font-bold text-indigo-600 hover:underline">Forgot?</a>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="btn btn-primary w-full justify-center py-4 text-lg font-black shadow-xl shadow-indigo-600/20 group"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                Sign In
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-200/50">
                    <button 
                        type="button" 
                        onClick={handleGoogleLogin} 
                        className="flex items-center justify-center gap-3 w-full bg-white border border-slate-200 rounded-2xl py-3.5 font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm mb-6"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </button>
                    
                    <p className="text-center text-sm font-medium text-slate-500">
                        New to the platform? <Link to="/signup" className="text-indigo-600 font-black hover:underline">Create an account</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
