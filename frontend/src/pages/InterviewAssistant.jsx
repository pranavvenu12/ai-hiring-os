import React, { useCallback, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Mic, MicOff, Brain, Play, CheckCircle2, ArrowRight, Loader2, MessageSquare, BarChart3, Award, Volume2, Copy, ExternalLink } from 'lucide-react';
import { useRealtime } from '../hooks/useRealtime';

const InterviewAssistant = () => {
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [interviewType, setInterviewType] = useState('technical');
    const [session, setSession] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answerText, setAnswerText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [voiceMetrics, setVoiceMetrics] = useState(null);
    const [questionReasoning, setQuestionReasoning] = useState('');
    const [submittingAnswer, setSubmittingAnswer] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [starting, setStarting] = useState(false);
    const [completedSession, setCompletedSession] = useState(null);
    const [companyStats, setCompanyStats] = useState(null);
    const { toast } = useToast();
    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

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
            setCurrentQuestionIndex(0);
            setQuestionReasoning(data.questions?.[0]?.reasoning || 'Initial question selected from job, resume, and skill gaps.');
            setAnswerText('');
            toast.success('AI Interview started! Speak or type your answers.');
        } catch (err) { toast.error(err.detail || 'Failed to start interview'); }
        finally { setStarting(false); }
    };

    const handleSubmitAnswer = async () => {
        if (!answerText.trim()) return false;
        setSubmittingAnswer(true);
        try {
            if (recordedAudio) {
                const formData = new FormData();
                formData.append('question_index', String(currentQuestionIndex));
                formData.append('audio', recordedAudio, `interview-${session.id}-${currentQuestionIndex}.webm`);
                const response = await api.post(`/interviews/${session.id}/voice-answer`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setVoiceMetrics(response.voice_metrics || response.interview_metrics?.latest_voice || null);
            } else {
                await api.post(`/interviews/${session.id}/voice-fallback`, {
                    question_index: currentQuestionIndex,
                    transcript_text: answerText,
                });
            }

            if (currentQuestionIndex < maxQuestions - 1) {
                const next = await api.post(`/interviews/${session.id}/next-question`);
                if (next.should_continue) {
                    setSession(prev => ({ ...prev, questions: next.questions }));
                    setCurrentQuestionIndex(next.current_question_index);
                    setQuestionReasoning(next.reasoning || next.question?.reasoning || '');
                }
                setAnswerText('');
                setRecordedAudio(null);
            }
            return true;
        } catch (err) {
            try {
                await api.post(`/interviews/${session.id}/voice-fallback`, {
                    question_index: currentQuestionIndex,
                    transcript_text: answerText,
                });
                toast.warning('AssemblyAI unavailable. Saved browser transcript fallback.');
                if (currentQuestionIndex < maxQuestions - 1) {
                    const next = await api.post(`/interviews/${session.id}/next-question`);
                    if (next.should_continue) {
                        setSession(prev => ({ ...prev, questions: next.questions }));
                        setCurrentQuestionIndex(next.current_question_index);
                        setQuestionReasoning(next.reasoning || next.question?.reasoning || '');
                    }
                    setAnswerText('');
                    setRecordedAudio(null);
                }
                return true;
            } catch (fallbackErr) {
                toast.error(fallbackErr.detail || err.detail || 'Failed to submit answer');
            }
        }
        finally { setSubmittingAnswer(false); }
        return false;
    };

    const handleCompleteInterview = async () => {
        setCompleting(true);
        try {
            const data = await api.post(`/interviews/${session.id}/complete`);
            setCompletedSession(data);
            setSession(null);
            fetchCompanyStats();
            toast.success('Interview complete! AI evaluation scorecards generated successfully.');
        } catch (err) { toast.error(err.detail || 'Failed to complete interview'); }
        finally { setCompleting(false); }
    };

    // Voice Recording
    const toggleRecording = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const startRecording = async () => {
        setRecordedAudio(null);
        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setRecordedAudio(blob);
                stream.getTracks().forEach((track) => track.stop());
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('MediaRecorder unavailable, falling back to browser speech recognition:', error);
            startSpeechRecognitionFallback();
        }
    };

    const startSpeechRecognitionFallback = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.warning('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
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
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    };

    const maxQuestions = 5;
    const isLastQuestion = session && currentQuestionIndex >= maxQuestions - 1;
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
                    {!session && !completedSession && (
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
                    {session && !completedSession && (
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

                    {voiceMetrics && (
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Latest Voice Analytics</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <MiniStatCard icon={MessageSquare} label="Fluency" value={`${voiceMetrics.fluency_score || 0}%`} />
                                <MiniStatCard icon={BarChart3} label="Pace" value={`${voiceMetrics.speaking_pace_wpm || 0} WPM`} />
                                <MiniStatCard icon={Award} label="Fillers" value={voiceMetrics.filler_word_count || 0} />
                                <MiniStatCard icon={CheckCircle2} label="Confidence" value={`${voiceMetrics.confidence_score || 0}%`} />
                                <MiniStatCard icon={Brain} label="Comm." value={`${voiceMetrics.communication_score || 0}%`} />
                            </div>
                        </div>
                    )}

                    {/* Completed Interview Results */}
                    {completedSession && (
                        <div className="space-y-8">
                            <div className="bg-slate-950 rounded-[1.5rem] p-10 text-white relative overflow-hidden shadow-lg shadow-slate-300/50">
                                <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
                                    <Brain size={240} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-indigo-200 font-semibold text-xs uppercase tracking-widest mb-6">
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

const ScoreCircle = ({ label, score }) => (
    <div className="text-center">
        <div className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center mx-auto mb-2 relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="white" strokeWidth="2"
                    strokeDasharray={`${(score || 0)} ${100 - (score || 0)}`} strokeDashoffset="0" strokeLinecap="round" />
            </svg>
            <span className="text-xl font-semibold relative z-10">{score || 0}</span>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">{label}</div>
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
        <span className={`${config.bg} ${config.text} ${small ? 'px-3 py-1 text-[10px]' : 'px-5 py-2 text-xs'} font-semibold uppercase tracking-widest rounded-xl shadow-lg`}>
            {config.label}
        </span>
    );
};

export default InterviewAssistant;



