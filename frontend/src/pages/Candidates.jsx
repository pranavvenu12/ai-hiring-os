import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Upload, ChevronRight, Brain, Loader2, CheckCircle2, FileText, Search, User, Users, SlidersHorizontal, ArrowLeft, Mic, Target, Github, Globe, BriefcaseBusiness, AlertTriangle, Code2 } from 'lucide-react';
import { formatRelativeTime } from '../utils/date';
import { useRealtime } from '../hooks/useRealtime';

const Candidates = () => {
    const [searchParams] = useSearchParams();
    const jobId = searchParams.get('job_id');
    
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [jobTitle, setJobTitle] = useState('Talent Pool');
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef(null);
    const fetchCandidatesRef = useRef(null);
    const { toast } = useToast();
    
    // Drawer tabs
    const [activeTab, setActiveTab] = useState('resume'); // 'resume' or 'interview'
    const [candidateInterviews, setCandidateInterviews] = useState([]);
    const [loadingInterviews, setLoadingInterviews] = useState(false);
    const [shortlisting, setShortlisting] = useState(false);

    const fetchJobTitle = useCallback(async () => {
        try {
            const jobs = await api.get('/jobs');
            const job = jobs.find(j => j.id === jobId);
            if (job) setJobTitle(`Candidates for ${job.title}`);
        } catch (err) { console.error(err); }
    }, [jobId]);

    const fetchCandidates = useCallback(async () => {
        try {
            let data = [];
            if (jobId) {
                data = await api.get(`/jobs/${jobId}/candidates`);
            } else {
                const jobs = await api.get('/jobs');
                for (const j of jobs) {
                    const cands = await api.get(`/jobs/${j.id}/candidates`);
                    data = data.concat(cands.map(c => ({ ...c, jobTitle: j.title })));
                }
            }
            setCandidates(data);
            
            if (data.some(c => ['pending', 'processing'].includes(c.status))) {
                setTimeout(() => fetchCandidatesRef.current?.(), 3000);
            }
        } catch (err) { console.error(err); }
    }, [jobId]);

    const fetchCandidateInterviews = useCallback(async (candId) => {
        setLoadingInterviews(true);
        try {
            const response = await api.get(`/interviews/candidate/${candId}`);
            setCandidateInterviews(response.interviews || []);
        } catch (err) {
            console.error("Error fetching interviews:", err);
            setCandidateInterviews([]);
        } finally {
            setLoadingInterviews(false);
        }
    }, []);

    const handleRealtimeEvent = useCallback((event) => {
        if (!['resume.uploaded', 'resume.processed', 'ai_score.generated'].includes(event.type)) return;
        const payload = event.payload || {};
        if (jobId && payload.job_id !== jobId) return;

        if (event.type === 'resume.uploaded') {
            fetchCandidates();
            return;
        }

        setCandidates((current) => current.map((candidate) => {
            if (candidate.resume_id !== payload.resume_id) return candidate;
            return {
                ...candidate,
                status: event.type === 'resume.processed' ? 'processing' : payload.status || 'completed',
                score: payload.score ?? candidate.score,
            };
        }));
    }, [fetchCandidates, jobId]);

    useRealtime(handleRealtimeEvent);

    useEffect(() => {
        fetchCandidatesRef.current = fetchCandidates;
    }, [fetchCandidates]);

    useEffect(() => {
        document.title = 'AI Hiring OS - Talent Pool';
        fetchCandidates();
        if (jobId) fetchJobTitle();
    }, [fetchCandidates, fetchJobTitle, jobId]);

    useEffect(() => {
        if (selectedCandidate) {
            fetchCandidateInterviews(selectedCandidate.resume_id);
            setActiveTab('resume'); // Default tab when opening
        } else {
            setCandidateInterviews([]);
        }
    }, [fetchCandidateInterviews, selectedCandidate]);

    const handleUpload = async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        if (!jobId) { toast.warning('Please select a job first'); return; }

        setIsUploading(true);
        const formData = new FormData();
        for (const f of files) formData.append('files', f);

        try {
            await api.post(`/jobs/${jobId}/upload-resumes`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchCandidates();
            toast.success('Resume(s) uploaded successfully! Parsing and scoring candidates...');
        } catch (err) { toast.error(err.detail || 'Upload failed'); }
        finally { setIsUploading(false); }
    };

    const handleShortlist = async () => {
        if (!selectedCandidate) return;
        setShortlisting(true);
        try {
            const response = await api.post(`/jobs/candidates/${selectedCandidate.resume_id}/shortlist`);
            toast.success('Candidate shortlisted and AI Interview session generated!');
            setSelectedCandidate(prev => ({
                ...prev,
                hiring_status: response.hiring_status
            }));
            if (response.session_id) {
                setCandidateInterviews([{ id: response.session_id }]);
                const link = `${window.location.origin}/public-interview/${response.session_id}`;
                navigator.clipboard?.writeText(link);
                toast.success(`Candidate interview link copied: ${link}`);
            }
            fetchCandidates();
            fetchCandidateInterviews(selectedCandidate.resume_id);
        } catch (err) {
            toast.error(err.detail || 'Failed to shortlist candidate.');
        } finally {
            setShortlisting(false);
        }
    };

    const filteredCandidates = candidates.filter(c => 
        c.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const selectedIntel = selectedCandidate?.candidate_intelligence || {};

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Talent Acquisition" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 md:gap-6">
                        <div className="min-w-0">
                            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{jobTitle}</h2>
                            <p className="text-sm font-medium text-slate-400">Evaluate and shortlist top talent with AI precision.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full md:w-auto">
                            <div className="relative group flex-1 md:flex-none md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search candidates..." 
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium text-sm shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => fileInputRef.current.click()} 
                                disabled={isUploading || !jobId}
                                className="btn btn-primary px-6 py-3 shadow-sm whitespace-nowrap justify-center"
                            >
                                {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />} 
                                Upload Resumes
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept=".pdf" className="hidden" />
                        </div>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredCandidates.map((c, i) => (
                            <motion.button
                                type="button"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={c.resume_id}
                                onClick={() => setSelectedCandidate(c)}
                                className={`w-full text-left rounded-[1.25rem] border bg-white p-4 shadow-sm transition ${
                                    selectedCandidate?.resume_id === c.resume_id ? 'border-indigo-200' : 'border-slate-200'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                        <User size={19} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-slate-950 leading-snug break-words">{c.candidate_name}</h3>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                                            Applied {formatRelativeTime(c.created_at)}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 shrink-0 mt-2" />
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Intelligence</p>
                                        <p className="text-lg font-semibold text-indigo-600 mt-1">{Math.round(c.candidate_intelligence?.candidate_intelligence_score ?? c.score)} / 100</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status</p>
                                        <p className={`text-xs font-semibold uppercase tracking-wider mt-2 ${
                                            c.status === 'completed' ? 'text-emerald-600' :
                                            c.status === 'failed' ? 'text-rose-600' : 'text-amber-600'
                                        }`}>
                                            {c.status}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 rounded-xl bg-white border border-slate-100 px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Position</p>
                                    <p className="text-sm font-medium text-slate-600 mt-1 break-words">{c.jobTitle || 'Unassigned'}</p>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(c.candidate_intelligence?.explicit_skills || c.matched_skills || []).slice(0, 4).map(skill => (
                                        <span key={skill} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">{skill}</span>
                                    ))}
                                </div>
                            </motion.button>
                        ))}
                        {filteredCandidates.length === 0 && (
                            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                    <Users size={28} />
                                </div>
                                <h4 className="text-base font-semibold text-slate-900 mb-2">Pool is empty</h4>
                                <p className="text-sm font-medium text-slate-400">
                                    {jobId ? 'Upload resumes to start AI evaluation.' : 'Select a job posting to view candidates.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                        <table className="min-w-[920px] w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Candidate</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Candidate Intelligence</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Position</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/30">
                                {filteredCandidates.map((c, i) => (
                                    <motion.tr 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={c.resume_id} 
                                        onClick={() => setSelectedCandidate(c)}
                                        className={`hover:bg-white transition-all duration-300 cursor-pointer group ${selectedCandidate?.resume_id === c.resume_id ? 'bg-white shadow-inner' : ''}`}
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.candidate_name}</div>
                                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Applied {formatRelativeTime(c.created_at)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="text-lg font-semibold text-indigo-600 min-w-[5.5rem] whitespace-nowrap">{Math.round(c.candidate_intelligence?.candidate_intelligence_score ?? c.score)} / 100</div>
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${c.candidate_intelligence?.candidate_intelligence_score ?? c.score}%` }}
                                                        transition={{ duration: 1, delay: i * 0.1 }}
                                                        className={`h-full rounded-full ${(c.candidate_intelligence?.candidate_intelligence_score ?? c.score) > 80 ? 'bg-emerald-500' : (c.candidate_intelligence?.candidate_intelligence_score ?? c.score) > 50 ? 'bg-indigo-600' : 'bg-rose-500'}`} 
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest ${
                                                    c.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                                                    c.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {c.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-bold text-slate-500">{c.jobTitle || 'Unassigned'}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:border-indigo-100 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all ml-auto">
                                                <ChevronRight size={18} />
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                                {filteredCandidates.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-24 text-center">
                                            <div className="max-w-xs mx-auto">
                                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                                                    <Users size={32} />
                                                </div>
                                                <h4 className="text-lg font-semibold text-slate-900 mb-2">Pool is empty</h4>
                                                <p className="text-sm font-medium text-slate-400">
                                                    {jobId ? 'Upload some resumes to start the AI evaluation process.' : 'Select a job posting to view its candidates.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Candidate Insight Drawer */}
            <AnimatePresence>
                {selectedCandidate && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedCandidate(null)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.aside 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 w-full max-w-[580px] h-screen bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] z-[101] overflow-y-auto flex flex-col font-inter"
                        >
                            {/* Drawer Header */}
                            <div className="p-4 sm:p-8 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => setSelectedCandidate(null)}
                                            className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div>
                                            <h3 className="text-xl font-semibold text-slate-900">{selectedCandidate.candidate_name}</h3>
                                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{selectedCandidate.jobTitle || 'Candidate Profile'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <button 
                                            className="btn btn-secondary flex-1 sm:flex-none justify-center px-4 py-2 text-xs font-bold"
                                            onClick={() => window.open(selectedCandidate.file_url, '_blank')}
                                            disabled={!selectedCandidate.file_url}
                                        >Download PDF</button>
                                        {selectedCandidate.hiring_status === 'shortlisted' ? (
                                            <span className="btn bg-emerald-500 text-white flex-1 sm:flex-none justify-center px-4 py-2 text-xs font-bold shadow-md cursor-default">
                                                Shortlisted
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={handleShortlist} 
                                                disabled={shortlisting} 
                                                className="btn btn-primary flex-1 sm:flex-none justify-center px-4 py-2 text-xs font-bold"
                                            >
                                                {shortlisting && <Loader2 className="animate-spin" size={12} />}
                                                Shortlist
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Drawer Tabs Selector */}
                                <div className="flex border-b border-slate-100 gap-6 mt-4">
                                    <button 
                                        onClick={() => setActiveTab('resume')}
                                        className={`pb-3 text-xs font-semibold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'resume' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Resume Insights
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('interview')}
                                        className={`pb-3 text-xs font-semibold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === 'interview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Mic size={14} /> AI Interview Analysis
                                    </button>
                                </div>
                            </div>
                            
                            {/* Drawer Content */}
                            <div className="p-4 sm:p-8 space-y-8 flex-1">
                                {activeTab === 'resume' ? (
                                    <div className="space-y-8">
                                        {/* AI Score Hero */}
                                        <div className="bg-slate-950 rounded-[1.5rem] p-8 text-white relative overflow-hidden shadow-md shadow-slate-300/50">
                                            <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
                                                <Brain size={200} />
                                            </div>
                                            <div className="relative z-10 flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 text-indigo-100 font-semibold text-xs uppercase tracking-[0.2em] mb-4">
                                                        <Brain size={16} /> Candidate Intelligence Score
                                                    </div>
                                                    <div className="text-6xl font-semibold">{Math.round(selectedIntel.candidate_intelligence_score ?? selectedCandidate.score)}</div>
                                                    <div className="mt-1 text-sm font-bold text-indigo-100">/ 100</div>
                                                </div>
                                                <div className="w-24 h-24 rounded-full border-8 border-white/10 flex items-center justify-center relative">
                                                    <div className="text-xs font-semibold uppercase text-white/50 tracking-widest">Intel</div>
                                                    <div className="absolute inset-0 rounded-full border-8 border-white border-t-transparent animate-spin-slow" />
                                                </div>
                                            </div>
                                            <div className="mt-8 pt-8 border-t border-white/10">
                                                <p className="text-sm font-medium text-indigo-50 leading-relaxed italic">
                                                    {(() => {
                                                        const exp = selectedCandidate.explanation || '';
                                                        const sum = selectedCandidate.summary || '';
                                                        const isFallback = (s) => {
                                                            const lower = s.toLowerCase();
                                                            return lower.includes('unavailable') || lower.includes('deterministic') || lower.includes('fallback');
                                                        };
                                                        if (selectedCandidate.status !== 'completed') {
                                                            return 'Processing AI-driven insights...';
                                                        }
                                                        if (exp && !isFallback(exp)) {
                                                            return `"${exp}"`;
                                                        }
                                                        if (sum && !isFallback(sum)) {
                                                            return `"${sum}"`;
                                                        }
                                                        return '"Evaluation complete. Profile matched against job requirements."';
                                                    })()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/60 p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 border border-indigo-100 flex items-center justify-center">
                                                    <Brain size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900">AI Hiring Insights</h4>
                                                    <p className="text-xs font-semibold text-indigo-700/70">Advisory only. Final decision remains human approved.</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InsightTile
                                                    label="Hiring Recommendation"
                                                    value={selectedIntel.hiring_recommendation || (selectedCandidate.score >= 75 ? 'Strong Fit' : 'Needs Review')}
                                                />
                                                <InsightTile
                                                    label="Interview Readiness"
                                                    value={selectedCandidate.score >= 70 ? 'Ready for adaptive interview.' : 'Review resume gaps before interview.'}
                                                />
                                                <InsightTile
                                                    label="Risk Analysis"
                                                    value={(selectedCandidate.missing_skills || []).length > 3 ? 'Broad skill gaps detected.' : 'No major skill-gap concentration.'}
                                                />
                                                <InsightTile
                                                    label="Suggested Next Action"
                                                    value={selectedCandidate.hiring_status === 'shortlisted' ? 'Send interview link and review scorecard.' : 'Shortlist only after HR review.'}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <MetricTile label="ATS Score" value={`${Math.round(selectedIntel.ats_analysis?.ats_score ?? selectedCandidate.score)} / 100`} />
                                            <MetricTile label="Keyword Match" value={`${Math.round(selectedIntel.ats_analysis?.keyword_match ?? selectedCandidate.skill_match_score ?? 0)}%`} />
                                            <MetricTile label="Recommendation" value={selectedIntel.hiring_recommendation || 'Needs Review'} />
                                        </div>

                                        <IntelligenceSection icon={Target} title="ATS Analysis">
                                            <div className="space-y-4">
                                                <ScoreProgress label="ATS Score" score={selectedIntel.ats_analysis?.ats_score || selectedCandidate.score || 0} color="indigo" />
                                                <ScoreProgress label="Keyword Match" score={selectedIntel.ats_analysis?.keyword_match || selectedCandidate.skill_match_score || 0} color="violet" />
                                                <SkillGroup
                                                    label="Missing Keywords"
                                                    skills={selectedIntel.ats_analysis?.missing_keywords || selectedCandidate.missing_skills || []}
                                                    emptyLabel="No major missing keywords detected."
                                                    variant="missing"
                                                />
                                            </div>
                                        </IntelligenceSection>

                                        {/* Skills Section */}
                                        <div className="space-y-6">
                                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <SlidersHorizontal size={14} /> Technical Analysis
                                            </h4>
                                            
                                            <div className="space-y-6">
                                                <ScoreProgress label="Technical Proficiency" score={selectedCandidate.skill_match_score || 0} color="indigo" />
                                                <ScoreProgress label="Semantic Relevance" score={selectedCandidate.semantic_score || 0} color="violet" />
                                            </div>

                                            <div className="pt-6">
                                                <SkillGroup
                                                    label="Explicit Skills"
                                                    skills={selectedIntel.explicit_skills || selectedCandidate.matched_skills || []}
                                                    emptyLabel="No explicit matched skills yet."
                                                    variant="matched"
                                                />
                                                <div className="mt-6">
                                                    <SkillGroup
                                                        label="Inferred Skills"
                                                        skills={selectedIntel.inferred_skills || []}
                                                        emptyLabel="No inferred skills detected yet."
                                                        variant="inferred"
                                                    />
                                                    <p className="mt-3 text-xs font-semibold text-slate-400 leading-relaxed">
                                                        {selectedIntel.inferred_skills_explanation || 'These skills were inferred from project descriptions and work experience.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <IntelligenceSection icon={BriefcaseBusiness} title="Project Intelligence">
                                            <div className="space-y-3">
                                                {(selectedIntel.project_intelligence || []).length > 0 ? (
                                                    selectedIntel.project_intelligence.map((project, index) => (
                                                        <ProjectIntelCard key={`${project.name}-${index}`} project={project} />
                                                    ))
                                                ) : (
                                                    <EmptyIntel text="No structured project intelligence found in the resume text." />
                                                )}
                                            </div>
                                        </IntelligenceSection>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <ExternalIntelCard
                                                icon={Github}
                                                title="GitHub Intelligence"
                                                data={selectedIntel.github_intelligence}
                                                empty="No GitHub URL detected."
                                                fields={[
                                                    ['GitHub Score', selectedIntel.github_intelligence?.github_score ? `${selectedIntel.github_intelligence.github_score} / 100` : null],
                                                    ['Languages', selectedIntel.github_intelligence?.languages?.join(', ')],
                                                    ['Repositories', selectedIntel.github_intelligence?.repositories],
                                                    ['Project Quality', selectedIntel.github_intelligence?.project_quality],
                                                    ['Activity Summary', selectedIntel.github_intelligence?.activity_summary],
                                                ]}
                                            />
                                            <ExternalIntelCard
                                                icon={Globe}
                                                title="Portfolio Intelligence"
                                                data={selectedIntel.portfolio_intelligence}
                                                empty="No portfolio URL detected."
                                                fields={[
                                                    ['Portfolio Score', selectedIntel.portfolio_intelligence?.portfolio_score ? `${selectedIntel.portfolio_intelligence.portfolio_score} / 100` : null],
                                                    ['Portfolio Summary', selectedIntel.portfolio_intelligence?.portfolio_summary],
                                                ]}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <BulletIntelCard title="Candidate Strengths" items={selectedIntel.candidate_strengths || []} />
                                            <BulletIntelCard title="Candidate Weaknesses" items={selectedIntel.candidate_weaknesses || []} tone="warning" />
                                        </div>

                                        <IntelligenceSection icon={AlertTriangle} title="Interview Focus Areas">
                                            <div className="flex flex-wrap gap-2">
                                                {(selectedIntel.interview_focus_areas || []).map(area => (
                                                    <span key={area} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">
                                                        {area}
                                                    </span>
                                                ))}
                                                {(!selectedIntel.interview_focus_areas || selectedIntel.interview_focus_areas.length === 0) && (
                                                    <EmptyIntel text="No special focus areas generated yet." />
                                                )}
                                            </div>
                                        </IntelligenceSection>

                                        <div className="space-y-6 pt-6 border-t border-slate-100">
                                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Experience Summary</h4>
                                            <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="space-y-2 flex-1">
                                                        <div className="text-sm font-bold text-slate-700 leading-relaxed">
                                                            {(() => {
                                                                const sum = selectedCandidate.summary || '';
                                                                const exp = selectedCandidate.explanation || '';
                                                                const isFallback = (s) => {
                                                                    const lower = s.toLowerCase();
                                                                    return lower.includes('unavailable') || lower.includes('deterministic') || lower.includes('fallback');
                                                                };
                                                                if (sum && !isFallback(sum)) return sum;
                                                                if (exp && !isFallback(exp)) return exp;
                                                                return 'Profile analysis complete. Evaluation based on candidate skills, domain experience, and job description alignment.';
                                                            })()}
                                                        </div>
                                                        <div className="text-xs font-medium text-slate-400">
                                                            Resume uploaded {formatRelativeTime(selectedCandidate.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {loadingInterviews ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                                                <span className="text-sm font-medium">Fetching interview details...</span>
                                            </div>
                                        ) : candidateInterviews.length > 0 ? (
                                            candidateInterviews.map((session) => (
                                                <div key={session.id} className="space-y-8">
                                                    {/* AI Evaluation Overview */}
                                                    <div className="bg-slate-950 rounded-[1.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/30">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div>
                                                                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">AI INTERVIEW REPORT</span>
                                                                <h4 className="text-2xl font-semibold mt-1 capitalize">{session.interview_type} Session</h4>
                                                            </div>
                                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${
                                                                session.recommendation === 'strong_hire' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                                                session.recommendation === 'hire' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                                                                session.recommendation === 'consider' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                                                                'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                                            }`}>
                                                                {session.recommendation?.replace('_', ' ')}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-white/10">
                                                            <ScoreSummaryCard label="Overall Score" score={session.overall_score || 0} />
                                                            <ScoreSummaryCard label="Technical" score={session.technical_score || 0} />
                                                            <ScoreSummaryCard label="Communication" score={session.communication_score || 0} />
                                                            <ScoreSummaryCard label="Confidence" score={session.confidence_score || 0} />
                                                        </div>

                                                        <div className="mt-6 pt-2">
                                                            <h5 className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-2">AI Summary</h5>
                                                            <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
                                                                "{session.ai_summary || 'No review summary generated.'}"
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {session.interview_metrics?.aggregate && (
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                                <Mic size={14} /> Voice Analytics
                                                            </h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                <MetricTile label="Fluency" value={`${session.interview_metrics.aggregate.fluency_score || 0}%`} />
                                                                <MetricTile label="Pace" value={`${session.interview_metrics.aggregate.speaking_pace_wpm || 0} WPM`} />
                                                                <MetricTile label="Fillers" value={session.interview_metrics.aggregate.filler_word_count || 0} />
                                                                <MetricTile label="Confidence" value={`${session.interview_metrics.aggregate.confidence_score || 0}%`} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {session.interview_metrics?.voice_answers?.length > 0 && (
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Interview Timeline</h4>
                                                            <div className="space-y-3">
                                                                {session.interview_metrics.voice_answers.map((answer) => (
                                                                    <div key={`${session.id}-${answer.question_index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                                        <div className="text-xs font-semibold text-indigo-600">Question {answer.question_index + 1}</div>
                                                                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{answer.text}</p>
                                                                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                                                            <span>{answer.metrics?.speaking_pace_wpm || 0} WPM</span>
                                                                            <span>{answer.metrics?.filler_word_count || 0} fillers</span>
                                                                            <span>{answer.source || 'AssemblyAI'}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Transcript Segment */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <FileText size={14} /> Full Transcript
                                                        </h4>
                                                        {session.interview_transcript && (
                                                            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm leading-7 text-slate-600 whitespace-pre-wrap">
                                                                {session.interview_transcript}
                                                            </div>
                                                        )}
                                                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 divide-y divide-slate-100">
                                                            {session.transcript && session.transcript.length > 0 ? (
                                                                session.transcript.map((qa, index) => (
                                                                    <div key={index} className="pt-4 space-y-2">
                                                                        <div className="text-xs font-semibold text-indigo-600">Q{index + 1}: {qa.question}</div>
                                                                        <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed">
                                                                            {qa.answer}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-xs text-slate-400 italic">No Q&A recorded in transcript.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : selectedCandidate.hiring_status === 'shortlisted' ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                                                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center animate-pulse shadow-sm">
                                                    <Mic size={28} />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-lg font-semibold text-slate-900">AI Interview In Progress</h4>
                                                    <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">
                                                        The candidate has been shortlisted. Copy the public link below and send it to them to complete the interview.
                                                    </p>
                                                </div>
                                                <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-3">
                                                    <input 
                                                        readOnly 
                                                        value={candidateInterviews[0]?.id ? `${window.location.origin}/public-interview/${candidateInterviews[0].id}` : 'Generating interview link...'} 
                                                        className="w-full text-center bg-white border border-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl outline-none select-all" 
                                                    />
                                                    <button 
                                                        disabled={!candidateInterviews[0]?.id}
                                                        onClick={async () => {
                                                            if (!candidateInterviews[0]?.id) return;
                                                            const link = `${window.location.origin}/public-interview/${candidateInterviews[0].id}`;
                                                            try {
                                                                await navigator.clipboard.writeText(link);
                                                                toast.success('Interview link copied to clipboard!');
                                                            } catch {
                                                                // Fallback for HTTP or restricted contexts
                                                                const el = document.createElement('textarea');
                                                                el.value = link;
                                                                el.style.position = 'fixed';
                                                                el.style.opacity = '0';
                                                                document.body.appendChild(el);
                                                                el.select();
                                                                document.execCommand('copy');
                                                                document.body.removeChild(el);
                                                                toast.success('Interview link copied!');
                                                            }
                                                        }}
                                                        className="btn btn-primary text-xs font-bold px-4 py-2"
                                                    >
                                                        Copy Link
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                                                    <Mic size={28} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-semibold text-slate-900">Interview Pending</h4>
                                                    <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed">
                                                        Shortlist this candidate first to generate their AI interview link.
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={handleShortlist}
                                                    disabled={shortlisting}
                                                    className="btn btn-primary px-6 py-3 font-bold text-xs"
                                                >
                                                    {shortlisting && <Loader2 className="animate-spin" size={12} />}
                                                    Shortlist Candidate
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const scoreColorClasses = {
    indigo: {
        text: 'text-indigo-600',
        bar: 'bg-indigo-600',
    },
    violet: {
        text: 'text-violet-600',
        bar: 'bg-violet-600',
    },
};

const ScoreProgress = ({ label, score, color }) => {
    const colorClasses = scoreColorClasses[color] || scoreColorClasses.indigo;

    return (
    <div className="space-y-3">
        <div className="flex justify-between items-end">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <span className={`text-lg font-semibold ${colorClasses.text}`}>{score}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full rounded-full ${colorClasses.bar}`}
            />
        </div>
    </div>
    );
};

const ScoreSummaryCard = ({ label, score }) => (
    <div className="text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
        <div className="text-xl font-semibold text-white">{score}%</div>
    </div>
);

const InsightTile = ({ label, value }) => (
    <div className="rounded-2xl border border-white bg-white/80 p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
        <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-800">{value}</div>
    </div>
);

const IntelligenceSection = ({ icon: Icon, title, children }) => (
    <div className="space-y-4 pt-6 border-t border-slate-100">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Icon size={14} /> {title}
        </h4>
        {children}
    </div>
);

const SkillGroup = ({ label, skills, emptyLabel, variant = 'matched' }) => {
    const styles = {
        matched: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        missing: 'bg-slate-50 text-slate-500 border-slate-100',
        inferred: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    };

    return (
        <div>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
            <div className="flex flex-wrap gap-2">
                {skills?.length > 0 ? skills.map(skill => (
                    <span key={`${label}-${skill}`} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${styles[variant] || styles.matched}`}>
                        {variant === 'matched' ? <CheckCircle2 size={14} /> : variant === 'inferred' ? <Code2 size={14} /> : null}
                        {skill}
                    </span>
                )) : (
                    <span className="text-xs font-semibold text-slate-400">{emptyLabel}</span>
                )}
            </div>
        </div>
    );
};

const ProjectIntelCard = ({ project }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
                <div className="text-sm font-bold text-slate-900">{project.name || 'Resume Project'}</div>
                <div className="mt-1 text-xs font-semibold text-slate-400">Complexity: {project.complexity || 'Needs Review'}</div>
            </div>
            <span className="w-fit rounded-lg bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                Project
            </span>
        </div>
        <div className="mt-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tech Stack</div>
            <div className="mt-2 flex flex-wrap gap-2">
                {(project.technologies || []).length > 0 ? project.technologies.map(tech => (
                    <span key={`${project.name}-${tech}`} className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {tech}
                    </span>
                )) : <span className="text-xs font-semibold text-slate-400">Not clearly detected</span>}
            </div>
        </div>
        <div className="mt-4 text-sm font-medium leading-relaxed text-slate-600">{project.impact || 'Impact not clearly quantified.'}</div>
    </div>
);

const ExternalIntelCard = ({ icon: Icon, title, data, empty, fields }) => (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500">
                <Icon size={18} />
            </div>
            <div className="text-sm font-bold text-slate-900">{title}</div>
        </div>
        {data ? (
            <div className="space-y-3">
                {fields.filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => (
                    <div key={`${title}-${label}`}>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
                        <div className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">{value}</div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-sm font-semibold text-slate-400">{empty}</div>
        )}
    </div>
);

const BulletIntelCard = ({ title, items, tone = 'default' }) => (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-5">
        <div className="mb-4 text-sm font-bold text-slate-900">{title}</div>
        <div className="space-y-3">
            {items?.length > 0 ? items.map((item, index) => (
                <div key={`${title}-${index}`} className="flex gap-3 text-sm font-medium leading-relaxed text-slate-600">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span>{item}</span>
                </div>
            )) : (
                <div className="text-sm font-semibold text-slate-400">No signal generated yet.</div>
            )}
        </div>
    </div>
);

const EmptyIntel = ({ text }) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
        {text}
    </div>
);

const MetricTile = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
);

export default Candidates;



