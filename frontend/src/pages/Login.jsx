import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Loader2, Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldCheck, Briefcase, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'AI Hiring OS - Login';
    }, []);

    useEffect(() => {
        if (user) {
            navigate(`/dashboard/${user.role.toLowerCase()}`);
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
            const user = JSON.parse(localStorage.getItem('user'));
            navigate(`/dashboard/${user.role.toLowerCase()}`);
            toast.success('Welcome back!');
        } catch (err) {
            let errorMsg = err.detail || 'Login failed';
            if (errorMsg) {
                errorMsg = errorMsg.replace(/supabase/gi, 'Server');
            }
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-inter px-5">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-x-0 top-0 mx-auto h-[420px] max-w-4xl bg-[radial-gradient(circle_at_50%_0%,rgba(47,95,143,0.14),transparent_60%)]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, cubicBezier: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[440px] p-7 md:p-9 relative z-10 rounded-[2rem] bg-white border border-slate-200 shadow-2xl shadow-slate-200/70"
            >
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors mb-6"
                >
                    <ArrowLeft size={15} />
                    Back to home
                </Link>

                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex justify-center items-center gap-3 mb-6 group">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Rocket size={21} className="text-white" />
                        </div>
                        <span className="font-semibold text-xl tracking-tight text-slate-950">AI Hiring OS</span>
                    </Link>
                    <h2 className="text-3xl font-semibold text-slate-950 tracking-tight">Welcome back</h2>
                    <p className="text-slate-500 mt-2 font-medium">Enter your details to access your portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Mail size={18} />
                            </div>
                            <input 
                                type="email" 
                                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium" 
                                placeholder="name@company.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center px-1">
                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Password</label>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-12 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium" 
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
                        className="btn btn-primary w-full justify-center py-3.5 text-sm font-semibold group"
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

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Demo Login</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('hr@gmail.com');
                                    setPassword('123456');
                                }}
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-500/30 transition-all cursor-pointer group"
                            >
                                <ShieldCheck size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors mb-1" />
                                <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">HR / Admin</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('manager@gmail.com');
                                    setPassword('123456');
                                }}
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-500/30 transition-all cursor-pointer group"
                            >
                                <Briefcase size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors mb-1" />
                                <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Manager</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEmail('employee@gmail.com');
                                    setPassword('123456');
                                }}
                                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-500/30 transition-all cursor-pointer group"
                            >
                                <User size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors mb-1" />
                                <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Employee</span>
                            </button>
                        </div>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200/50">
                    <p className="text-center text-sm font-medium text-slate-500">
                        New to the platform? <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">Create an account</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;

