import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Loader2, BadgeCheck, Briefcase, User, Mail, Lock, Building, UserPlus, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Signup = () => {
    const [role, setRole] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleVerified, setIsGoogleVerified] = useState(false);
    const { signup, user, loading, fetchUser } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        document.title = 'AI Hiring OS - Sign Up';
    }, []);

    React.useEffect(() => {
        if (user) {
            navigate(`/dashboard/${user.role.toLowerCase()}`);
        }
    }, [user, navigate]);

    React.useEffect(() => {
        // Detect if there's an OAuth token in local storage and parse user info
        const handleOAuthToken = () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload && payload.email) {
                        setEmail(payload.email);
                        if (payload.user_metadata?.full_name) {
                            setName(payload.user_metadata.full_name);
                        } else if (payload.user_metadata?.name) {
                            setName(payload.user_metadata.name);
                        } else {
                            setName(payload.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim());
                        }
                        setIsGoogleVerified(true);
                    }
                } catch (e) {
                    console.error("Failed to parse Google OAuth token:", e);
                }
            }
        };

        handleOAuthToken();
    }, [loading]);

    const handleGoogleLogin = async () => {
        try {
            const redirectUri = `${window.location.origin}/signup?oauth=true`;
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
        if (!role) { alert('Please select a role'); return; }
        setIsLoading(true);
        try {
            if (isGoogleVerified) {
                const token = localStorage.getItem('token');
                await api.post('/auth/signup-google', {
                    role,
                    company_name: companyName,
                    name: name
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                await fetchUser();
            } else {
                await signup({ name, email, password, role, company_name: companyName });
            }
            const user = JSON.parse(localStorage.getItem('user'));
            navigate(`/dashboard/${user.role.toLowerCase()}`);
        } catch (err) {
            alert(err.detail || 'Signup failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-inter py-12 px-6">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/50 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-100/50 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-grid opacity-20" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, cubicBezier: [0.16, 1, 0.3, 1] }}
                className="glass-morphism w-full max-w-[560px] p-8 md:p-12 relative z-10 rounded-[2.5rem] shadow-2xl shadow-indigo-600/10"
            >
                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex justify-center items-center gap-3 mb-6 group">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform duration-300">
                            <Rocket size={28} className="text-white" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter gradient-text">AI Hiring OS</span>
                    </Link>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create your account</h2>
                    {isGoogleVerified ? (
                        <div className="mt-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
                            <svg className="w-4 h-4 text-emerald-600 fill-current animate-bounce" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Verified with Google</span>
                        </div>
                    ) : (
                        <p className="text-slate-500 mt-2 font-medium">Join the intelligent recruitment revolution</p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Select Your Role</label>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { id: 'hr', name: 'HR / Admin', icon: BadgeCheck },
                                { id: 'manager', name: 'Manager', icon: Briefcase },
                                { id: 'employee', name: 'Employee', icon: User }
                            ].map((item) => (
                                <div 
                                    key={item.id}
                                    onClick={() => setRole(item.id)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 text-center flex flex-col items-center gap-2 group ${
                                        role === item.id 
                                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                        : 'border-slate-100 bg-white/50 text-slate-400 hover:border-indigo-200 hover:bg-white'
                                    }`}
                                >
                                    <item.icon className={`${role === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} size={24} />
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${role === item.id ? 'text-white' : 'text-slate-500'}`}>{item.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <UserPlus size={18} />
                                </div>
                                <input type="text" className="w-full bg-white/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Company</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Building size={18} />
                                </div>
                                <input type="text" className="w-full bg-white/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium" placeholder="Acme Inc." value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Mail size={18} />
                            </div>
                            <input 
                                type="email" 
                                className={`w-full border rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium ${
                                    isGoogleVerified 
                                    ? 'bg-slate-100/70 text-slate-500 border-slate-200 cursor-not-allowed' 
                                    : 'bg-white/50 border-slate-200'
                                }`} 
                                placeholder="john@acme.com" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                disabled={isGoogleVerified}
                                required 
                            />
                        </div>
                    </div>

                    {!isGoogleVerified && (
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="w-full bg-white/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium" 
                                    placeholder="••••••••" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
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
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="btn btn-primary w-full justify-center py-4 text-lg font-black shadow-xl shadow-indigo-600/20 group mt-4"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                {isGoogleVerified ? 'Complete Onboarding' : 'Create Account'}
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-200/50">
                    {!isGoogleVerified && (
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
                            Sign up with Google
                        </button>
                    )}
                    <p className="text-center text-sm font-medium text-slate-500">
                        {isGoogleVerified ? (
                            <button 
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    setIsGoogleVerified(false);
                                    setEmail('');
                                    setName('');
                                }} 
                                className="text-rose-600 font-black hover:underline"
                            >
                                Not you? Sign in with a different account
                            </button>
                        ) : (
                            <>
                                Already have an account? <Link to="/login" className="text-indigo-600 font-black hover:underline">Sign In</Link>
                            </>
                        )}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
