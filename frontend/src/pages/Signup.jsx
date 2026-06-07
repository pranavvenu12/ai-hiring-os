import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, Loader2, BadgeCheck, Briefcase, User, Mail, Lock, Building, UserPlus, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Signup = () => {
    const [role, setRole] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [designation, setDesignation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signup, user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    React.useEffect(() => {
        document.title = 'AI Hiring OS - Sign Up';
    }, []);

    React.useEffect(() => {
        if (user) {
            navigate(`/dashboard/${user.role.toLowerCase()}`);
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!role) { toast.warning('Please select a role'); return; }
        if (password.length < 6) { toast.warning('Password must be at least 6 characters'); return; }
        const normalizedEmail = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            toast.warning('Enter a valid email address');
            return;
        }
        setIsLoading(true);
        try {
            await signup({
                name,
                email: normalizedEmail,
                password,
                role,
                company_name: companyName,
                designation: role === 'employee' ? designation : undefined,
            });
            const user = JSON.parse(localStorage.getItem('user'));
            navigate(`/dashboard/${user.role.toLowerCase()}`);
            toast.success('Account created successfully!');
        } catch (err) {
            const detail = err?.detail;
            const msg = typeof detail === 'string'
                ? detail
                : Array.isArray(detail)
                    ? detail.map(d => d.msg || d).join('; ')
                    : err?.message || 'Signup failed';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-inter py-12 px-5">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-x-0 top-0 mx-auto h-[480px] max-w-5xl bg-[radial-gradient(circle_at_50%_0%,rgba(47,95,143,0.14),transparent_60%)]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, cubicBezier: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[560px] p-7 md:p-9 relative z-10 rounded-[2rem] bg-white border border-slate-200 shadow-2xl shadow-slate-200/70"
            >
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors mb-6"
                >
                    <ArrowLeft size={15} />
                    Back to sign in
                </Link>

                <div className="text-center mb-10">
                    <Link to="/" className="inline-flex justify-center items-center gap-3 mb-6 group">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Rocket size={21} className="text-white" />
                        </div>
                        <span className="font-semibold text-xl tracking-tight text-slate-950">AI Hiring OS</span>
                    </Link>
                    <h2 className="text-3xl font-semibold text-slate-950 tracking-tight">Create your account</h2>
                    <p className="text-slate-500 mt-2 font-medium">Join your company workspace</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Select Your Role <span className="text-rose-500">*</span></label>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { id: 'hr', name: 'HR / Admin', icon: BadgeCheck },
                                { id: 'manager', name: 'Manager', icon: Briefcase },
                                { id: 'employee', name: 'Employee', icon: User }
                            ].map((item) => (
                                <div 
                                    key={item.id}
                                    onClick={() => {
                                        setRole(item.id);
                                        if (item.id !== 'employee') setDesignation('');
                                    }}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 text-center flex flex-col items-center gap-2 group ${
                                        role === item.id 
                                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' 
                                        : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <item.icon className={`${role === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} size={24} />
                                    <div className={`text-[10px] font-semibold uppercase tracking-widest ${role === item.id ? 'text-white' : 'text-slate-500'}`}>{item.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Full Name <span className="text-rose-500">*</span></label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <UserPlus size={18} />
                                </div>
                                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                        </div>
                        {role === 'employee' && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Employee Role <span className="text-rose-500">*</span></label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                        <Briefcase size={18} />
                                    </div>
                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium" placeholder="Full Stack Developer" value={designation} onChange={e => setDesignation(e.target.value)} required={role === 'employee'} />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Company <span className="text-rose-500">*</span></label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                    <Building size={18} />
                                </div>
                                <input type="text" className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium" placeholder="Acme Inc." value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Email Address <span className="text-rose-500">*</span></label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Mail size={18} />
                            </div>
                            <input 
                                type="text" 
                                inputMode="email"
                                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium" 
                                placeholder="john@acme.com" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Password <span className="text-rose-500">*</span></label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-12 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium" 
                                placeholder="••••••••" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                minLength={6}
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
                        className="btn btn-primary w-full justify-center py-3.5 text-sm font-semibold group mt-4"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                Create Account
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200/50">
                    <p className="text-center text-sm font-medium text-slate-500">
                        Already have an account? <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign In</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;

