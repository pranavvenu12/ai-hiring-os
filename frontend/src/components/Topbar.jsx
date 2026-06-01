import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Bell, Search, ChevronRight, Briefcase, Users, UserPlus, X, Settings, LogOut } from 'lucide-react';
import { formatRelativeTime } from '../utils/date';

const Topbar = ({ title }) => {
    const { user, logout } = useAuth();
    const panelRef = useRef(null);
    const profileRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const searchItems = useMemo(() => {
        if (!user) return [];
        const items = [
            { name: 'Dashboard', path: `/dashboard/${user.role.toLowerCase()}`, category: 'Navigation' },
            { name: 'Attendance Management', path: '/attendance', category: 'HRMS Module' },
            { name: 'Performance Hub', path: '/performance', category: 'HRMS Module' },
            { name: 'Account Settings', path: '/settings', category: 'System' },
            { name: 'Help Center', path: '/help', category: 'System' },
        ];

        if (['admin', 'hr', 'manager'].includes(user.role)) {
            items.push(
                { name: 'Jobs Board', path: '/jobs', category: 'Hiring' },
                { name: 'Candidate Database', path: '/candidates', category: 'Hiring' }
            );
        }

        if (['admin', 'hr'].includes(user.role)) {
            items.push(
                { name: 'Employees Directory', path: '/employees', category: 'HRMS' },
                { name: 'AI Interview Assistant', path: '/interviews', category: 'Hiring' }
            );
        }

        return items;
    }, [user]);

    const filteredSearchItems = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return searchItems.filter(item => 
            item.name.toLowerCase().includes(query) || 
            item.category.toLowerCase().includes(query)
        );
    }, [searchQuery, searchItems]);

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
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setIsProfileOpen(false);
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
        <div className="min-h-16 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 pl-14 lg:pl-0 relative z-30">
            <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">{title}</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Welcome back, {user.name.split(' ')[0]}.</p>
            </div>
            
            <div className="flex items-center justify-end gap-3 sm:gap-5 self-stretch sm:self-auto">
                <div className="hidden md:block relative w-[300px]">
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-4 py-2.5 w-full focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all shadow-sm">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            placeholder="Search anything..."
                            className="bg-transparent outline-none w-full text-sm font-medium"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {isSearchFocused && searchQuery.trim() && (
                        <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 overflow-hidden py-2 z-50">
                            <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 border-b border-slate-50 mb-1">
                                Quick Navigation
                            </div>
                            {filteredSearchItems.length > 0 ? (
                                filteredSearchItems.map((item, index) => (
                                    <Link
                                        key={index}
                                        to={item.path}
                                        className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 text-slate-700 hover:text-indigo-600 transition-colors"
                                    >
                                        <span className="text-sm font-semibold">{item.name}</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 uppercase tracking-wider">
                                            {item.category}
                                        </span>
                                    </Link>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-xs font-medium text-slate-400">
                                    No sections found matching "{searchQuery}"
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div ref={panelRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen((value) => !value)}
                        className="relative w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        aria-label="Open notifications"
                        aria-expanded={isOpen}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
                        )}
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 mt-3 w-[360px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Notifications</h3>
                                    <p className="text-xs font-medium text-slate-400">Live tenant activity</p>
                                </div>
                                <button type="button" onClick={() => setIsOpen(false)} className="w-9 h-9 rounded-full hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
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
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                                                    <Icon size={18} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900">{notification.title}</div>
                                                            <div className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{notification.message}</div>
                                                        </div>
                                                        {!notification.read && <span className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold uppercase tracking-widest text-indigo-700">
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

                <div ref={profileRef} className="relative flex items-center gap-3 pl-5 border-l border-slate-200">
                    <button
                        type="button"
                        onClick={() => setIsProfileOpen((v) => !v)}
                        className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-950 hover:bg-indigo-700 text-white font-semibold shadow-sm active:scale-95 transition-all duration-200"
                        aria-label="User profile menu"
                    >
                        {user.name.charAt(0)}
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 top-14 mt-2 w-56 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 overflow-hidden py-1.5 z-50">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Signed In As</div>
                                <div className="text-sm font-semibold text-slate-800 truncate mt-1">{user.name}</div>
                                <div className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">{user.email}</div>
                            </div>
                            <Link
                                to="/settings"
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                            >
                                <Settings size={16} />
                                Account Settings
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsProfileOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Topbar;
