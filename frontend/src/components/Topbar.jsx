import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Search } from 'lucide-react';

const Topbar = ({ title }) => {
    const { user } = useAuth();
    if (!user) return null;

    return (
        <div className="h-20 flex items-center justify-between mb-8 sticky top-0 z-40">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
                <p className="text-sm font-medium text-slate-400">Welcome back, {user.name.split(' ')[0]}!</p>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-3 bg-white/50 border border-slate-200 rounded-2xl px-4 py-2.5 w-[300px] focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/5 transition-all">
                    <Search size={18} className="text-slate-400" />
                    <input type="text" placeholder="Search anything..." className="bg-transparent outline-none w-full text-sm font-medium" />
                </div>

                <button className="relative w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                    <Bell size={20} />
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/20">
                        {user.name.charAt(0)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Topbar;
