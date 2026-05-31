import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Briefcase, Users, BadgeCheck, LogOut, Rocket, Settings, HelpCircle, Menu, X, Clock, TrendingUp, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout } = useAuth();
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

    if (['admin', 'hr'].includes(user.role)) {
        navItems.push({ name: 'AI Interview', path: '/interviews', icon: Mic });
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-10 px-4">
                <Link to={`/dashboard/${user.role.toLowerCase()}`} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform duration-300">
                        <Rocket className="text-white" size={22} />
                    </div>
                    <span className="font-black text-xl tracking-tighter gradient-text">AI Hiring OS</span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 space-y-8">
                <div>
                    <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Main Menu</p>
                    <nav className="flex flex-col gap-1.5">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => 
                                    `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${
                                        isActive 
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' 
                                        : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm'
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
                    <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">System</p>
                    <nav className="flex flex-col gap-1.5">
                        <NavLink to="/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all duration-300">
                            <Settings size={20} />
                            Settings
                        </NavLink>
                        <NavLink to="/help" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all duration-300">
                            <HelpCircle size={20} />
                            Help Center
                        </NavLink>
                    </nav>
                </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 px-4 py-4 mb-4 bg-slate-50/50 rounded-2xl border border-white">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                        {user.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user.role}</p>
                    </div>
                </div>
                <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-rose-500 hover:bg-rose-50 transition-all duration-300"
                >
                    <LogOut size={20} />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button 
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed top-5 left-5 z-[60] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-600 border border-slate-100"
            >
                <Menu size={24} />
            </button>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-[280px] h-screen fixed left-0 top-0 p-6 flex-col z-50 border-r border-slate-200/50 glass-morphism">
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
                            className="fixed left-0 top-0 w-[280px] h-screen p-6 flex flex-col z-[80] border-r border-slate-200/50 glass-morphism bg-white lg:hidden"
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
