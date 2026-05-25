import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Users, Briefcase, Star, ClipboardList, ArrowRight, Building2, MapPin, Globe, Mail, Layers3, UserCheck } from 'lucide-react';
import { formatRelativeTime, formatShortDate } from '../utils/date';

const DashboardHR = () => {
    const [stats, setStats] = useState({
        totalCandidates: 0,
        shortlisted: 0,
        avgScore: 0,
        activeJobs: 0
    });
    const [jobs, setJobs] = useState([]);
    const [recentCandidates, setRecentCandidates] = useState([]);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = 'AI Hiring OS - HR Dashboard';
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const currentUser = await api.get('/me');
            const [jobsData, companyData] = await Promise.all([
                api.get('/jobs'),
                api.get(`/companies/${currentUser.company_id}`),
            ]);

            setJobs(jobsData.slice(0, 5));
            setCompany(companyData);
            
            let totalCands = 0;
            let highScorers = 0;
            let totalScore = 0;
            let scoredCount = 0;
            const aggregatedCandidates = [];

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
                aggregatedCandidates.push(...cands.map(c => ({ ...c, jobTitle: job.title, jobId: job.id })));
            }

            aggregatedCandidates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setRecentCandidates(aggregatedCandidates.slice(0, 4));

            setStats({
                totalCandidates: totalCands,
                shortlisted: highScorers,
                avgScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
                activeJobs: jobsData.length
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
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
                    <StatCard icon={Users} label="Total Candidates" value={stats.totalCandidates} />
                    <StatCard icon={Star} label="Shortlisted" value={stats.shortlisted} />
                    <StatCard icon={ClipboardList} label="Avg AI Score" value={`${stats.avgScore}%`} />
                    <StatCard icon={Briefcase} label="Active Jobs" value={stats.activeJobs} />
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
                                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Created</div>
                                            <div className="text-sm font-bold text-slate-700">{formatShortDate(job.created_at)}</div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-indigo-100 group-hover:text-indigo-600 transition-all">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {jobs.length === 0 && (
                                <div className="text-center py-16 bg-white/30 rounded-3xl border-2 border-dashed border-slate-200">
                                    <Layers3 className="mx-auto text-slate-300 mb-4" size={40} />
                                    <p className="text-slate-400 font-bold">No active jobs found.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-8"
                    >
                        <div className="glass-morphism rounded-[2.5rem] p-8 border border-white/50">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Company Profile</h3>
                                    <p className="text-sm font-medium text-slate-400">Editable company information used across the platform.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <ProfileRow icon={Building2} label="Company" value={company?.name} />
                                <ProfileRow icon={Layers3} label="Industry" value={company?.industry} />
                                <ProfileRow icon={Globe} label="Website" value={company?.website} />
                                <ProfileRow icon={MapPin} label="Location" value={company?.location} />
                                <ProfileRow icon={UserCheck} label="Team Size" value={company?.employee_count_range} />
                                <ProfileRow icon={Mail} label="Contact Email" value={company?.contact_email} />
                            </div>

                            <Link to="/settings" className="btn btn-primary w-full justify-center mt-8 font-bold text-sm">
                                Edit Company Details
                            </Link>
                        </div>

                        <div className="glass-morphism rounded-[2.5rem] p-8 border border-white/50">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <ClipboardList size={20} />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Recent Candidates</h3>
                            </div>

                            <div className="space-y-4">
                                {recentCandidates.map((candidate) => (
                                    <Link
                                        key={candidate.resume_id}
                                        to={`/candidates?job_id=${candidate.jobId}`}
                                        className="block rounded-3xl border border-slate-100 bg-white/60 p-4 hover:bg-white hover:shadow-lg transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="font-black text-slate-900">{candidate.candidate_name}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{candidate.jobTitle}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-indigo-600">{candidate.score}%</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatRelativeTime(candidate.created_at)}</div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {recentCandidates.length === 0 && (
                                    <div className="text-sm font-medium text-slate-400">No candidates have been uploaded yet.</div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value }) => (
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
        </div>
        <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
    </motion.div>
);

const ProfileRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shadow-sm">
            <Icon size={18} />
        </div>
        <div className="min-w-0">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</div>
            <div className="text-sm font-black text-slate-700 truncate">{value || 'Add in Settings'}</div>
        </div>
    </div>
);

export default DashboardHR;
