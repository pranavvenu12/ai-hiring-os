import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Upload, ChevronRight, Brain, Loader2, CheckCircle2, FileText, Search, User, Users, SlidersHorizontal, ArrowLeft, Mic, Award, AwardIcon, Star } from 'lucide-react';
import { formatRelativeTime } from '../utils/date';

const Candidates = () => {
    const [searchParams] = useSearchParams();
    const jobId = searchParams.get('job_id');
    const navigate = useNavigate();
    
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [jobTitle, setJobTitle] = useState('Talent Pool');
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef(null);
    const { toast } = useToast();
    
    // Drawer tabs
    const [activeTab, setActiveTab] = useState('resume'); // 'resume' or 'interview'
    const [candidateInterviews, setCandidateInterviews] = useState([]);
    const [loadingInterviews, setLoadingInterviews] = useState(false);

    useEffect(() => {
        document.title = 'AI Hiring OS - Talent Pool';
        fetchCandidates();
        if (jobId) fetchJobTitle();
    }, [jobId]);

    useEffect(() => {
        if (selectedCandidate) {
            fetchCandidateInterviews(selectedCandidate.id);
            setActiveTab('resume'); // Default tab when opening
        } else {
            setCandidateInterviews([]);
        }
    }, [selectedCandidate]);

    const fetchJobTitle = async () => {
        try {
            const jobs = await api.get('/jobs');
            const job = jobs.find(j => j.id === jobId);
            if (job) setJobTitle(`Candidates for ${job.title}`);
        } catch (err) { console.error(err); }
    };

    const fetchCandidates = async () => {
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
                setTimeout(fetchCandidates, 3000);
            }
        } catch (err) { console.error(err); }
    };

    const fetchCandidateInterviews = async (candId) => {
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
    };

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

    const filteredCandidates = candidates.filter(c => 
        c.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{jobTitle}</h2>
                            <p className="text-sm font-medium text-slate-400">Evaluate and shortlist top talent with AI precision.</p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
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
                                className="btn btn-primary px-6 py-3 shadow-sm whitespace-nowrap"
                            >
                                {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />} 
                                Upload Resumes
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleUpload} multiple accept=".pdf" className="hidden" />
                        </div>
                    </div>

                    <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                        <table className="min-w-[920px] w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Candidate</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">AI Match Score</th>
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
                                        key={c.id} 
                                        onClick={() => setSelectedCandidate(c)}
                                        className={`hover:bg-white transition-all duration-300 cursor-pointer group ${selectedCandidate?.id === c.id ? 'bg-white shadow-inner' : ''}`}
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
                                                <div className="text-lg font-semibold text-indigo-600 w-10">{c.score}%</div>
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${c.score}%` }}
                                                        transition={{ duration: 1, delay: i * 0.1 }}
                                                        className={`h-full rounded-full ${c.score > 80 ? 'bg-emerald-500' : c.score > 50 ? 'bg-indigo-50' : 'bg-rose-500'}`} 
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
                            <div className="p-8 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                <div className="flex justify-between items-center mb-6">
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
                                    <div className="flex gap-2">
                                        <button className="btn btn-secondary px-4 py-2 text-xs font-bold">Download PDF</button>
                                        <button className="btn btn-primary px-4 py-2 text-xs font-bold">Shortlist</button>
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
                            <div className="p-8 space-y-8 flex-1">
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
                                                        <Brain size={16} /> AI Match Score
                                                    </div>
                                                    <div className="text-6xl font-semibold">{selectedCandidate.score}%</div>
                                                </div>
                                                <div className="w-24 h-24 rounded-full border-8 border-white/10 flex items-center justify-center relative">
                                                    <div className="text-xs font-semibold uppercase text-white/50 tracking-widest">Match</div>
                                                    <div className="absolute inset-0 rounded-full border-8 border-white border-t-transparent animate-spin-slow" />
                                                </div>
                                            </div>
                                            <div className="mt-8 pt-8 border-t border-white/10">
                                                <p className="text-sm font-medium text-indigo-50 leading-relaxed italic">
                                                    "{selectedCandidate.explanation || 'Processing AI-driven insights for this candidate...'}"
                                                </p>
                                            </div>
                                        </div>

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
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedCandidate.matched_skills?.map(skill => (
                                                        <div key={skill} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2 border border-emerald-100">
                                                            <CheckCircle2 size={14} /> {skill}
                                                        </div>
                                                    ))}
                                                    {selectedCandidate.missing_skills?.map(skill => (
                                                        <div key={skill} className="px-4 py-2 rounded-xl bg-slate-50 text-slate-400 text-xs font-semibold border border-slate-100">
                                                            {skill}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6 pt-6 border-t border-slate-100">
                                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Experience Summary</h4>
                                            <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="space-y-2 flex-1">
                                                        <div className="text-sm font-bold text-slate-700 leading-relaxed">
                                                            {selectedCandidate.summary || selectedCandidate.explanation || 'No summary available for this candidate yet.'}
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

                                                    {/* Transcript Segment */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            <FileText size={14} /> Full Transcript
                                                        </h4>
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
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                                                    <Mic size={28} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-semibold text-slate-900">No Interview Found</h4>
                                                    <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto mt-2">
                                                        This candidate hasn't completed an AI evaluation interview session yet.
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => navigate(`/interviews?candidate_id=${selectedCandidate.id}&job_id=${selectedCandidate.job_id || jobId}`)}
                                                    className="btn btn-primary px-6 py-3 font-bold text-xs"
                                                >
                                                    Start AI Interview
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

export default Candidates;



