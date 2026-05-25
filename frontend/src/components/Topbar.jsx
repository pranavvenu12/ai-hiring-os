import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Bell, Search, ChevronRight, Briefcase, Users, UserPlus, X } from 'lucide-react';
import { formatRelativeTime } from '../utils/date';

const Topbar = ({ title }) => {
    const { user } = useAuth();
    const panelRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.read).length,
        [notifications],
    );

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
    }, [user]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const jobs = await api.get('/jobs');
            const recentJobs = jobs
                .slice()
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 3)
                .map((job) => ({
                    id: `job-${job.id}`,
                    title: 'New job posted',
                    message: job.title,
                    href: '/jobs',
                    icon: Briefcase,
                    time: formatRelativeTime(job.created_at),
                    timestamp: new Date(job.created_at).getTime(),
                }));

            const jobCandidates = await Promise.all(
                jobs.slice(0, 3).map(async (job) => {
                    const candidates = await api.get(`/jobs/${job.id}/candidates`);
                    return candidates
                        .slice()
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 2)
                        .map((candidate) => ({
                            id: `candidate-${candidate.resume_id}`,
                            title: 'New candidate applied',
                            message: `${candidate.candidate_name} • ${job.title}`,
                            href: `/candidates?job_id=${job.id}`,
                            icon: Users,
                            time: formatRelativeTime(candidate.created_at),
                            timestamp: new Date(candidate.created_at).getTime(),
                        }));
                }),
            );

            const flattenedCandidates = jobCandidates.flat();
            const combined = [...recentJobs, ...flattenedCandidates]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 6);

            if (combined.length === 0) {
                setNotifications([
                    {
                        id: 'empty',
                        title: 'No recent updates',
                        message: 'Your activity feed will appear here when jobs or candidates change.',
                        href: '/jobs',
                        icon: UserPlus,
                        time: 'Now',
                        read: true,
                    },
                ]);
            } else {
                setNotifications(combined.map((notification, index) => ({
                    ...notification,
                    read: index > 0,
                })));
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            setNotifications([
                {
                    id: 'error',
                    title: 'Notifications unavailable',
                    message: 'Unable to load live activity right now.',
                    href: '/help',
                    icon: X,
                    time: 'Now',
                    read: true,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="h-20 flex items-center justify-between mb-8 relative z-30">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
                <p className="text-sm font-medium text-slate-400">Welcome back, {user.name.split(' ')[0]}!</p>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-3 bg-white/50 border border-slate-200 rounded-2xl px-4 py-2.5 w-[300px] focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/5 transition-all">
                    <Search size={18} className="text-slate-400" />
                    <input type="text" placeholder="Search anything..." className="bg-transparent outline-none w-full text-sm font-medium" />
                </div>

                <div ref={panelRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen((value) => !value)}
                        className="relative w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        aria-label="Open notifications"
                        aria-expanded={isOpen}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
                        )}
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 mt-3 w-[360px] max-w-[90vw] rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Notifications</h3>
                                    <p className="text-xs font-medium text-slate-400">Live tenant activity</p>
                                </div>
                                <button type="button" onClick={() => setIsOpen(false)} className="w-9 h-9 rounded-xl hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="max-h-[420px] overflow-y-auto">
                                {isLoading ? (
                                    <div className="px-5 py-8 text-sm font-medium text-slate-400">Loading recent activity...</div>
                                ) : (
                                    notifications.map((notification) => {
                                        const Icon = notification.icon;
                                        return (
                                            <Link
                                                key={notification.id}
                                                to={notification.href}
                                                onClick={() => setIsOpen(false)}
                                                className="flex items-start gap-4 px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <Icon size={18} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900">{notification.title}</div>
                                                            <div className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{notification.message}</div>
                                                        </div>
                                                        {!notification.read && <span className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                                        <span>{notification.time}</span>
                                                        <ChevronRight size={12} />
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/20">
                        {user.name.charAt(0)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Topbar;
