import React, { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Brain, Play, CheckCircle2, Loader2, BarChart3, Award, Copy, ExternalLink } from 'lucide-react';
import { useRealtime } from '../hooks/useRealtime';

const InterviewAssistant = () => {
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [interviewType, setInterviewType] = useState('technical');
    const [session, setSession] = useState(null);
    const [starting, setStarting] = useState(false);
    const [companyStats, setCompanyStats] = useState(null);
    const { toast } = useToast();

    const fetchJobs = useCallback(async () => {
        try {
            const data = await api.get('/jobs');
            setJobs(data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchCompanyStats = useCallback(async () => {
        try {
            const data = await api.get('/interviews/company/analytics');
            setCompanyStats(data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        document.title = 'AI Hiring OS - AI Interview Assistant';
        fetchJobs();
        fetchCompanyStats();
    }, [fetchCompanyStats, fetchJobs]);

    const handleRealtimeEvent = useCallback((event) => {
        if (event.type === 'interview.completed') {
            fetchCompanyStats();
        }
    }, [fetchCompanyStats]);

    useRealtime(handleRealtimeEvent);

    const fetchCandidates = async (jobId) => {
        try {
            const data = await api.get(`/jobs/${jobId}/candidates`);
            setCandidates(data);
        } catch (err) { console.error(err); }
    };

    const handleSelectJob = (job) => {
        setSelectedJob(job);
        fetchCandidates(job.id);
    };

    const handleStartInterview = async () => {
        if (!selectedCandidate) return;
        setStarting(true);
        try {
            const data = await api.post('/interviews/start', {
                candidate_id: selectedCandidate.resume_id,
                job_id: selectedJob.id,
                interview_type: interviewType,
            });
            setSession(data);
            toast.success('Public interview link generated. Send it to the candidate.');
        } catch (err) { toast.error(err.detail || 'Failed to start interview'); }
        finally { setStarting(false); }
    };
    const publicInterviewUrl = session?.id ? `${window.location.origin}/public-interview/${session.id}` : '';

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="AI Interview Assistant" />

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                    {/* Company Stats */}
                    {companyStats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <MiniStatCard icon={Brain} label="Total Interviews" value={companyStats.total_interviews} />
                            <MiniStatCard icon={CheckCircle2} label="Completed" value={companyStats.completed_interviews} />
                            <MiniStatCard icon={BarChart3} label="Avg Score" value={`${companyStats.avg_overall_score}%`} />
                            <MiniStatCard icon={Award} label="Completion Rate" value={`${companyStats.completion_rate}%`} />
                        </div>
                    )}

                    {/* Interview Setup — shown when no active session */}
                    {!session && (
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-900 mb-8 flex items-center gap-3">
                                <Brain size={22} className="text-indigo-600" /> Create Candidate Interview Link
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Step 1: Select Job */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">1. Select Job</h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {jobs.map(job => (
                                            <button key={job.id} onClick={() => handleSelectJob(job)}
                                                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedJob?.id === job.id ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-600/10' : 'border-slate-100 bg-white/50 hover:bg-white'}`}>
                                                <div className="font-bold text-slate-900 text-sm">{job.title}</div>
                                            </button>
                                        ))}
                                        {jobs.length === 0 && <p className="text-sm text-slate-400 py-4">No jobs found.</p>}
                                    </div>
                                </div>

                                {/* Step 2: Select Candidate */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">2. Select Candidate</h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {candidates.map(c => (
                                            <button key={c.resume_id} onClick={() => setSelectedCandidate(c)}
                                                className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedCandidate?.resume_id === c.resume_id ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-600/10' : 'border-slate-100 bg-white/50 hover:bg-white'}`}>
                                                <div className="font-bold text-slate-900 text-sm">{c.candidate_name}</div>
                                                <div className="text-xs text-slate-400 font-medium mt-0.5">Score: {c.score}%</div>
                                            </button>
                                        ))}
                                        {selectedJob && candidates.length === 0 && <p className="text-sm text-slate-400 py-4">No candidates for this job.</p>}
                                        {!selectedJob && <p className="text-sm text-slate-400 py-4">Select a job first.</p>}
                                    </div>
                                </div>

                                {/* Step 3: Interview Type */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">3. Interview Type</h4>
                                    <div className="space-y-2">
                                        {['technical', 'behavioral', 'general'].map(t => (
                                            <button key={t} onClick={() => setInterviewType(t)}
                                                className={`w-full text-left p-4 rounded-2xl border transition-all capitalize ${interviewType === t ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-600/10' : 'border-slate-100 bg-white/50 hover:bg-white'}`}>
                                                <div className="font-bold text-slate-900 text-sm capitalize">{t}</div>
                                            </button>
                                        ))}
                                    </div>

                                    <button onClick={handleStartInterview} disabled={!selectedCandidate || !selectedJob || starting}
                                        className="btn btn-primary w-full justify-center py-4 mt-6 font-semibold text-base shadow-sm disabled:opacity-40">
                                        {starting ? <Loader2 className="animate-spin" size={22} /> : <Play size={22} />}
                                        {starting ? 'Creating Link...' : 'Generate Public Interview Link'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Link Generated State */}
                    {session && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden"
                        >
                            {/* Success Header */}
                            <div className="bg-emerald-500 px-8 py-6 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={26} className="text-white" />
                                </div>
                                <div>
                                    <div className="text-white font-bold text-lg">Interview Link Generated!</div>
                                    <div className="text-emerald-100 text-sm font-semibold">Copy the link below and send it to the candidate.</div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Candidate Info — WHO to send it to */}
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Send this interview to</div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0">
                                            {selectedCandidate?.candidate_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-base">{selectedCandidate?.candidate_name}</div>
                                            {selectedCandidate?.email ? (
                                                <a
                                                    href={`mailto:${selectedCandidate.email}?subject=Your AI Interview for ${selectedJob?.title}&body=Hi ${selectedCandidate?.candidate_name},%0A%0AYou have been shortlisted for the ${selectedJob?.title} position. Please complete your AI interview using the link below:%0A%0A${publicInterviewUrl}%0A%0AThis is an automated AI interview. Please ensure you are in a quiet environment.%0A%0AGood luck!`}
                                                    className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1.5 mt-0.5"
                                                >
                                                    <ExternalLink size={13} /> {selectedCandidate.email}
                                                </a>
                                            ) : (
                                                <div className="text-sm font-medium text-slate-400 mt-0.5">No email on record — share the link manually</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* The Link */}
                                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-2">Candidate Interview Link</div>
                                    <div className="break-all text-sm font-semibold text-indigo-950 mb-4">{publicInterviewUrl}</div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(publicInterviewUrl);
                                                    toast.success('Link copied to clipboard!');
                                                } catch {
                                                    const el = document.createElement('textarea');
                                                    el.value = publicInterviewUrl;
                                                    el.style.position = 'fixed';
                                                    el.style.opacity = '0';
                                                    document.body.appendChild(el);
                                                    el.select();
                                                    document.execCommand('copy');
                                                    document.body.removeChild(el);
                                                    toast.success('Link copied!');
                                                }
                                            }}
                                            className="btn btn-secondary flex-1 justify-center py-3 text-sm font-bold"
                                        >
                                            <Copy size={16} /> Copy Link
                                        </button>
                                        <a
                                            href={publicInterviewUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-primary flex-1 justify-center py-3 text-sm font-bold"
                                        >
                                            <ExternalLink size={16} /> Preview Interview
                                        </a>
                                        {selectedCandidate?.email && (
                                            <a
                                                href={`mailto:${selectedCandidate.email}?subject=Your AI Interview for ${selectedJob?.title}&body=Hi ${selectedCandidate?.candidate_name},%0A%0AYou have been shortlisted for the ${selectedJob?.title} position. Please complete your AI interview using the link below:%0A%0A${publicInterviewUrl}%0A%0AThis is an automated AI interview. Please ensure you are in a quiet environment.%0A%0AGood luck!`}
                                                className="btn justify-center py-3 text-sm font-bold bg-slate-900 text-white hover:bg-slate-700 flex-1"
                                            >
                                                <ExternalLink size={16} /> Send Email
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Next action */}
                                <button
                                    onClick={() => { setSession(null); setSelectedCandidate(null); setSelectedJob(null); setCandidates([]); }}
                                    className="btn btn-secondary w-full justify-center py-3 font-bold text-sm"
                                >
                                    <Play size={16} /> Generate for Another Candidate
                                </button>
                            </div>
                        </motion.div>
                    )}
                    {/* Recent Interviews */}
                    {companyStats?.interviews?.length > 0 && !session && (
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Interviews</h3>
                            <div className="space-y-3">
                                {companyStats.interviews.slice(0, 5).map((interview, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-slate-100 hover:bg-white transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">
                                                {interview.candidate_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{interview.candidate_name}</div>
                                                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{interview.interview_type} · {interview.status}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {interview.overall_score !== null && (
                                                <span className="text-lg font-semibold text-indigo-600">{interview.overall_score}%</span>
                                            )}
                                            {interview.recommendation && <RecommendationBadge recommendation={interview.recommendation} small />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

const MiniStatCard = ({ icon: Icon, label, value }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-500 group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300">
                <Icon size={24} />
            </div>
        </div>
        <h2 className="text-3xl font-semibold text-slate-900 tracking-tighter">{value}</h2>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </motion.div>
);

const recommendationConfig = {
    strong_hire: { label: 'Strong Hire', bg: 'bg-emerald-500', text: 'text-white' },
    hire: { label: 'Hire', bg: 'bg-emerald-400', text: 'text-white' },
    consider: { label: 'Consider', bg: 'bg-amber-400', text: 'text-white' },
    reject: { label: 'Reject', bg: 'bg-rose-500', text: 'text-white' },
};

const RecommendationBadge = ({ recommendation, small = false }) => {
    const config = recommendationConfig[recommendation] || recommendationConfig.consider;
    return (
        <span className={`${config.bg} ${config.text} ${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-2 text-xs'} font-semibold uppercase tracking-widest rounded-xl shadow-lg`}>
            {config.label}
        </span>
    );
};

export default InterviewAssistant;



