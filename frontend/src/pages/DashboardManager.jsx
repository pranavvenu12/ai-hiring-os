import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import RecruiterCopilot from '../components/RecruiterCopilot';
import api from '../services/api';
import { CheckCircle2, XCircle, Star, Brain, Clock, Users, TrendingUp, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardManager = () => {
    const [candidates, setCandidates] = useState([]);
    const [teamAttendance, setTeamAttendance] = useState([]);
    const [teamAvgRating, setTeamAvgRating] = useState(0);
    const [payrollSummary, setPayrollSummary] = useState({ total_payroll_cost: 0, department_costs: {} });

    useEffect(() => {
        document.title = 'AI Hiring OS - Manager Dashboard';
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const jobs = await api.get('/jobs');
            let allCands = [];
            for (const job of jobs) {
                const cands = await api.get(`/jobs/${job.id}/candidates`);
                allCands = allCands.concat(cands.filter(c => c.score > 70).map(c => ({...c, jobTitle: job.title})));
            }
            setCandidates(allCands);

            // Fetch team HRMS data
            try {
                const attData = await api.get('/attendance/team');
                setTeamAttendance(attData.records || []);
            } catch (e) { console.error(e); }
            try {
                const perfData = await api.get('/performance/team');
                const reviews = perfData.reviews || [];
                if (reviews.length > 0) {
                    setTeamAvgRating(+(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1));
                }
            } catch (e) { console.error(e); }
            try {
                const payrollData = await api.get('/payroll?limit=500');
                setPayrollSummary(payrollData.summary || { total_payroll_cost: 0, department_costs: {} });
            } catch (e) { console.error(e); }
        } catch (error) { console.error(error); }
    };

    const containerVariants = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Hiring Manager Portal" />
                <RecruiterCopilot />
                
                <motion.div 
                    variants={containerVariants}
                    initial="initial"
                    animate="animate"
                    className="space-y-10"
                >
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        <StatCard icon={Star} label="High Potential" value={candidates.length} color="indigo" />
                        <StatCard icon={Brain} label="AI Recommended" value={candidates.filter(c => c.score >= 85).length} color="violet" />
                        <StatCard icon={Clock} label="Candidates Reviewed" value={candidates.length} color="emerald" />
                        <StatCard icon={Users} label="Team Present" value={teamAttendance.filter(r => r.status === 'present').length} color="indigo" />
                        <StatCard icon={TrendingUp} label="Team Avg Rating" value={`${teamAvgRating}/5`} color="violet" />
                        <StatCard icon={Wallet} label="Payroll Overview" value={`₹${Math.round(payrollSummary.total_payroll_cost || 0).toLocaleString('en-IN')}`} color="emerald" />
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center gap-4 mb-6">
                            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3">
                                <Wallet size={20} className="text-indigo-600" /> Department Payroll Overview
                            </h3>
                            <Link to="/payroll" className="btn btn-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest">View Payroll</Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(payrollSummary.department_costs || {}).map(([department, cost]) => (
                                <div key={department} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 truncate">{department}</div>
                                    <div className="text-xl font-semibold text-slate-950 mt-2">₹{Math.round(cost).toLocaleString('en-IN')}</div>
                                </div>
                            ))}
                            {Object.keys(payrollSummary.department_costs || {}).length === 0 && (
                                <div className="text-sm font-semibold text-slate-400">No payroll records generated yet.</div>
                            )}
                        </div>
                    </motion.div>

                    {/* Team Attendance Today */}
                    {teamAttendance.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-3">
                                <Clock size={20} className="text-indigo-600" /> Team Attendance Today
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {teamAttendance.map((r, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/50 border border-slate-100">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm ${
                                            r.status === 'present' ? 'bg-emerald-50 text-emerald-600' :
                                            r.status === 'half_day' ? 'bg-amber-50 text-amber-600' :
                                            r.status === 'not_clocked_in' ? 'bg-slate-50 text-slate-400' : 'bg-rose-50 text-rose-600'
                                        }`}>{r.employee_name?.charAt(0) || '?'}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-900 text-sm truncate">{r.employee_name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(r.status || 'not clocked in').replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Main Content */}
                    <div className="grid grid-cols-1 gap-8">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Top Candidates for Approval</h3>
                                    <p className="text-sm font-medium text-slate-400">Hand-picked by AI for your specific job requirements</p>
                                </div>
                                <Link to="/candidates" className="btn btn-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white">View Full Pool</Link>
                            </div>

                            <div className="space-y-4">
                                {candidates.map((c, i) => (
                                    <motion.div 
                                        key={c.id} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="group flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-3xl border border-slate-100 bg-white/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-5 mb-4 md:mb-0">
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm font-semibold">
                                                {c.candidate_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.candidate_name}</div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{c.jobTitle}</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                    <span className="text-sm font-semibold text-indigo-600 italic">Score: {c.score}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button className="flex-1 md:flex-none btn bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-500 hover:text-white px-5 py-2.5 text-sm font-semibold rounded-xl transition-all">
                                                <XCircle size={18} />
                                                Reject
                                            </button>
                                            <button className="flex-1 md:flex-none btn btn-primary px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm">
                                                <CheckCircle2 size={18} />
                                                Approve
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                                {candidates.length === 0 && (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Star size={32} className="text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No high-potential candidates yet</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

const statColorClasses = {
    indigo: {
        accent: 'bg-indigo-500/5',
        icon: 'group-hover:text-indigo-600',
    },
    violet: {
        accent: 'bg-violet-500/5',
        icon: 'group-hover:text-violet-600',
    },
    emerald: {
        accent: 'bg-emerald-500/5',
        icon: 'group-hover:text-emerald-600',
    },
};

const StatCard = ({ icon: Icon, label, value, color }) => {
    const colorClasses = statColorClasses[color] || statColorClasses.indigo;

    return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm relative overflow-hidden group"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 ${colorClasses.accent} rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700`} />
        <div className="flex items-start justify-between mb-8">
            <div className={`w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 ${colorClasses.icon} group-hover:scale-110 transition-all duration-300`}>
                <Icon size={24} />
            </div>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-semibold uppercase tracking-widest">
                Real-time
            </div>
        </div>
        <div className="space-y-1 relative z-10">
            <h2 className="text-4xl font-semibold text-slate-900 tracking-tighter">{value}</h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">{label}</p>
        </div>
    </motion.div>
    );
};

export default DashboardManager;


