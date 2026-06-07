import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import RecruiterCopilot from '../components/RecruiterCopilot';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Eye, Star, Brain, Clock, Users, TrendingUp, Building2, Layers3, Globe, MapPin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonDashboard } from '../components/ui/SkeletonStates';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

const DashboardManager = () => {
    const { user } = useAuth();
    const [company, setCompany] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [teamAttendance, setTeamAttendance] = useState([]);
    const [teamAvgRating, setTeamAvgRating] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.title = 'AI Hiring OS - Manager Dashboard';
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            if (user?.company_id) {
                const co = await api.get(`/companies/${user.company_id}`);
                setCompany(co);
            }

            const jobs = await api.get('/jobs');
            const candidateLists = await Promise.all(
                jobs.map(job => 
                    api.get(`/jobs/${job.id}/candidates`)
                       .then(cands => ({ job, cands }))
                       .catch(err => {
                           console.error(`Error fetching candidates for job ${job.id}:`, err);
                           return { job, cands: [] };
                       })
                )
            );

            let allCands = [];
            for (const { job, cands } of candidateLists) {
                allCands = allCands.concat(
                    cands
                        .filter(c => (c.candidate_intelligence?.candidate_intelligence_score ?? c.score) > 60)
                        .map(c => ({...c, jobTitle: job.title, jobId: job.id}))
                );
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
            setError(null);
            setLoading(false);
        } catch (error) { 
            console.error("Failed to load dashboard data:", error);
            setError(error.detail || error.message || 'Failed to load dashboard data.');
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
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Hiring Manager Portal" />
                <RecruiterCopilot />
                
                {loading && <div className="mt-8"><SkeletonDashboard /></div>}
                {error && !loading && <div className="mt-8"><ErrorState message={error} onRetry={() => { setLoading(true); setError(null); fetchData(); }} /></div>}
                
                {!loading && !error && (
                <motion.div 
                    variants={containerVariants}
                    initial="initial"
                    animate="animate"
                    className="space-y-10"
                >
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        <StatCard icon={Star} label="High Potential" value={candidates.length} color="indigo" />
                        <StatCard icon={Brain} label="AI Recommended" value={candidates.filter(c => (c.candidate_intelligence?.candidate_intelligence_score ?? c.score) >= 85).length} color="violet" />
                        <StatCard icon={Clock} label="Candidates Reviewed" value={candidates.length} color="emerald" />
                        <StatCard icon={Users} label="Team Present" value={teamAttendance.filter(r => r.status === 'present').length} color="indigo" />
                        <StatCard icon={TrendingUp} label="Team Avg Rating" value={`${teamAvgRating}/5`} color="violet" />
                    </div>


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

                    {/* Company Details Section */}
                    {company && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">Company Profile</h3>
                                    <p className="text-sm font-medium text-slate-400">View company details and contact information.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <ProfileRow icon={Building2} label="Company Name" value={company?.name} />
                                <ProfileRow icon={Layers3} label="Industry" value={company?.industry} />
                                <ProfileRow icon={Globe} label="Website" value={company?.website} />
                                <ProfileRow icon={MapPin} label="Location" value={company?.location} />
                                <ProfileRow icon={Users} label="Team Size" value={company?.employee_count_range} />
                                <ProfileRow icon={Mail} label="Contact Email" value={company?.contact_email} />
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
                                        key={c.resume_id} 
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
                                                    <span className="text-sm font-semibold text-indigo-600 italic">
                                                        Intelligence: {Math.round(c.candidate_intelligence?.candidate_intelligence_score ?? c.score)} / 100
                                                    </span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                        ATS {Math.round(c.candidate_intelligence?.ats_analysis?.ats_score ?? c.score)} / 100
                                                    </span>
                                                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                                        {c.candidate_intelligence?.hiring_recommendation || 'Needs Review'}
                                                    </span>
                                                    {(c.candidate_intelligence?.interview_focus_areas || []).slice(0, 2).map(area => (
                                                        <span key={`${c.resume_id}-${area}`} className="rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                                            {area}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <Link
                                            to={`/candidates?job_id=${c.jobId}`}
                                            className="w-full md:w-auto btn btn-primary px-5 py-2.5 text-sm font-semibold rounded-xl shadow-sm justify-center"
                                        >
                                            <Eye size={18} />
                                            Review Candidate
                                        </Link>
                                    </motion.div>
                                ))}
                                {candidates.length === 0 && (
                                    <EmptyState title="No candidates" description="No candidates have passed the AI screening yet." icon={Star} />
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
                )}
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

const ProfileRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shadow-sm">
            <Icon size={18} />
        </div>
        <div className="min-w-0">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</div>
            <div className="text-sm font-semibold text-slate-700 truncate">{value || 'N/A'}</div>
        </div>
    </div>
);

export default DashboardManager;


