import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { Plus, Briefcase, ExternalLink, Loader2, Search, Filter, MoreHorizontal, X, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Jobs = () => {
    const [jobs, setJobs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newJob, setNewJob] = useState({ title: '', description: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
            await api.post('/jobs', newJob);
            setIsModalOpen(false);
            setNewJob({ title: '', description: '' });
            fetchJobs();
        } catch (err) { alert(err.detail || 'Failed to create job'); }
        finally { setIsLoading(false); }
    };

    const filteredJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex bg-slate-50 min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] p-6 md:p-10">
                <Topbar title="Manage Positions" />
                
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Header Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6 flex-1 w-full md:w-auto">
                            <div className="relative flex-1 max-w-md group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Filter positions..." 
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="btn btn-secondary px-4 py-3 bg-white">
                                <Filter size={18} />
                                Filters
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(true)} 
                            className="btn btn-primary px-6 py-3 shadow-xl shadow-indigo-600/20 w-full md:w-auto"
                        >
                            <Plus size={20} /> 
                            Create Job Posting
                        </button>
                    </div>

                    {/* Table / Grid */}
                    <div className="glass-morphism rounded-[2.5rem] border border-white/50 overflow-hidden shadow-2xl shadow-slate-200/50">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Job Information</th>
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Department</th>
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
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
                                                    <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</div>
                                                    <div className="text-xs font-bold text-slate-400 mt-0.5">Created on May 1, 2026</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest inline-block">
                                                {job.department || 'General'}
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
                                                <h4 className="text-lg font-black text-slate-900 mb-2">No jobs found</h4>
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
                                className="relative glass-morphism max-w-xl w-full p-10 rounded-[3rem] shadow-2xl border border-white/50 bg-white"
                            >
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                            <Plus size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Post a Job</h3>
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
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Position Title</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-bold" 
                                            placeholder="e.g. Senior Backend Engineer" 
                                            value={newJob.title}
                                            onChange={e => setNewJob({...newJob, title: e.target.value})}
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Job Description & Requirements</label>
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
                                            className="btn btn-secondary flex-1 justify-center py-4 font-black"
                                        >
                                            Discard
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isLoading} 
                                            className="btn btn-primary flex-[2] justify-center py-4 font-black shadow-xl shadow-indigo-600/20"
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
