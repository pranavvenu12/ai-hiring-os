import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Mic, MicOff, Brain, Play, CheckCircle2, ArrowRight, Loader2, MessageSquare, Volume2, Sparkles } from 'lucide-react';

const PublicInterview = () => {
    const { sessionId } = useParams();
    const { toast } = useToast();

    const [session, setSession] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answerText, setAnswerText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
    const [submittingAnswer, setSubmittingAnswer] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [loadingSession, setLoadingSession] = useState(true);
    const [completedState, setCompletedState] = useState(false);
    const [startedState, setStartedState] = useState(false);

    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Fetch session details on mount
    const fetchSession = useCallback(async () => {
        setLoadingSession(true);
        try {
            const data = await api.get(`/interviews/public/${sessionId}`);
            setSession(data);
            if (data.status === 'completed') {
                setCompletedState(true);
            }
            // Resume index if they partially completed
            setCurrentQuestionIndex(data.transcript_length || 0);
        } catch (err) {
            console.error(err);
            toast.error('Could not load the interview invitation. Please check the URL.');
        } finally {
            setLoadingSession(false);
        }
    }, [sessionId, toast]);

    useEffect(() => {
        document.title = 'AI Hiring OS - Candidate AI Interview';
        fetchSession();
    }, [fetchSession]);

    useEffect(() => {
        if (!recordedAudio) {
            setRecordedAudioUrl('');
            return;
        }

        const url = URL.createObjectURL(recordedAudio);
        setRecordedAudioUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [recordedAudio]);

    const handleStart = () => {
        setStartedState(true);
    };

    const handleSubmitAnswer = async () => {
        if (!answerText.trim() && !recordedAudio) return false;
        setSubmittingAnswer(true);
        try {
            if (recordedAudio) {
                const formData = new FormData();
                formData.append('question_index', String(currentQuestionIndex));
                formData.append('audio', recordedAudio, `interview-${session.id}-${currentQuestionIndex}.webm`);
                await api.post(`/interviews/public/${sessionId}/voice-answer`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post(`/interviews/public/${sessionId}/voice-fallback`, {
                    question_index: currentQuestionIndex,
                    transcript_text: answerText,
                });
            }

            if (currentQuestionIndex < maxQuestions - 1) {
                const next = await api.post(`/interviews/public/${sessionId}/next-question`);
                if (next.should_continue) {
                    setSession(prev => ({ ...prev, questions: next.questions }));
                    setCurrentQuestionIndex(next.current_question_index);
                }
                setAnswerText('');
                setRecordedAudio(null);
            }
            return true;
        } catch (err) {
            try {
                // Fallback direct text submission
                await api.post(`/interviews/public/${sessionId}/voice-fallback`, {
                    question_index: currentQuestionIndex,
                    transcript_text: answerText,
                });
                if (currentQuestionIndex < maxQuestions - 1) {
                    const next = await api.post(`/interviews/public/${sessionId}/next-question`);
                    if (next.should_continue) {
                        setSession(prev => ({ ...prev, questions: next.questions }));
                        setCurrentQuestionIndex(next.current_question_index);
                    }
                    setAnswerText('');
                    setRecordedAudio(null);
                }
                return true;
            } catch (fallbackErr) {
                toast.error(fallbackErr.detail || err.detail || 'Failed to submit answer');
            }
        } finally {
            setSubmittingAnswer(false);
        }
        return false;
    };

    const handleCompleteInterview = async () => {
        setCompleting(true);
        try {
            await api.post(`/interviews/public/${sessionId}/complete`);
            setCompletedState(true);
            toast.success('AI Interview submitted and completed! Good luck!');
        } catch (err) {
            toast.error(err.detail || 'Failed to finalize interview');
        } finally {
            setCompleting(false);
        }
    };

    const createSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';

        recognition.onresult = (event) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += `${transcript} `;
                } else {
                    interimTranscript += transcript;
                }
            }

            setAnswerText((finalTranscript + interimTranscript).trim());
        };

        recognition.onerror = (e) => {
            console.error('Speech recognition error:', e.error);
            if (e.error !== 'aborted') {
                toast.warning('Voice typing paused. Your audio recording is still active.');
            }
        };

        recognition.onend = () => {
            if (isRecording) {
                setIsRecording(false);
            }
        };

        return recognition;
    };

    // Recording logic (from InterviewAssistant.jsx)
    const toggleRecording = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const startRecording = async () => {
        setRecordedAudio(null);
        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recognition = createSpeechRecognition();
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
            recognitionRef.current = recognition;
            recorder.start();
            if (recognition) {
                recognition.start();
            }
            setIsRecording(true);
        } catch (error) {
            console.error('MediaRecorder unavailable, falling back to speech recognition:', error);
            startSpeechRecognitionFallback();
        }
    };

    const startSpeechRecognitionFallback = () => {
        const recognition = createSpeechRecognition();
        if (!recognition) {
            toast.warning('Browser speech recognition is not supported. Please type your response.');
            return;
        }

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

    if (loadingSession) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-inter">
                <div className="text-center space-y-4">
                    <Loader2 className="animate-spin text-indigo-600 mx-auto" size={40} />
                    <p className="text-sm font-semibold text-slate-500">Retrieving secure AI Interview...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-inter px-4">
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto">
                        <Brain size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-900">Session Not Found</h2>
                        <p className="text-sm font-medium text-slate-400">
                            This interview link is invalid, expired, or belongs to another workspace.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (completedState) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-inter px-4">
                <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-xl max-w-xl w-full text-center space-y-8">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-md">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-slate-900">Interview Completed!</h2>
                        <p className="text-base font-semibold text-slate-500">
                            Thank you, {session.candidate_name}! Your responses have been uploaded and processed by our AI recruiter assistant.
                        </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">APPLICATION ASSIGNED TO</div>
                        <div className="text-lg font-bold text-slate-800 mt-1">{session.job_title}</div>
                        <div className="text-xs font-semibold text-indigo-600 mt-0.5">{session.company_name}</div>
                    </div>
                    <p className="text-sm font-medium text-slate-400">
                        The talent acquisition team will review your scorecard and reach out with next steps. You can close this tab now.
                    </p>
                </div>
            </div>
        );
    }

    if (!startedState) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-inter px-4 py-12">
                <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-200 shadow-xl max-w-2xl w-full space-y-8">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-inner">
                            <Brain size={28} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI INTERVIEW INVITATION</span>
                            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{session.company_name}</h2>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm font-bold text-slate-700">Dear {session.candidate_name},</p>
                        <p className="text-sm leading-relaxed text-slate-500 font-medium">
                            You are invited to complete an automated <strong className="font-bold text-slate-900">AI Interview</strong> for the position of <strong className="font-bold text-slate-900">{session.job_title}</strong>{session.job_department ? <> within our <strong className="font-bold text-slate-900">{session.job_department}</strong> department</> : ''}.
                        </p>
                        <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                                <Sparkles size={14} className="text-indigo-600 animate-pulse" /> Interview Instructions
                            </h4>
                            <ul className="text-xs text-indigo-950/70 font-semibold space-y-2 list-disc pl-4 leading-relaxed">
                                <li>The interview consists of <strong className="font-extrabold text-indigo-950">{maxQuestions} adaptive questions</strong> structured around technical, project, and behavioral criteria.</li>
                                <li>You can answer by <strong className="font-extrabold text-indigo-950">speaking</strong> (using your microphone for transcription) or by <strong className="font-extrabold text-indigo-950">typing</strong> your responses in the text area.</li>
                                <li>Take your time; there is no strict timer for answers, but keep them concise and relevant.</li>
                                <li>Ensure you are in a quiet room if you choose to record your audio.</li>
                            </ul>
                        </div>
                    </div>

                    <button onClick={handleStart} className="btn btn-primary w-full justify-center py-4 font-bold text-base shadow-lg shadow-slate-900/10">
                        <Play size={20} /> Begin AI Interview
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
            {/* Candidate Nav */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-950 text-white rounded-xl flex items-center justify-center">
                            <Brain size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-900">{session.company_name}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{session.job_title}</div>
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-400">
                        Interview Candidate: <span className="font-bold text-slate-700">{session.candidate_name}</span>
                    </div>
                </div>
            </header>

            {/* Active Interview Content */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col justify-center">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-xl space-y-8">
                    {/* Progress */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">AI Evaluation Progress</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Question {currentQuestionIndex + 1} of {maxQuestions}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl">{session.interview_type}</div>
                        </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentQuestionIndex + 1) / maxQuestions) * 100}%` }}
                            className="h-full rounded-full bg-slate-950" />
                    </div>

{/* Internal reasoning hidden from candidate view */}

                    {/* Question Card */}
                    <div className="bg-slate-950 rounded-[1.5rem] p-8 text-white relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
                            <Brain size={160} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-3 flex items-center gap-2">
                                <MessageSquare size={14} />
                                {session.questions?.[currentQuestionIndex]?.category || 'Interview Query'}
                            </div>
                            <div className="text-xl font-bold leading-relaxed">
                                {session.questions?.[currentQuestionIndex]?.question || 'Loading question...'}
                            </div>
                        </div>
                    </div>

                    {/* Answer area */}
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <button onClick={toggleRecording}
                                aria-pressed={isRecording}
                                aria-label={isRecording ? 'Stop recording audio' : 'Start recording audio'}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' : 'bg-slate-50 border border-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                                {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                            </button>
                            <div className="flex-1 relative">
                                <textarea value={answerText} onChange={e => setAnswerText(e.target.value)}
                                    placeholder={isRecording ? 'Listening... Speak your answer.' : 'Type your answer here or click the microphone to speak...'}
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-semibold text-sm min-h-[140px] resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-2">
                                <div className="text-xs text-slate-400 font-bold flex items-center gap-2">
                                    {isRecording && <><Volume2 size={14} className="text-rose-500 animate-pulse" /> Recording audio now. Your speech is being saved.</>}
                                    {!isRecording && recordedAudio && <>Voice captured and saved locally. Preview it below before moving on.</>}
                                    {!isRecording && !recordedAudio && <>Feel free to speak using microphone or type your response</>}
                                </div>
                                {recordedAudioUrl && !isRecording && (
                                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
                                        <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                                        <div className="flex-1 min-w-0">
                                            <div className="uppercase tracking-widest text-[10px] text-emerald-600 mb-1">Recorded Answer Preview</div>
                                            <audio controls src={recordedAudioUrl} className="w-full h-8" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3 shrink-0">
                                <button onClick={handleSubmitAnswer} disabled={(!answerText.trim() && !recordedAudio) || submittingAnswer || isLastQuestion}
                                    className="btn btn-secondary px-6 py-3 font-bold text-xs disabled:opacity-40">
                                    {submittingAnswer ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                                    {isLastQuestion ? 'Ready to Submit' : 'Next Question'}
                                </button>
                                {isLastQuestion && (
                                    <button onClick={async () => { const saved = (answerText.trim() || recordedAudio) ? await handleSubmitAnswer() : false; if (saved) handleCompleteInterview(); }}
                                        disabled={completing || (!answerText.trim() && !recordedAudio)}
                                        className="btn btn-primary px-8 py-3 font-bold text-xs shadow-sm disabled:opacity-40">
                                        {completing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                        {completing ? 'Submitting...' : 'Complete Interview'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default PublicInterview;
