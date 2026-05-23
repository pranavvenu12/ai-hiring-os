import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Users, Briefcase, Star, ClipboardList, ArrowRight, TrendingUp, Clock, FileText } from 'lucide-react';

const DashboardHR = () => {
    const [stats, setStats] = useState({
        totalCandidates: 0,
        shortlisted: 0,
        avgScore: 0,
        activeJobs: 0
    });
    const [jobs, setJobs] = useState([]);

    useEffect(() => {
        document.title = 'AI Hiring OS - HR Dashboard';
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const jobsData = await api.get('/jobs');
            setJobs(jobsData.slice(0, 5));
            
            let totalCands = 0;
            let highScorers = 0;
            let totalScore = 0;
            let scoredCount = 0;

            for (const job of jobsData) {
                const cands = await api.get(`/jobs/${job.id}/candidates`);
                totalCands += cands.length;
                cands.forEach(c => {
                    if (c.score >= 80) highScorers++;
                    if (c.score > 0) {
                        totalScore += c.score;
                        scoredCount++;
                    }
                });
            }

            setStats({
                totalCandidates: totalCands,
                shortlisted: highScorers,
                avgScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
                activeJobs: jobsData.length
            });
        } catch (error) {
            console.error(error);
        }
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
            <main className="flex-1 ml-0 lg:ml-[280px] p-6 md:p-10 relative">
                <Topbar title="System Overview" />
                
                {/* Stats Grid */}
                <motion.div 
                    variants={containerVariants}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10"
                >
                    <StatCard icon={Users} label="Total Candidates" value={stats.totalCandidates} color="indigo" trend="+12%" />
                    <StatCard icon={Star} label="Shortlisted" value={stats.shortlisted} color="violet" trend="+5%" />
                    <StatCard icon={ClipboardList} label="Avg AI Score" value={`${stats.avgScore}%`} color="blue" trend="+2%" />
                    <StatCard icon={Briefcase} label="Active Jobs" value={stats.activeJobs} color="emerald" trend="+0" />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Jobs */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-2 glass-morphism rounded-[2.5rem] p-8 border border-white/50"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Recent Job Postings</h3>
                                <p className="text-sm font-medium text-slate-400">Track your most recent hiring cycles</p>
                            </div>
                            <Link to="/jobs" className="btn btn-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest">View All</Link>
                        </div>
                        
                        <div className="space-y-4">
                            {jobs.map(job => (
                                <Link 
                                    key={job.id} 
                                    to={`/candidates?job_id=${job.id}`}
                                    className="flex items-center justify-between p-5 rounded-3xl border border-slate-100 bg-white/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{job.department || 'General'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="hidden md:block text-right">
                                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</div>
                                            <div className="text-sm font-bold text-emerald-500">Active</div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-indigo-100 group-hover:text-indigo-600 transition-all">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {jobs.length === 0 && (
                                <div className="text-center py-16 bg-white/30 rounded-3xl border-2 border-dashed border-slate-200">
                                    <FileText className="mx-auto text-slate-300 mb-4" size={40} />
                                    <p className="text-slate-400 font-bold">No active jobs found.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Activity Feed */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass-morphism rounded-[2.5rem] p-8 border border-white/50 flex flex-col"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Clock size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Activity</h3>
                        </div>

                        <div className="space-y-8 relative flex-1">
                            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-100" />
                            {[
                                { title: "New candidate applied", sub: "Frontend Developer", time: "2h ago", icon: Users, color: "blue" },
                                { title: "Shortlist updated", sub: "Senior Architect", time: "5h ago", icon: Star, color: "violet" },
                                { title: "New job posted", sub: "Product Manager", time: "Yesterday", icon: Briefcase, color: "emerald" },
                                { title: "Evaluation complete", sub: "UX Designer", time: "2 days ago", icon: ClipboardList, color: "indigo" }
                            ].map((act, i) => (
                                <div key={i} className="flex gap-4 relative z-10">
                                    <div className={`w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm`}>
                                        <act.icon size={18} className={`text-slate-400`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-slate-900">{act.title}</div>
                                        <div className="text-xs font-bold text-slate-400 mt-0.5">{act.sub}</div>
                                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{act.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button className="btn btn-secondary w-full justify-center mt-10 font-bold text-sm bg-white/50">
                            Clear History
                        </button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, trend }) => (
    <motion.div 
        variants={{
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 }
        }}
        className="glass-morphism p-6 rounded-[2rem] border border-white/50 hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-500 group"
    >
        <div className="flex justify-between items-start mb-6">
            <div className={`w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300`}>
                <Icon size={24} />
            </div>
            <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black flex items-center gap-1">
                <TrendingUp size={12} />
                {trend}
            </div>
        </div>
        <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
    </motion.div>
);

export default DashboardHR;
