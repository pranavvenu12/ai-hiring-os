import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Mail, Building, Users, Shield, Calendar, MapPin, ExternalLink, Globe, Layers3, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardEmployee = () => {
    const { user } = useAuth();
    const [company, setCompany] = useState(null);
    const [team, setTeam] = useState([]);

    useEffect(() => {
        document.title = 'AI Hiring OS - Employee Dashboard';
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const co = await api.get(`/companies/${user.company_id}`);
            setCompany(co);
            const users = await api.get('/users');
            setTeam(users);
        } catch (error) { console.error(error); }
    };

    return (
        <div className="flex bg-slate-50 min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] p-6 md:p-10">
                <Topbar title="Employee Portal" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-10"
                >
                    {/* Profile Section */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="glass-morphism rounded-[2.5rem] p-10 border border-white/50 text-center relative overflow-hidden shadow-2xl shadow-indigo-600/5">
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600 to-violet-600 opacity-10" />
                            <div className="relative z-10">
                                <div className="w-28 h-28 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-xl shadow-indigo-600/30 rotate-3">
                                    {user?.name.charAt(0)}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{user?.name}</h3>
                                <div className="inline-block px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 border border-indigo-100">
                                    {user?.role}
                                </div>
                            </div>
                            
                            <div className="mt-10 pt-10 border-t border-slate-100 space-y-6 text-left">
                                <InfoRow icon={Mail} label="Professional Email" value={user?.email} />
                                <InfoRow icon={Building} label="Company" value={company?.name} />
                                <InfoRow icon={Layers3} label="Industry" value={company?.industry} />
                                <InfoRow icon={MapPin} label="Location" value={company?.location} />
                                <InfoRow icon={UserCheck} label="Team Size" value={company?.employee_count_range} />
                                <InfoRow icon={Globe} label="Website" value={company?.website} />
                                <InfoRow icon={Calendar} label="Member Since" value={company?.created_at ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(company.created_at)) : '—'} />
                            </div>

                            <button className="btn btn-secondary w-full justify-center mt-10 py-3.5 font-bold text-sm bg-white/50">
                                Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* Team Section */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="glass-morphism rounded-[2.5rem] p-10 border border-white/50 shadow-2xl shadow-slate-200/50">
                            <div className="flex justify-between items-center mb-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                        <Users size={22} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Your Team</h3>
                                </div>
                                <button className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:underline">
                                    View Directory <ExternalLink size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6">
                                {team.map((member, i) => (
                                    <motion.div 
                                        key={member.id} 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-6 rounded-[2rem] bg-white/50 border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{member.name}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{member.role}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-morphism rounded-[2.5rem] p-10 border border-white/50 shadow-2xl shadow-slate-200/50 bg-gradient-to-br from-white to-indigo-50/30">
                            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <Shield size={20} className="text-indigo-600" /> Company Details
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                {company?.description || 'Add company details in Settings so the team can see the correct company profile here.'}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DetailCard label="Contact Email" value={company?.contact_email || 'Not provided'} />
                                <DetailCard label="Website" value={company?.website || 'Not provided'} />
                                <DetailCard label="Location" value={company?.location || 'Not provided'} />
                                <DetailCard label="Industry" value={company?.industry || 'Not provided'} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shadow-sm">
            <Icon size={18} />
        </div>
        <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</div>
            <div className="text-sm font-black text-slate-700 truncate max-w-[200px]">{value || 'Loading...'}</div>
        </div>
    </div>
);

const DetailCard = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</div>
        <div className="text-sm font-bold text-slate-700">{value}</div>
    </div>
);

export default DashboardEmployee;
