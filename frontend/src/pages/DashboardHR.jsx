import React, { useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import RecruiterCopilot from '../components/RecruiterCopilot';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Building2, MapPin, Globe, Mail, Layers3, UserCheck, Clock, TrendingUp, Mic, Wallet, Receipt, BadgeDollarSign, Users, Star, ClipboardList, Briefcase } from 'lucide-react';
import { formatRelativeTime, formatShortDate } from '../utils/date';
import { SkeletonDashboard } from '../components/ui/SkeletonStates';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

const DashboardHR = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalCandidates: 0,
        shortlisted: 0,
        avgScore: 0,
        activeJobs: 0
    });
    const [jobs, setJobs] = useState([]);
    const [recentCandidates, setRecentCandidates] = useState([]);
    const [company, setCompany] = useState(() => {
        try {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                if (parsedUser && parsedUser.company_id) {
                    const cachedCompany = localStorage.getItem(`company_${parsedUser.company_id}`);
                    if (cachedCompany) {
                        return JSON.parse(cachedCompany);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to parse user/company cache in HR dashboard:', e);
        }
        return null;
    });
    const [hrmsStats, setHrmsStats] = useState({ totalEmployees: 0, attendanceToday: 0, avgPerformance: 0, interviewCompletion: 0 });
    const [payrollStats, setPayrollStats] = useState({ totalPayrollCost: 0, pendingPayroll: 0, employeesPaid: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user?.company_id) {
            const cachedCompany = localStorage.getItem(`company_${user.company_id}`);
            if (cachedCompany) {
                setCompany(JSON.parse(cachedCompany));
            }
        }
    }, [user]);

    const fetchData = useCallback(async () => {
        try {
            const currentUser = await api.get('/me');
            const [jobsData, companyData] = await Promise.all([
                api.get('/jobs'),
                api.get(`/companies/${currentUser.company_id}`),
            ]);

            setJobs(jobsData.slice(0, 5));
            setCompany(companyData);
            if (currentUser?.company_id) {
                localStorage.setItem(`company_${currentUser.company_id}`, JSON.stringify(companyData));
            }
            
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

            // Fetch Phase 5 HRMS stats
            try {
                const [empData, attData, perfData, intData] = await Promise.all([
                    api.get('/employees?limit=1').catch(() => ({ total: 0 })),
                    api.get('/attendance/company').catch(() => ({ present_count: 0 })),
                    api.get('/performance/company').catch(() => ({ avg_rating: 0 })),
                    api.get('/interviews/company/analytics').catch(() => ({ completion_rate: 0 })),
                ]);
                setHrmsStats({
                    totalEmployees: empData.total || 0,
                    attendanceToday: attData.present_count || 0,
                    avgPerformance: perfData.avg_rating || 0,
                    interviewCompletion: intData.completion_rate || 0,
                });
                const payrollData = await api.get('/payroll?limit=500').catch(() => ({ summary: {} }));
                setPayrollStats({
                    totalPayrollCost: payrollData.summary?.total_payroll_cost || 0,
                    pendingPayroll: payrollData.summary?.pending_payroll || 0,
                    employeesPaid: payrollData.summary?.employees_paid || 0,
                });
            } catch (e) { console.error('HRMS stats fetch failed:', e); }
            setError(null);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load dashboard data, retrying in 3s...", error);
            setTimeout(fetchData, 3000);
        }
    }, []);

    useEffect(() => {
        document.title = 'AI Hiring OS - HR Dashboard';
        fetchData();
    }, [fetchData]);

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
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10 relative">
                <Topbar title="System Overview" />
                <RecruiterCopilot />
                
                {loading && <div className="mt-8"><SkeletonDashboard /></div>}
                {error && !loading && <div className="mt-8"><ErrorState message={error} onRetry={() => { setLoading(true); setError(null); fetchData(); }} /></div>}
                
                {!loading && !error && (
                <>
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

                {/* HRMS Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10"
                >
                    <StatCard icon={UserCheck} label="Total Employees" value={hrmsStats.totalEmployees} />
                    <StatCard icon={Clock} label="Present Today" value={hrmsStats.attendanceToday} />
                    <StatCard icon={TrendingUp} label="Avg Performance" value={`${hrmsStats.avgPerformance}/5`} />
                    <StatCard icon={Mic} label="Interview Rate" value={`${hrmsStats.interviewCompletion}%`} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
                >
                    <Link to="/payroll"><StatCard icon={Wallet} label="Total Payroll Cost" value={`₹${Math.round(payrollStats.totalPayrollCost).toLocaleString('en-IN')}`} /></Link>
                    <Link to="/payroll"><StatCard icon={Receipt} label="Pending Payroll" value={payrollStats.pendingPayroll} /></Link>
                    <Link to="/payroll"><StatCard icon={BadgeDollarSign} label="Employees Paid" value={payrollStats.employeesPaid} /></Link>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Jobs */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-2 bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900">Recent Job Postings</h3>
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
                                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{job.department || 'General'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="hidden md:block text-right">
                                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Created</div>
                                            <div className="text-sm font-bold text-slate-700">{formatShortDate(job.created_at)}</div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-indigo-100 group-hover:text-indigo-600 transition-all">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {jobs.length === 0 && (
                                <EmptyState title="No active jobs" description="You have not created any job postings yet." />
                            )}
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-8"
                    >
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">Company Profile</h3>
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

                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <ClipboardList size={20} />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900">Recent Candidates</h3>
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
                                                <div className="font-semibold text-slate-900">{candidate.candidate_name}</div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{candidate.jobTitle}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-semibold text-indigo-600">{candidate.score}%</div>
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{formatRelativeTime(candidate.created_at)}</div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {recentCandidates.length === 0 && (
                                    <EmptyState title="No recent candidates" description="No candidates have been uploaded recently." />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
                </>
                )}
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
        className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-500 group"
    >
        <div className="flex justify-between items-start mb-6">
            <div className={`w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300`}>
                <Icon size={24} />
            </div>
        </div>
        <div className="space-y-1">
            <h2 className="text-4xl font-semibold text-slate-900 tracking-tighter">{value}</h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
    </motion.div>
);

const ProfileRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shadow-sm">
            <Icon size={18} />
        </div>
        <div className="min-w-0">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</div>
            <div className="text-sm font-semibold text-slate-700 truncate">{value || 'Add in Settings'}</div>
        </div>
    </div>
);

export default DashboardHR;


