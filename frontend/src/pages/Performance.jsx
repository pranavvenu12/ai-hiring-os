import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Star, TrendingUp, Users, BarChart3, Send, Award, ArrowUpRight } from 'lucide-react';

const Performance = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [myPerformance, setMyPerformance] = useState({ reviews: [], avg_rating: 0 });
    const [teamReviews, setTeamReviews] = useState({ reviews: [] });
    const [companyPerformance, setCompanyPerformance] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        employee_id: '', rating: 3, strengths: '', improvements: '', comments: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const isHROrAdmin = user && ['admin', 'hr'].includes(user.role.toLowerCase());
    const isManager = user && user.role.toLowerCase() === 'manager';
    const canReview = isManager || isHROrAdmin;

    useEffect(() => {
        document.title = 'AI Hiring OS - Performance';
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const myData = await api.get('/performance/me');
            setMyPerformance(myData);

            if (canReview) {
                const teamData = await api.get('/performance/team');
                setTeamReviews(teamData);

                // Get team members for the review form
                try {
                    const empData = await api.get('/employees');
                    setTeamMembers(empData.employees || []);
                } catch (e) { console.error(e); }
            }

            if (isHROrAdmin) {
                const compData = await api.get('/performance/company');
                setCompanyPerformance(compData);
            }
        } catch (err) { console.error(err); }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/performance', reviewForm);
            setShowReviewForm(false);
            setReviewForm({ employee_id: '', rating: 3, strengths: '', improvements: '', comments: '' });
            fetchData();
            toast.success('Performance review submitted successfully!');
        } catch (err) { toast.error(err.detail || 'Failed to submit review'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Performance Management" />

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                    {/* Company Analytics (HR/Admin) */}
                    {isHROrAdmin && companyPerformance && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard icon={BarChart3} label="Avg Rating" value={`${companyPerformance.avg_rating}/5`} />
                                <StatCard icon={TrendingUp} label="Total Reviews" value={companyPerformance.total_reviews} />
                                <StatCard icon={Award} label="Top Performers" value={companyPerformance.top_performers?.length || 0} />
                                <StatCard icon={Users} label="Departments" value={companyPerformance.department_performance?.length || 0} />
                            </div>

                            {/* Top Performers */}
                            {companyPerformance.top_performers?.length > 0 && (
                                <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-3">
                                        <Award size={20} className="text-indigo-600" /> Top Performers
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {companyPerformance.top_performers.slice(0, 6).map((tp, i) => (
                                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 border border-slate-100 hover:bg-white transition-all group">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold group-hover:scale-110 transition-transform">
                                                    #{i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-slate-900 truncate">{tp.employee_name}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tp.department || 'General'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1">
                                                        <Star size={14} className="text-amber-400 fill-amber-400" />
                                                        <span className="font-semibold text-slate-900">{tp.avg_rating}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold">{tp.review_count} reviews</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Department Performance */}
                            {companyPerformance.department_performance?.length > 0 && (
                                <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-6">Department Performance</h3>
                                    <div className="space-y-4">
                                        {companyPerformance.department_performance.map((dp, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-sm font-bold text-slate-700">{dp.department}</span>
                                                    <span className="text-sm font-semibold text-indigo-600">{dp.avg_rating}/5 ({dp.employee_count} employees)</span>
                                                </div>
                                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(dp.avg_rating / 5) * 100}%` }}
                                                        transition={{ duration: 1, delay: i * 0.1 }}
                                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Submit Review (Manager/HR) */}
                    {canReview && (
                        <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                                    <Send size={20} className="text-indigo-600" /> Submit Performance Review
                                </h3>
                                {!showReviewForm && (
                                    <button onClick={() => setShowReviewForm(true)} className="btn btn-primary px-6 py-2 text-sm font-bold shadow-sm">
                                        <Send size={16} /> Write Review
                                    </button>
                                )}
                            </div>

                            {showReviewForm && (
                                <form onSubmit={handleSubmitReview} className="space-y-5 max-w-xl">
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Employee</label>
                                        <select value={reviewForm.employee_id} onChange={e => setReviewForm({...reviewForm, employee_id: e.target.value})} required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-indigo-600">
                                            <option value="">Select employee...</option>
                                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name} — {m.department || 'No dept'}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Rating</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <button key={n} type="button" onClick={() => setReviewForm({...reviewForm, rating: n})}
                                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${n <= reviewForm.rating ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/30' : 'bg-slate-50 text-slate-300 border border-slate-200'}`}>
                                                    <Star size={20} className={n <= reviewForm.rating ? 'fill-white' : ''} />
                                                </button>
                                            ))}
                                            <span className="ml-3 self-center text-lg font-semibold text-slate-700">{reviewForm.rating}/5</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Strengths</label>
                                        <textarea value={reviewForm.strengths} onChange={e => setReviewForm({...reviewForm, strengths: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-indigo-600 min-h-[80px]" placeholder="What does this employee excel at?" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Areas for Improvement</label>
                                        <textarea value={reviewForm.improvements} onChange={e => setReviewForm({...reviewForm, improvements: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-indigo-600 min-h-[80px]" placeholder="Where can this employee grow?" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Additional Comments</label>
                                        <textarea value={reviewForm.comments} onChange={e => setReviewForm({...reviewForm, comments: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-indigo-600 min-h-[60px]" placeholder="Any other feedback..." />
                                    </div>

                                    <div className="flex gap-3">
                                        <button type="submit" disabled={submitting} className="btn btn-primary px-8 py-3 font-bold shadow-sm">
                                            {submitting ? 'Submitting...' : 'Submit Review'}
                                        </button>
                                        <button type="button" onClick={() => setShowReviewForm(false)} className="btn btn-secondary px-6 py-3 font-bold">Cancel</button>
                                    </div>
                                </form>
                            )}

                            {/* Team Reviews */}
                            {!showReviewForm && teamReviews.reviews?.length > 0 && (
                                <div className="space-y-3 mt-4">
                                    {teamReviews.reviews.slice(0, 5).map((r, i) => (
                                        <ReviewCard key={i} review={r} showEmployee />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* My Performance */}
                    <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
                                <Star size={20} className="text-indigo-600" /> My Performance Reviews
                            </h3>
                            {myPerformance.avg_rating > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl">
                                    <Star size={16} className="text-amber-400 fill-amber-400" />
                                    <span className="font-semibold text-indigo-600">{myPerformance.avg_rating}/5 avg</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {myPerformance.reviews.map((r, i) => (
                                <ReviewCard key={i} review={r} />
                            ))}
                            {myPerformance.reviews.length === 0 && (
                                <div className="text-center py-12 text-slate-400 font-medium text-sm">
                                    No performance reviews yet.
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value }) => (
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

const ReviewCard = ({ review, showEmployee = false }) => (
    <div className="p-5 rounded-2xl bg-white/50 border border-slate-100 hover:bg-white transition-all">
        <div className="flex justify-between items-start mb-3">
            <div>
                {showEmployee && <div className="font-semibold text-slate-900">{review.employee_name}</div>}
                <div className="text-xs text-slate-400 font-bold">
                    {showEmployee ? 'Reviewed' : 'By'} {review.reviewer_name || 'Manager'} · {new Date(review.review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            </div>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={14} className={n <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                ))}
            </div>
        </div>
        {review.strengths && (
            <div className="mb-2">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">Strengths: </span>
                <span className="text-sm text-slate-600">{review.strengths}</span>
            </div>
        )}
        {review.improvements && (
            <div className="mb-2">
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Improvements: </span>
                <span className="text-sm text-slate-600">{review.improvements}</span>
            </div>
        )}
        {review.comments && <p className="text-sm text-slate-500 italic">"{review.comments}"</p>}
    </div>
);

export default Performance;


