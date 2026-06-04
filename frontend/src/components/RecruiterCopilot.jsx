import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, ChevronDown, Loader2, Send, Sparkles, Wrench } from 'lucide-react';
import api from '../services/api';

const prompts = [
    'Show me top candidates',
    'Which candidates need manual review?',
    'Create interview plan for top 3 candidates',
    'Summarize payroll and employee stats',
];

const RecruiterCopilot = () => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: 'Ask me to rank candidates, explain fit, prepare interview plans, or summarize HR operations.',
            tools: [],
            actions: [],
        },
    ]);

    const ask = async (text = message) => {
        const clean = text.trim();
        if (!clean || loading) return;
        setMessages(prev => [...prev, { role: 'user', text: clean }]);
        setMessage('');
        setLoading(true);
        try {
            const response = await api.post('/agent/ask', { message: clean });
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: response.answer,
                tools: response.tools_used || [],
                actions: response.suggested_actions || [],
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: error.detail || 'Copilot could not complete that request.',
                tools: [],
                actions: [],
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-5 right-5 z-50 font-inter">
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        className="mb-4 w-[calc(100vw-2.5rem)] max-w-[420px] overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/90 shadow-2xl shadow-slate-900/20 backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-950">AI Recruiter Copilot</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Read-only agent</div>
                                </div>
                            </div>
                            <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <ChevronDown size={18} />
                            </button>
                        </div>

                        <div className="max-h-[420px] space-y-4 overflow-y-auto px-5 py-4">
                            {messages.map((item, index) => (
                                <div key={`${item.role}-${index}`} className={item.role === 'user' ? 'text-right' : 'text-left'}>
                                    <div className={`inline-block max-w-[92%] rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed ${
                                        item.role === 'user' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 border border-slate-100'
                                    }`}>
                                        {item.text}
                                    </div>
                                    {item.tools?.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {item.tools.map(tool => (
                                                <span key={tool} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                                                    <Wrench size={11} /> {tool}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {item.actions?.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {item.actions.map((action, actionIndex) => (
                                                <div key={actionIndex} className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                                                    {action.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && (
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    <Loader2 className="animate-spin" size={14} /> Agent is inspecting tools
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100 p-4">
                            <div className="mb-3 flex flex-wrap gap-2">
                                {prompts.map(prompt => (
                                    <button
                                        key={prompt}
                                        onClick={() => ask(prompt)}
                                        className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={message}
                                    onChange={event => setMessage(event.target.value)}
                                    onKeyDown={event => { if (event.key === 'Enter') ask(); }}
                                    placeholder="Ask about candidates or HR stats..."
                                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500"
                                />
                                <button onClick={() => ask()} disabled={loading || !message.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white disabled:opacity-40">
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-2xl shadow-slate-900/30 transition-transform hover:scale-105"
                aria-label="Open AI Recruiter Copilot"
            >
                {open ? <ChevronDown size={22} /> : <Sparkles size={22} />}
            </button>
        </div>
    );
};

export default RecruiterCopilot;
