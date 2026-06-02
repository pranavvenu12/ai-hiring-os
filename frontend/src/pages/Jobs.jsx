import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Plus, Briefcase, ExternalLink, Loader2, Search, Filter, MoreHorizontal, X, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatShortDate } from '../utils/date';

const Jobs = () => {
    const [jobs, setJobs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newJob, setNewJob] = useState({
        title: '',
        department: '',
        location: '',
        employment_type: 'Full-time',
        open_until: '',
        description: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        document.title = 'AI Hiring OS - Jobs';
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const data = await api.get('/jobs');
            setJobs(data);
        } catch (err) { console.error(err); }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/jobs', {
                ...newJob,
                open_until: newJob.open_until ? `${newJob.open_until}T23:59:59` : null,
            });
            setIsModalOpen(false);
            setNewJob({
                title: '',
                department: '',
                location: '',
                employment_type: 'Full-time',
                open_until: '',
                description: '',
            });
            fetchJobs();
            toast.success('Job posting published successfully!');
        } catch (err) { toast.error(err.detail || 'Failed to create job'); }
        finally { setIsLoading(false); }
    };

    const filteredJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Manage Positions" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Header Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 md:gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-6 flex-1 w-full md:w-auto">
                            <div className="relative flex-1 max-w-full md:max-w-md group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Filter positions..." 
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-secondary px-4 py-3 bg-white justify-center sm:justify-start">
                                <Filter size={18} />
                                Filters
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(true)} 
                            className="btn btn-primary px-6 py-3 shadow-sm w-full md:w-auto"
                        >
                            <Plus size={20} /> 
                            Create Job Posting
                        </button>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredJobs.map((job, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={job.id}
                                className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                                        <Briefcase size={19} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-slate-950 leading-snug break-words">{job.title}</h3>
                                        <p className="text-xs font-medium text-slate-400 mt-1">
                                            {job.location || 'Location not set'} • Open till {job.open_until ? formatShortDate(job.open_until) : 'not set'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-widest">
                                        {job.department || 'General'}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-widest">
                                        {job.employment_type || 'Full-time'}
                                    </span>
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Active
                                    </span>
                                </div>
                                <Link
                                    to={`/candidates?job_id=${job.id}`}
                                    className="mt-4 btn btn-secondary w-full justify-center py-3 text-xs font-semibold bg-white"
                                >
                                    View Candidates <ExternalLink size={14} />
                                </Link>
                            </motion.div>
                        ))}
                        {filteredJobs.length === 0 && (
                            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FileText size={28} className="text-slate-300" />
                                </div>
                                <h4 className="text-base font-semibold text-slate-900 mb-2">No jobs found</h4>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                    Try adjusting your search or create a new job posting.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                        <table className="min-w-[780px] w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Job Information</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Department</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-8 py-5 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/30">
                                {filteredJobs.map((job, i) => (
                                    <motion.tr 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={job.id} 
                                        className="hover:bg-white transition-all duration-300 group"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300">
                                                    <Briefcase size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</div>
                                                    <div className="text-xs font-bold text-slate-400 mt-0.5">
                                                        {job.location || 'Location not set'} • Open till {job.open_until ? formatShortDate(job.open_until) : 'not set'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-widest inline-block">
                                                {job.department || 'General'}
                                            </div>
                                            <div className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                                {job.employment_type || 'Full-time'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-sm font-bold text-emerald-600">Active</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link 
                                                    to={`/candidates?job_id=${job.id}`} 
                                                    className="btn btn-secondary px-4 py-2 text-xs font-bold bg-white/50 hover:bg-indigo-600 hover:text-white transition-all"
                                                >
                                                    Candidates <ExternalLink size={14} />
                                                </Link>
                                                <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                                {filteredJobs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-24 text-center">
                                            <div className="max-w-xs mx-auto">
                                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                    <FileText size={32} className="text-slate-200" />
                                                </div>
                                                <h4 className="text-lg font-semibold text-slate-900 mb-2">No jobs found</h4>
                                                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                                    Try adjusting your search or create a new job posting to start hiring.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </motion.div>

                {/* Create Job Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsModalOpen(false)}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative bg-white max-w-2xl w-full max-h-[92vh] overflow-y-auto p-8 rounded-[1.5rem] shadow-xl shadow-slate-200/70 border border-slate-200"
                            >
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-sm">
                                            <Plus size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Post a Job</h3>
                                            <p className="text-sm font-medium text-slate-400">Define your ideal candidate requirements</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateJob} className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Position Title</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-bold" 
                                            placeholder="e.g. Senior Backend Engineer" 
                                            value={newJob.title}
                                            onChange={e => setNewJob({...newJob, title: e.target.value})}
                                            required 
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Department</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium"
                                                placeholder="e.g. Engineering"
                                                value={newJob.department}
                                                onChange={e => setNewJob({...newJob, department: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Location</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium"
                                                placeholder="e.g. Bangalore / Remote"
                                                value={newJob.location}
                                                onChange={e => setNewJob({...newJob, location: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Employment Type</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium"
                                                value={newJob.employment_type}
                                                onChange={e => setNewJob({...newJob, employment_type: e.target.value})}
                                                required
                                            >
                                                <option>Full-time</option>
                                                <option>Internship</option>
                                                <option>Contract</option>
                                                <option>Part-time</option>
                                                <option>Remote</option>
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Open Till</label>
                                            <input
                                                type="date"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium"
                                                value={newJob.open_until}
                                                onChange={e => setNewJob({...newJob, open_until: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Job Description & Requirements</label>
                                        <textarea 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium min-h-[200px]" 
                                            placeholder="Describe the role, key responsibilities, and must-have skills..." 
                                            value={newJob.description}
                                            onChange={e => setNewJob({...newJob, description: e.target.value})}
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsModalOpen(false)} 
                                            className="btn btn-secondary flex-1 justify-center py-4 font-semibold"
                                        >
                                            Discard
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isLoading} 
                                            className="btn btn-primary flex-[2] justify-center py-4 font-semibold shadow-sm"
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" /> : 'Publish Job Posting'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Jobs;


