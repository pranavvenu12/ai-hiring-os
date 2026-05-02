import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Users, CheckCircle2, XCircle, Star, Brain, ArrowUpRight, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardManager = () => {
    const [candidates, setCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const containerVariants = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="flex bg-slate-50 min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] p-6 md:p-10">
                <Topbar title="Hiring Manager Portal" />
                
                <motion.div 
                    variants={containerVariants}
                    initial="initial"
                    animate="animate"
                    className="space-y-10"
                >
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <StatCard icon={Star} label="High Potential" value={candidates.length} color="indigo" />
                        <StatCard icon={Brain} label="AI Recommended" value={candidates.filter(c => c.score >= 85).length} color="violet" />
                        <StatCard icon={Clock} label="Avg. Review Time" value="4.2h" color="emerald" />
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 gap-8">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-morphism rounded-[2.5rem] p-8 border border-white/50"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Top Candidates for Approval</h3>
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
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm font-black">
                                                {c.candidate_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{c.candidate_name}</div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{c.jobTitle}</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                    <span className="text-sm font-black text-indigo-600 italic">Score: {c.score}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button className="flex-1 md:flex-none btn bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-500 hover:text-white px-5 py-2.5 text-sm font-black rounded-xl transition-all">
                                                <XCircle size={18} />
                                                Reject
                                            </button>
                                            <button className="flex-1 md:flex-none btn btn-primary px-5 py-2.5 text-sm font-black rounded-xl shadow-lg shadow-indigo-600/20">
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

const StatCard = ({ icon: Icon, label, value, color }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphism p-8 rounded-[2.5rem] border border-white/50 relative overflow-hidden group"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700`} />
        <div className="flex items-start justify-between mb-8">
            <div className={`w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 group-hover:text-${color}-600 group-hover:scale-110 transition-all duration-300`}>
                <Icon size={24} />
            </div>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                Real-time
            </div>
        </div>
        <div className="space-y-1 relative z-10">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
        </div>
    </motion.div>
);

export default DashboardManager;
