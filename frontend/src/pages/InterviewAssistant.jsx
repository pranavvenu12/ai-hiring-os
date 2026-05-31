import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Mic, MicOff, Send, Brain, Play, CheckCircle2, ArrowRight, Loader2, MessageSquare, BarChart3, Award, ChevronRight, Volume2 } from 'lucide-react';

const InterviewAssistant = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [interviewType, setInterviewType] = useState('technical');
    const [session, setSession] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answerText, setAnswerText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [submittingAnswer, setSubmittingAnswer] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [starting, setStarting] = useState(false);
    const [completedSession, setCompletedSession] = useState(null);
    const [companyStats, setCompanyStats] = useState(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        document.title = 'AI Hiring OS - AI Interview Assistant';
        fetchJobs();
        fetchCompanyStats();
    }, []);

    const fetchJobs = async () => {
        try {
            const data = await api.get('/jobs');
            setJobs(data);
        } catch (err) { console.error(err); }
    };

    const fetchCompanyStats = async () => {
        try {
            const data = await api.get('/interviews/company/analytics');
            setCompanyStats(data);
        } catch (err) { console.error(err); }
    };

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
            setCurrentQuestionIndex(0);
            setAnswerText('');
        } catch (err) { alert(err.detail || 'Failed to start interview'); }
        finally { setStarting(false); }
    };

    const handleSubmitAnswer = async () => {
        if (!answerText.trim()) return;
        setSubmittingAnswer(true);
        try {
            await api.post(`/interviews/${session.id}/answer`, {
                question_index: currentQuestionIndex,
                answer_text: answerText,
            });

            if (currentQuestionIndex < (session.questions?.length || 0) - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setAnswerText('');
            }
        } catch (err) { alert(err.detail || 'Failed to submit answer'); }
        finally { setSubmittingAnswer(false); }
    };

    const handleCompleteInterview = async () => {
        setCompleting(true);
        try {
            const data = await api.post(`/interviews/${session.id}/complete`);
            setCompletedSession(data);
            setSession(null);
            fetchCompanyStats();
        } catch (err) { alert(err.detail || 'Failed to complete interview'); }
        finally { setCompleting(false); }
    };

    // Voice Recording
    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = answerText;

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += ' ' + transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            setAnswerText((finalTranscript + ' ' + interimTranscript).trim());
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    };

    const isLastQuestion = session && currentQuestionIndex >= (session.questions?.length || 0) - 1;

    return (
        <div className="flex bg-slate-50 min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] p-6 md:p-10">
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
                    {!session && !completedSession && (
                        <div className="glass-morphism rounded-[2.5rem] p-8 border border-white/50 shadow-2xl shadow-slate-200/50">
                            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                <Brain size={22} className="text-indigo-600" /> Start New AI Interview
                            </h3>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Step 1: Select Job */}
                                <div>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">1. Select Job</h4>
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
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">2. Select Candidate</h4>
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
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">3. Interview Type</h4>
                                    <div className="space-y-2">
                                        {['technical', 'behavioral', 'general'].map(t => (
                                            <button key={t} onClick={() => setInterviewType(t)}
                                                className={`w-full text-left p-4 rounded-2xl border transition-all capitalize ${interviewType === t ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-600/10' : 'border-slate-100 bg-white/50 hover:bg-white'}`}>
                                                <div className="font-bold text-slate-900 text-sm capitalize">{t}</div>
                                            </button>
                                        ))}
                                    </div>

                                    <button onClick={handleStartInterview} disabled={!selectedCandidate || !selectedJob || starting}
                                        className="btn btn-primary w-full justify-center py-4 mt-6 font-black text-base shadow-xl shadow-indigo-600/20 disabled:opacity-40">
                                        {starting ? <Loader2 className="animate-spin" size={22} /> : <Play size={22} />}
                                        {starting ? 'Generating Questions...' : 'Start Interview'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Interview Session */}
                    {session && !completedSession && (
                        <div className="glass-morphism rounded-[2.5rem] p-8 border border-white/50 shadow-2xl shadow-slate-200/50">
                            {/* Progress */}
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">AI Interview in Progress</h3>
                                    <p className="text-sm text-slate-400 font-medium">Question {currentQuestionIndex + 1} of {session.questions?.length || 0}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-indigo-600 uppercase tracking-widest">{session.interview_type}</div>
                                </div>
                            </div>

                            <div className="w-full h-2 bg-slate-100 rounded-full mb-8">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((currentQuestionIndex + 1) / (session.questions?.length || 1)) * 100}%` }}
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                            </div>

                            {/* Question */}
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 text-white mb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
                                    <Brain size={160} />
                                </div>
                                <div className="relative z-10">
                                    <div className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-3 flex items-center gap-2">
                                        <MessageSquare size={14} />
                                        {session.questions?.[currentQuestionIndex]?.category || 'Question'}
                                    </div>
                                    <div className="text-xl font-bold leading-relaxed">
                                        {session.questions?.[currentQuestionIndex]?.question || 'Loading question...'}
                                    </div>
                                </div>
                            </div>

                            {/* Answer Input */}
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <button onClick={toggleRecording}
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                                        {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                                    </button>
                                    <div className="flex-1 relative">
                                        <textarea value={answerText} onChange={e => setAnswerText(e.target.value)}
                                            placeholder={isRecording ? 'Listening... Speak your answer.' : 'Type your answer here or click the microphone to speak...'}
                                            className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium text-sm min-h-[120px] resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                                        {isRecording && <><Volume2 size={14} className="text-rose-500 animate-pulse" /> Recording in progress...</>}
                                        {!isRecording && <>Press the mic button for voice input or type your answer</>}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleSubmitAnswer} disabled={!answerText.trim() || submittingAnswer || isLastQuestion}
                                            className="btn btn-secondary px-6 py-3 font-bold disabled:opacity-40">
                                            {submittingAnswer ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                                            {isLastQuestion ? 'Last Question' : 'Next Question'}
                                        </button>
                                        {isLastQuestion && (
                                            <button onClick={async () => { if (answerText.trim()) { await handleSubmitAnswer(); } handleCompleteInterview(); }}
                                                disabled={completing}
                                                className="btn btn-primary px-8 py-3 font-bold shadow-lg shadow-indigo-600/20">
                                                {completing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                                {completing ? 'Evaluating...' : 'Complete Interview'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Completed Interview Results */}
                    {completedSession && (
                        <div className="space-y-8">
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/30">
                                <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
                                    <Brain size={240} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-indigo-200 font-black text-xs uppercase tracking-widest mb-6">
                                        <Award size={16} /> Interview Evaluation Complete
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                                        <ScoreCircle label="Technical" score={completedSession.technical_score} />
                                        <ScoreCircle label="Communication" score={completedSession.communication_score} />
                                        <ScoreCircle label="Confidence" score={completedSession.confidence_score} />
                                        <ScoreCircle label="Overall" score={completedSession.overall_score} />
                                    </div>
                                    <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                                        <RecommendationBadge recommendation={completedSession.recommendation} />
                                        <p className="text-sm text-indigo-100 italic flex-1">"{completedSession.ai_summary}"</p>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => { setCompletedSession(null); setSelectedCandidate(null); }}
                                className="btn btn-secondary px-8 py-3 font-bold">
                                <Play size={18} /> Start New Interview
                            </button>
                        </div>
                    )}

                    {/* Recent Interviews */}
                    {companyStats?.interviews?.length > 0 && !session && !completedSession && (
                        <div className="glass-morphism rounded-[2.5rem] p-8 border border-white/50">
                            <h3 className="text-lg font-black text-slate-900 mb-6">Recent Interviews</h3>
                            <div className="space-y-3">
                                {companyStats.interviews.slice(0, 5).map((interview, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-slate-100 hover:bg-white transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                                                {interview.candidate_name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{interview.candidate_name}</div>
                                                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">{interview.interview_type} · {interview.status}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {interview.overall_score !== null && (
                                                <span className="text-lg font-black text-indigo-600">{interview.overall_score}%</span>
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
        className="glass-morphism p-6 rounded-[2rem] border border-white/50 hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-500 group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300">
                <Icon size={24} />
            </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h2>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </motion.div>
);

const ScoreCircle = ({ label, score }) => (
    <div className="text-center">
        <div className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center mx-auto mb-2 relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="2"
                    strokeDasharray={`${(score || 0)} ${100 - (score || 0)}`} strokeDashoffset="0" strokeLinecap="round" />
            </svg>
            <span className="text-xl font-black relative z-10">{score || 0}</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200">{label}</div>
    </div>
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
        <span className={`${config.bg} ${config.text} ${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-2 text-xs'} font-black uppercase tracking-widest rounded-xl shadow-lg`}>
            {config.label}
        </span>
    );
};

export default InterviewAssistant;
