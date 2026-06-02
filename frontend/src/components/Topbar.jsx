import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Bell, Search, ChevronRight, Briefcase, Users, UserPlus, X, Settings, LogOut, Sparkles, Loader2, Sun, Moon } from 'lucide-react';
import { formatRelativeTime } from '../utils/date';
import { useTheme } from '../context/ThemeContext';

const Topbar = ({ title }) => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const panelRef = useRef(null);
    const profileRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [aiAnswer, setAiAnswer] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

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

    const safeGet = async (path, fallback) => {
        try {
            return await api.get(path);
        } catch {
            return fallback;
        }
    };

    const handleAskAI = async () => {
        const question = searchQuery.trim();
        if (!question || isAiLoading) return;

        setIsAiLoading(true);
        setAiAnswer(null);

        try {
            const role = user.role.toLowerCase();
            const canSeeHiring = ['admin', 'hr', 'manager'].includes(role);
            const canSeeCompany = ['admin', 'hr'].includes(role);

            const [
                jobs,
                employeesData,
                myAttendance,
                teamAttendance,
                companyAttendance,
                myPerformance,
                teamPerformance,
                companyPerformance,
                interviewAnalytics,
            ] = await Promise.all([
                canSeeHiring ? safeGet('/jobs', []) : Promise.resolve([]),
                safeGet('/employees?limit=200', { employees: [], total: 0 }),
                safeGet('/attendance/me', { today: {}, records: [] }),
                role !== 'employee' ? safeGet('/attendance/team', { records: [] }) : Promise.resolve({ records: [] }),
                canSeeCompany ? safeGet('/attendance/company', null) : Promise.resolve(null),
                safeGet('/performance/me', { reviews: [], avg_rating: 0 }),
                role !== 'employee' ? safeGet('/performance/team', { reviews: [] }) : Promise.resolve({ reviews: [] }),
                canSeeCompany ? safeGet('/performance/company', null) : Promise.resolve(null),
                canSeeCompany ? safeGet('/interviews/company/analytics', null) : Promise.resolve(null),
            ]);

            let candidates = [];
            if (canSeeHiring && jobs.length > 0) {
                const candidateLists = await Promise.all(
                    jobs.slice(0, 8).map(async (job) => {
                        const list = await safeGet(`/jobs/${job.id}/candidates`, []);
                        return list.map((candidate) => ({ ...candidate, jobTitle: job.title }));
                    })
                );
                candidates = candidateLists.flat();
            }

            const answer = buildDashboardAnswer({
                question,
                title,
                role,
                jobs,
                candidates,
                employeesData,
                myAttendance,
                teamAttendance,
                companyAttendance,
                myPerformance,
                teamPerformance,
                companyPerformance,
                interviewAnalytics,
            });

            setAiAnswer(answer);
        } catch (error) {
            console.error('Dashboard AI search failed:', error);
            setAiAnswer({
                title: 'I could not read the dashboard data right now.',
                lines: ['Please try again, or use the quick navigation links below.'],
            });
        } finally {
            setIsAiLoading(false);
        }
    };

    const buildDashboardAnswer = ({
        question,
        title,
        role,
        jobs,
        candidates,
        employeesData,
        myAttendance,
        teamAttendance,
        companyAttendance,
        myPerformance,
        teamPerformance,
        companyPerformance,
        interviewAnalytics,
    }) => {
        const q = question.toLowerCase();
        const employees = employeesData?.employees || [];
        const topCandidates = candidates
            .filter((candidate) => Number(candidate.score || 0) > 0)
            .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
            .slice(0, 3);
        const activeJobs = jobs.length;
        const avgCandidateScore = candidates.length
            ? Math.round(candidates.reduce((sum, candidate) => sum + Number(candidate.score || 0), 0) / candidates.length)
            : 0;

        if (q.includes('candidate') || q.includes('shortlist') || q.includes('score') || title.toLowerCase().includes('talent')) {
            return {
                title: 'Candidate snapshot',
                lines: [
                    `${candidates.length} candidates found across ${activeJobs} open position${activeJobs === 1 ? '' : 's'}.`,
                    avgCandidateScore ? `Average AI match score is ${avgCandidateScore}%.` : 'No completed AI match scores are available yet.',
                    topCandidates.length
                        ? `Top matches: ${topCandidates.map((candidate) => `${candidate.candidate_name} (${candidate.score}%)`).join(', ')}.`
                        : 'Upload resumes or wait for scoring to complete to see top matches.',
                ],
            };
        }

        if (q.includes('job') || q.includes('position') || q.includes('role') || title.toLowerCase().includes('position')) {
            return {
                title: 'Jobs summary',
                lines: [
                    `${activeJobs} active job posting${activeJobs === 1 ? '' : 's'} are available to your role.`,
                    jobs.slice(0, 3).length
                        ? `Recent roles: ${jobs.slice(0, 3).map((job) => job.title).join(', ')}.`
                        : 'No job postings found yet.',
                    candidates.length ? `${candidates.length} candidate records are attached to the visible jobs.` : 'No candidates are attached to the visible jobs yet.',
                ],
            };
        }

        if (q.includes('attendance') || q.includes('clock') || q.includes('present')) {
            const today = myAttendance?.today || {};
            return {
                title: 'Attendance summary',
                lines: [
                    today.clocked_in
                        ? `You are clocked in${today.clock_out ? ' and clocked out for today' : ' today'}.`
                        : 'You have not clocked in today.',
                    companyAttendance
                        ? `Company attendance today: ${companyAttendance.present_count || 0} present out of ${companyAttendance.total_employees || 0} employees.`
                        : `${teamAttendance?.records?.length || 0} team attendance records are visible to you today.`,
                    `${myAttendance?.records?.length || 0} personal attendance history record${(myAttendance?.records?.length || 0) === 1 ? '' : 's'} loaded.`,
                ],
            };
        }

        if (q.includes('performance') || q.includes('rating') || q.includes('review')) {
            return {
                title: 'Performance summary',
                lines: [
                    `Your average rating is ${myPerformance?.avg_rating || 0}/5.`,
                    companyPerformance
                        ? `Company average rating is ${companyPerformance.avg_rating || 0}/5 across ${companyPerformance.total_reviews || 0} review${companyPerformance.total_reviews === 1 ? '' : 's'}.`
                        : `${teamPerformance?.reviews?.length || 0} team review${(teamPerformance?.reviews?.length || 0) === 1 ? '' : 's'} are visible to you.`,
                    myPerformance?.reviews?.length
                        ? `Latest personal review count: ${myPerformance.reviews.length}.`
                        : 'No personal reviews are available yet.',
                ],
            };
        }

        if (q.includes('employee') || q.includes('team') || q.includes('people')) {
            return {
                title: 'Team summary',
                lines: [
                    `${employeesData?.total ?? employees.length} employee profile${(employeesData?.total ?? employees.length) === 1 ? '' : 's'} are visible to your role.`,
                    employees.slice(0, 3).length
                        ? `Visible team members include ${employees.slice(0, 3).map((employee) => employee.full_name).join(', ')}.`
                        : 'No employee profiles are visible right now.',
                    `Your current role is ${role}.`,
                ],
            };
        }

        if (q.includes('interview')) {
            return {
                title: 'Interview summary',
                lines: [
                    interviewAnalytics
                        ? `${interviewAnalytics.total_interviews || 0} interviews tracked, with ${interviewAnalytics.completion_rate || 0}% completion.`
                        : 'Interview analytics are available to HR/Admin users.',
                    candidates.length ? `${candidates.length} candidates can be reviewed for interview readiness.` : 'No candidate pool is available right now.',
                ],
            };
        }

        return {
            title: `AI summary for ${title}`,
            lines: [
                `You are signed in as ${user.name} (${role}).`,
                `${activeJobs} jobs, ${candidates.length} candidates, and ${employeesData?.total ?? employees.length} employee profiles are visible from your current permissions.`,
                'Try asking about candidates, jobs, attendance, performance, employees, or interviews for a more focused answer.',
            ],
        };
    };

    if (!user) return null;

    return (
        <div className="min-h-16 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 pl-14 lg:pl-0 relative z-30">
            <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">{title}</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Welcome back, {user.name.split(' ')[0]}.</p>
            </div>
            
            <div className="flex items-center justify-end gap-3 sm:gap-5 self-stretch sm:self-auto">
                <div className="order-3 w-full md:order-none md:block md:w-[340px] relative">
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-4 py-2.5 w-full focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all shadow-sm">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAskAI();
                                }
                            }}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                            placeholder="Ask AI or search..."
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
                            <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={handleAskAI}
                                    disabled={isAiLoading}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
                                >
                                    {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    Ask AI about this dashboard
                                </button>
                            </div>

                            {aiAnswer && (
                                <div className="mx-2 mb-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-800">
                                        <Sparkles size={14} />
                                        {aiAnswer.title}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {aiAnswer.lines.map((line, index) => (
                                            <p key={index} className="text-xs leading-5 text-slate-600">{line}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                        <div className="absolute right-0 top-14 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 overflow-hidden z-50">
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
                            <div className="mt-1 flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                                <button
                                    type="button"
                                    onClick={toggleTheme}
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm border border-slate-200 hover:text-slate-950 hover:border-slate-300 transition-all"
                                    aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                                    title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                                >
                                    {isDark ? <Moon size={19} /> : <Sun size={21} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors text-left"
                                >
                                    <LogOut size={16} />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Topbar;
