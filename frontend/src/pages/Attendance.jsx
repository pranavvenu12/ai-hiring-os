import React, { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatAttendanceDuration } from '../utils/date';
import { Clock, LogIn, LogOut, CheckCircle2, XCircle, MinusCircle, Users, BarChart3, Calendar } from 'lucide-react';
import { SkeletonDashboard } from '../components/ui/SkeletonStates';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

const Attendance = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [myAttendance, setMyAttendance] = useState({ today: {}, records: [] });
    const [teamAttendance, setTeamAttendance] = useState({ records: [] });
    const [companyAttendance, setCompanyAttendance] = useState(null);
    const [clockingIn, setClockingIn] = useState(false);
    const [clockingOut, setClockingOut] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isHROrAdmin = user && ['admin', 'hr'].includes(user.role.toLowerCase());
    const isManager = user && user.role.toLowerCase() === 'manager';

    const fetchData = useCallback(async () => {
        try {
            const meData = await api.get('/attendance/me');
            setMyAttendance(meData);
            
            if (isManager) {
                const teamData = await api.get('/attendance/team');
                setTeamAttendance(teamData);
            }
            if (isHROrAdmin) {
                const compData = await api.get('/attendance/company');
                setCompanyAttendance(compData);
            }
            setError(null);
            setLoading(false);
        } catch (err) { 
            console.error("Failed to load attendance data, retrying in 3s...", err); 
            setTimeout(fetchData, 3000);
        }
    }, [isHROrAdmin, isManager]);

    useEffect(() => {
        document.title = 'AI Hiring OS - Attendance';
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const handleClockIn = async () => {
        setClockingIn(true);
        try {
            await api.post('/attendance/clock-in');
            fetchData();
            toast.success('Successfully clocked in!');
        } catch (err) { toast.error(err.detail || 'Failed to clock in'); }
        finally { setClockingIn(false); }
    };

    const handleClockOut = async () => {
        setClockingOut(true);
        try {
            await api.post('/attendance/clock-out');
            fetchData();
            toast.success('Successfully clocked out!');
        } catch (err) { toast.error(err.detail || 'Failed to clock out'); }
        finally { setClockingOut(false); }
    };

    const today = myAttendance.today || {};

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Attendance Management" />

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                    {loading && <div className="mt-8"><SkeletonDashboard /></div>}
                    {error && !loading && <div className="mt-8"><ErrorState message={error} onRetry={() => { setLoading(true); setError(null); fetchData(); }} /></div>}

                    {!loading && !error && (
                        <>
                    {/* Clock In / Out Section */}
                    <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-3">
                            <Clock size={22} className="text-indigo-600" /> Today's Attendance
                        </h3>

                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex gap-4">
                                <button
                                    onClick={handleClockIn} disabled={today.clocked_in || clockingIn}
                                    className="btn btn-primary px-8 py-4 text-base font-semibold rounded-2xl shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <LogIn size={22} /> {clockingIn ? 'Clocking In...' : 'Clock In'}
                                </button>
                                <button
                                    onClick={handleClockOut} disabled={!today.clocked_in || today.clocked_out || clockingOut}
                                    className="btn bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-500 hover:text-white px-8 py-4 text-base font-semibold rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <LogOut size={22} /> {clockingOut ? 'Clocking Out...' : 'Clock Out'}
                                </button>
                            </div>

                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <MiniStat label="Clock In" value={today.clock_in ? new Date(today.clock_in).toLocaleTimeString() : '—'} />
                                <MiniStat label="Clock Out" value={today.clock_out ? new Date(today.clock_out).toLocaleTimeString() : '—'} />
                                <MiniStat label="Hours" value={formatAttendanceDuration(today, now)} />
                                <MiniStat label="Status" value={today.status ? today.status.replace('_', ' ') : 'Not Clocked In'} />
                            </div>
                        </div>
                    </div>

                    {/* Company-Wide Analytics (HR/Admin) */}
                    {isHROrAdmin && companyAttendance && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-3">
                                <BarChart3 size={22} className="text-indigo-600" /> Company Attendance Analytics
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard icon={Users} label="Total Employees" value={companyAttendance.total_employees} color="indigo" />
                                <StatCard icon={CheckCircle2} label="Present Today" value={companyAttendance.present_count} color="emerald" />
                                <StatCard icon={MinusCircle} label="Half Day" value={companyAttendance.half_day_count} color="amber" />
                                <StatCard icon={XCircle} label="Not Clocked In" value={companyAttendance.not_clocked_in} color="rose" />
                            </div>

                            {/* Attendance Distribution Chart */}
                            <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Attendance Distribution</h4>
                                <div className="flex items-center gap-8">
                                    <div className="w-40 h-40 relative">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3"
                                                strokeDasharray={`${companyAttendance.present_percentage} ${100 - companyAttendance.present_percentage}`} strokeDashoffset="0" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-2xl font-semibold text-slate-900">{companyAttendance.present_percentage}%</div>
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Present</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <DistBar label="Present" pct={companyAttendance.present_percentage} color="bg-emerald-500" />
                                        <DistBar label="Not Clocked In" pct={companyAttendance.absent_percentage} color="bg-rose-400" />
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="text-sm font-semibold text-slate-700">Avg Working Hours: <span className="text-indigo-600">{companyAttendance.avg_hours}h</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Team Attendance (Manager) */}
                    {(isManager || isHROrAdmin) && teamAttendance.records.length > 0 && (
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-3">
                                <Users size={20} className="text-indigo-600" /> Team Attendance
                            </h3>
                            <div className="md:hidden space-y-3">
                                {teamAttendance.records.map((r, i) => (
                                    <div key={i} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-950 break-words">{r.employee_name}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : 'No clock in'} - {r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : 'In progress'}
                                                </p>
                                            </div>
                                            <StatusBadge status={r.status} />
                                        </div>
                                        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Hours</p>
                                            <p className="text-sm font-semibold text-slate-700 mt-1">{formatAttendanceDuration(r, now)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-[760px] w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Employee</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Clock In</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Clock Out</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Hours</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {teamAttendance.records.map((r, i) => (
                                            <tr key={i} className="hover:bg-white transition-all">
                                                <td className="px-6 py-4 font-bold text-slate-900">{r.employee_name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : '—'}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : '—'}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-700">{formatAttendanceDuration(r, now)}</td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={r.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Personal History */}
                    <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-3">
                            <Calendar size={20} className="text-indigo-600" /> My Attendance History
                        </h3>
                        <div className="space-y-3">
                            {myAttendance.records.map((r, i) => (
                                <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-white/50 border border-slate-100 hover:bg-white transition-all">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Calendar size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900 break-words">{new Date(r.attendance_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                                            <div className="text-xs text-slate-400 font-medium">
                                                {new Date(r.clock_in).toLocaleTimeString()} — {r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : 'In Progress'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4">
                                        <span className="text-sm font-semibold text-indigo-600 tabular-nums">{formatAttendanceDuration(r, now)}</span>
                                        <StatusBadge status={r.status} />
                                    </div>
                                </div>
                            ))}
                            {myAttendance.records.length === 0 && (
                                <EmptyState 
                                    title="No attendance records" 
                                    description="Clock in to start tracking your attendance." 
                                    icon={Calendar} 
                                />
                            )}
                        </div>
                    </div>
                    </>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

const MiniStat = ({ label, value }) => (
    <div className="p-3 rounded-xl bg-white/50 border border-slate-100 text-center">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-sm font-semibold text-slate-700 capitalize">{value}</div>
    </div>
);

const statColors = {
    indigo: 'group-hover:text-indigo-600',
    emerald: 'group-hover:text-emerald-600',
    amber: 'group-hover:text-amber-600',
    rose: 'group-hover:text-rose-600',
};

const StatCard = ({ icon: Icon, label, value, color }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-5 rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 group">
        <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-400 ${statColors[color]} group-hover:scale-110 transition-all duration-300`}>
                <Icon size={24} />
            </div>
        </div>
        <h2 className="text-3xl font-semibold text-slate-900 tracking-tighter">{value}</h2>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </motion.div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        present: 'bg-emerald-50 text-emerald-600',
        half_day: 'bg-amber-50 text-amber-600',
        absent: 'bg-rose-50 text-rose-600',
        not_clocked_in: 'bg-slate-50 text-slate-400',
    };
    return (
        <span className={`px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest ${styles[status] || styles.not_clocked_in}`}>
            {(status || 'not clocked in').replace('_', ' ')}
        </span>
    );
};

const DistBar = ({ label, pct, color }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-sm">
            <span className="font-bold text-slate-600">{label}</span>
            <span className="font-semibold text-slate-900">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${color}`} />
        </div>
    </div>
);

export default Attendance;


