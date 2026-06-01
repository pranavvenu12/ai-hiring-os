import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Mail, Building, Users, Shield, Calendar, MapPin, ExternalLink, Globe, Layers3, UserCheck, Clock, Star, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatAttendanceDuration } from '../utils/date';

const DashboardEmployee = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [company, setCompany] = useState(() => {
        try {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                if (parsedUser && parsedUser.company_id) {
                    const cachedCompany = localStorage.getItem(`company_${parsedUser.company_id}`);
                    if (cachedCompany) {
                        return JSON.parse(cachedCompany);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to parse user/company cache in Employee dashboard:', e);
        }
        return null;
    });
    const [employeeProfile, setEmployeeProfile] = useState(null);
    const [attendanceData, setAttendanceData] = useState({ today: {}, records: [] });
    const [performanceData, setPerformanceData] = useState({ reviews: [], avg_rating: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        document.title = 'AI Hiring OS - Employee Dashboard';
        if (user) {
            fetchData();
        }
    }, [user]);

    useEffect(() => {
        if (user?.company_id) {
            const cachedCompany = localStorage.getItem(`company_${user.company_id}`);
            if (cachedCompany) {
                setCompany(JSON.parse(cachedCompany));
            }
        }
    }, [user]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch company details
            const co = await api.get(`/companies/${user.company_id}`);
            setCompany(co);
            localStorage.setItem(`company_${user.company_id}`, JSON.stringify(co));

            // Fetch employee profile details
            const empList = await api.get('/employees');
            if (empList && empList.employees && empList.employees.length > 0) {
                setEmployeeProfile(empList.employees[0]);
            }

            // Fetch my attendance records
            try {
                const att = await api.get('/attendance/me');
                setAttendanceData(att);
            } catch (err) {
                console.error("Error fetching attendance details:", err);
            }

            // Fetch my performance reviews
            try {
                const perf = await api.get('/performance/me');
                setPerformanceData(perf);
            } catch (err) {
                console.error("Error fetching performance details:", err);
            }

        } catch (error) {
            console.error("Error loading dashboard data:", error);
            setError("Failed to load dashboard metrics.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate attendance statistics
    const calculateAttendanceStats = () => {
        const records = attendanceData.records || [];
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const halfDay = records.filter(r => r.status === 'half_day').length;
        const absent = records.filter(r => r.status === 'absent').length;
        
        return { total, present, halfDay, absent };
    };

    const attStats = calculateAttendanceStats();
    const latestReview = performanceData.reviews && performanceData.reviews.length > 0 
        ? performanceData.reviews[0] 
        : null;

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Employee Portal" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-10"
                >
                    {/* Left Column: Profile Card */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600 to-violet-600 opacity-10" />
                            <div className="relative z-10">
                                {employeeProfile?.profile_photo ? (
                                    <img 
                                        src={employeeProfile.profile_photo} 
                                        alt={user?.name} 
                                        className="w-28 h-28 rounded-[2rem] object-cover mx-auto mb-6 shadow-md shadow-slate-300/50 rotate-3 border-4 border-white"
                                    />
                                ) : (
                                    <div className="w-28 h-28 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-4xl font-semibold mx-auto mb-6 shadow-md shadow-slate-300/50 rotate-3">
                                        {user?.name.charAt(0)}
                                    </div>
                                )}
                                <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">{user?.name}</h3>
                                <div className="inline-flex flex-col items-center mt-2">
                                    <span className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-indigo-100">
                                        {employeeProfile?.designation || user?.role}
                                    </span>
                                    {employeeProfile?.department && (
                                        <span className="text-xs font-bold text-slate-400 mt-1">
                                            {employeeProfile.department}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-slate-100 space-y-5 text-left">
                                <InfoRow icon={Mail} label="Professional Email" value={employeeProfile?.email || user?.email} />
                                <InfoRow icon={Building} label="Company" value={company?.name} />
                                {employeeProfile?.employee_code && (
                                    <InfoRow icon={Shield} label="Employee ID" value={employeeProfile.employee_code} />
                                )}
                                {employeeProfile?.joining_date && (
                                    <InfoRow icon={Calendar} label="Joining Date" value={new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(employeeProfile.joining_date))} />
                                )}
                                <InfoRow icon={Layers3} label="Industry" value={company?.industry} />
                                <InfoRow icon={MapPin} label="Location" value={company?.location} />
                            </div>

                            <button 
                                onClick={() => navigate('/settings')}
                                className="btn btn-secondary w-full justify-center mt-8 py-3.5 font-bold text-sm bg-white/50"
                            >
                                Settings & Profile
                            </button>
                        </div>
                    </div>

                    {/* Right Columns: Core Modules (Attendance & Performance) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Attendance Summary Widget */}
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                        <Clock size={20} />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Attendance Summary</h3>
                                </div>
                                <button 
                                    onClick={() => navigate('/attendance')}
                                    className="text-xs font-semibold text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                                >
                                    Clock In / History <ChevronRight size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                <StatMiniCard label="Present Days" value={attStats.present} color="emerald" />
                                <StatMiniCard label="Half Days" value={attStats.halfDay} color="amber" />
                                <StatMiniCard label="Absent Days" value={attStats.absent} color="rose" />
                                <StatMiniCard label="Total Tracked" value={attStats.total} color="indigo" />
                            </div>

                            {/* Today's Clock-in status */}
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">Today's Status</div>
                                    <div className="text-sm font-bold text-slate-700">
                                        {attendanceData.today?.clocked_in ? (
                                            attendanceData.today?.clocked_out ? (
                                                <span className="text-slate-500">Clocked out. Total time: {formatAttendanceDuration(attendanceData.today, now)}</span>
                                            ) : (
                                                <span className="text-indigo-600 font-bold">
                                                    Currently Clocked In since {new Date(attendanceData.today.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {formatAttendanceDuration(attendanceData.today, now)}
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-slate-400">You haven't clocked in today yet.</span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate('/attendance')}
                                    className="btn btn-primary text-xs py-2 px-4 shadow-lg shadow-indigo-600/10 whitespace-nowrap"
                                >
                                    {attendanceData.today?.clocked_in ? "View Details" : "Clock In Now"}
                                </button>
                            </div>
                        </div>

                        {/* Performance Widget */}
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                        <Star size={20} />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Performance Summary</h3>
                                </div>
                                <button 
                                    onClick={() => navigate('/performance')}
                                    className="text-xs font-semibold text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                                >
                                    All Reviews <ChevronRight size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="md:col-span-1 bg-gradient-to-br from-indigo-50 to-indigo-100/30 rounded-2xl p-6 flex flex-col justify-center items-center text-center border border-indigo-100">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">Average Rating</span>
                                    <span className="text-4xl font-semibold text-indigo-600 mb-2">{performanceData.avg_rating || '—'}</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star 
                                                key={star} 
                                                size={14} 
                                                className={star <= Math.round(performanceData.avg_rating || 0) ? 'fill-indigo-600 text-indigo-600' : 'text-slate-300'} 
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-center">
                                    {latestReview ? (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Latest Review</span>
                                                    <h4 className="text-sm font-bold text-slate-800 mt-0.5">Reviewed by {latestReview.reviewer_name}</h4>
                                                </div>
                                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                    <Star size={12} className="fill-indigo-600" /> {latestReview.rating}
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-slate-500 line-clamp-3 italic">
                                                "{latestReview.comments}"
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 space-y-2">
                                            <FileText className="text-slate-200 mx-auto" size={32} />
                                            <p className="text-xs font-medium text-slate-400">No performance reviews submitted yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Company Details Section */}
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-3">
                                <Shield size={18} className="text-indigo-600" /> Company Profile
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                {company?.description || 'Learn more about your company profile here.'}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DetailCard label="Contact Email" value={company?.contact_email || 'Not provided'} />
                                <DetailCard label="Website" value={company?.website || 'Not provided'} />
                                <DetailCard label="Location" value={company?.location || 'Not provided'} />
                                <DetailCard label="Industry" value={company?.industry || 'Not provided'} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shadow-sm">
            <Icon size={16} />
        </div>
        <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</div>
            <div className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{value || 'Loading...'}</div>
        </div>
    </div>
);

const DetailCard = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</div>
        <div className="text-xs font-bold text-slate-700 truncate">{value}</div>
    </div>
);

const StatMiniCard = ({ label, value, color }) => {
    const colors = {
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        amber: 'bg-amber-50 border-amber-100 text-amber-600',
        rose: 'bg-rose-50 border-rose-100 text-rose-600',
        indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    };

    return (
        <div className={`rounded-2xl border p-4 text-center ${colors[color] || colors.indigo}`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
        </div>
    );
};

export default DashboardEmployee;


