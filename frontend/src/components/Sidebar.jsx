import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Briefcase, Users, BadgeCheck, Rocket, Settings, HelpCircle, Menu, X, Clock, TrendingUp, Mic, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    const navItems = [
        { name: 'Dashboard', path: `/dashboard/${user.role.toLowerCase()}`, icon: LayoutDashboard },
    ];

    if (['admin', 'hr', 'manager'].includes(user.role)) {
        navItems.push(
            { name: 'Jobs', path: '/jobs', icon: Briefcase },
            { name: 'Candidates', path: '/candidates', icon: Users }
        );
    }

    if (['admin', 'hr'].includes(user.role)) {
        navItems.push({ name: 'Employees', path: '/employees', icon: BadgeCheck });
    }

    navItems.push(
        { name: 'Attendance', path: '/attendance', icon: Clock },
        { name: 'Performance', path: '/performance', icon: TrendingUp },
    );
    if (user.role !== 'manager') {
        navItems.push({ name: 'Payroll', path: '/payroll', icon: Wallet });
    }

    if (['admin', 'hr'].includes(user.role)) {
        navItems.push({ name: 'AI Interview', path: '/interviews', icon: Mic });
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-9 px-3">
                <Link to={`/dashboard/${user.role.toLowerCase()}`} className="flex items-center gap-3 group">
                    <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Rocket className="text-white" size={19} />
                    </div>
                    <span className="font-semibold text-lg tracking-tight text-slate-950">AI Hiring OS</span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 space-y-8">
                <div>
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">Main Menu</p>
                    <nav className="flex flex-col gap-1.5">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => 
                                    `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                        isActive 
                                        ? 'bg-slate-950 text-white shadow-sm' 
                                        : 'text-slate-500 hover:bg-white hover:text-slate-950'
                                    }`
                                }
                            >
                                <item.icon size={20} />
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div>
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">System</p>
                    <nav className="flex flex-col gap-1.5">
                        <NavLink to="/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-500 hover:bg-white hover:text-slate-950 transition-all duration-200">
                            <Settings size={20} />
                            Settings
                        </NavLink>
                        <NavLink to="/help" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-500 hover:bg-white hover:text-slate-950 transition-all duration-200">
                            <HelpCircle size={20} />
                            Help Center
                        </NavLink>
                    </nav>
                </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-white rounded-xl border border-slate-200">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold">
                        {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate">{user.role}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button 
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed top-5 left-5 z-[60] w-11 h-11 bg-white rounded-xl shadow-lg flex items-center justify-center text-slate-600 border border-slate-200"
            >
                <Menu size={24} />
            </button>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-[280px] h-screen fixed left-0 top-0 p-5 flex-col z-50 border-r border-slate-200 bg-slate-50/80 backdrop-blur-xl">
                <SidebarContent />
            </aside>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] lg:hidden"
                        />
                        <motion.aside 
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 w-[280px] h-screen p-5 flex flex-col z-[80] border-r border-slate-200 bg-slate-50 lg:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;
