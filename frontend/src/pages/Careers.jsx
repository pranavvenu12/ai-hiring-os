import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    Briefcase,
    CheckCircle2,
    FileText,
    Globe,
    CalendarDays,
    Link as LinkIcon,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Rocket,
    Search,
    Sun,
    Moon,
    UploadCloud,
    User,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { formatShortDate } from '../utils/date';

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    portfolio_url: '',
    resume: null,
};

const Careers = () => {
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [applicationSent, setApplicationSent] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { isDark, toggleTheme } = useTheme();

    useEffect(() => {
        document.title = 'AI Hiring OS - Careers';
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            const data = await api.get('/jobs/public');
            setJobs(Array.isArray(data) ? data : []);
            if (Array.isArray(data) && data.length > 0) {
                setSelectedJobId(data[0].id);
            }
        } catch (error) {
            toast.error(error.detail || 'Unable to load open roles.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredJobs = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return jobs;
        return jobs.filter((job) => (
            job.title.toLowerCase().includes(query)
            || job.company_name.toLowerCase().includes(query)
            || job.description.toLowerCase().includes(query)
        ));
    }, [jobs, searchQuery]);

    const selectedJob = filteredJobs.find((job) => job.id === selectedJobId) || filteredJobs[0] || null;

    useEffect(() => {
        if (filteredJobs.length > 0 && !filteredJobs.some((job) => job.id === selectedJobId)) {
            setSelectedJobId(filteredJobs[0].id);
        }
    }, [filteredJobs, selectedJobId]);

    const updateForm = (field, value) => {
        setApplicationSent(false);
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleApply = async (event) => {
        event.preventDefault();
        if (!selectedJob || isApplying) return;
        if (!form.resume) {
            toast.warning('Please upload your PDF resume.');
            return;
        }

        const payload = new FormData();
        payload.append('name', form.name);
        payload.append('email', form.email);
        payload.append('phone', form.phone);
        payload.append('linkedin_url', form.linkedin_url);
        payload.append('portfolio_url', form.portfolio_url);
        payload.append('resume', form.resume);

        setIsApplying(true);
        try {
            await api.post(`/jobs/public/${selectedJob.id}/apply`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setApplicationSent(true);
            setForm(emptyForm);
            toast.success('Application submitted. AI screening has started.');
        } catch (error) {
            toast.error(error.detail || 'Failed to submit application.');
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-950 font-inter">
            <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 backdrop-blur-2xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
                    <Link to="/" className="flex items-center gap-3 text-sm font-semibold tracking-tight text-slate-950">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                            <Rocket size={18} />
                        </span>
                        AI Hiring OS Careers
                    </Link>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-950"
                            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                        >
                            {isDark ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <Link to="/" className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            <ArrowLeft size={16} />
                            Home
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
                <section className="mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl"
                    >
                        <p className="text-sm font-semibold text-indigo-600">Public Candidate Portal</p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl">
                            Find your next role.
                        </h1>
                        <p className="mt-5 text-base leading-7 text-slate-600 md:text-lg">
                            Apply with your resume and AI Hiring OS will route your profile into the recruiter pipeline for screening, scoring, and review.
                        </p>
                    </motion.div>
                </section>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
                    <aside className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                                placeholder="Search open roles..."
                            />
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-slate-100 px-5 py-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Open Jobs ({filteredJobs.length})
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="flex items-center gap-3 px-5 py-8 text-sm font-semibold text-slate-400">
                                    <Loader2 className="animate-spin" size={18} />
                                    Loading jobs...
                                </div>
                            ) : filteredJobs.length > 0 ? (
                                <div className="max-h-[620px] overflow-y-auto">
                                    {filteredJobs.map((job) => (
                                        <button
                                            key={job.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedJobId(job.id);
                                                setApplicationSent(false);
                                            }}
                                            className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${
                                                selectedJob?.id === job.id ? 'bg-slate-50' : ''
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                                    <Briefcase size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-950">{job.title}</div>
                                                    <div className="mt-1 text-xs font-semibold text-slate-400">{job.company_name}</div>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                                                            {job.location || 'Location not set'}
                                                        </span>
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                                                            Till {job.open_until ? formatShortDate(job.open_until) : 'not set'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-5 py-10 text-center">
                                    <FileText className="mx-auto text-slate-300" size={34} />
                                    <p className="mt-4 text-sm font-semibold text-slate-500">No matching jobs found.</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
                        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                            {selectedJob ? (
                                <>
                                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                                                {selectedJob.company_name}
                                            </div>
                                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                                                {selectedJob.title}
                                            </h2>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                                                    {selectedJob.department || 'General'}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                                                    {selectedJob.employment_type || 'Full-time'}
                                                </span>
                                            </div>
                                            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-500 sm:flex-row sm:flex-wrap sm:items-center">
                                                <span className="inline-flex items-center gap-2">
                                                    <MapPin size={15} />
                                                    {selectedJob.location || 'Location not specified'}
                                                </span>
                                                <span className="hidden sm:inline text-slate-300">-</span>
                                                <span className="inline-flex items-center gap-2">
                                                    <CalendarDays size={15} />
                                                    Open till {selectedJob.open_until ? formatShortDate(selectedJob.open_until) : 'not specified'}
                                                </span>
                                            </div>
                                        </div>
                                        <a
                                            href="#apply"
                                            className="theme-primary-action inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white"
                                        >
                                            Apply now
                                            <ArrowRight size={16} />
                                        </a>
                                    </div>

                                    <div className="prose prose-slate max-w-none pt-7">
                                        <h3 className="text-lg font-semibold text-slate-950">Role Details</h3>
                                        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                            {selectedJob.description}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                                    <Briefcase className="text-slate-300" size={42} />
                                    <h2 className="mt-4 text-xl font-semibold text-slate-900">No open jobs yet</h2>
                                    <p className="mt-2 max-w-sm text-sm text-slate-500">
                                        Careers will stay empty until HR/Admin/Manager publishes a job with a future open-till date.
                                    </p>
                                </div>
                            )}
                        </div>

                        <form
                            id="apply"
                            onSubmit={handleApply}
                            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-7"
                        >
                            <div className="mb-6">
                                <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Apply</h3>
                                <p className="mt-1 text-sm font-medium text-slate-500">
                                    Your resume enters AI screening automatically after upload.
                                </p>
                            </div>

                            {applicationSent && (
                                <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                                    <CheckCircle2 className="mb-2" size={18} />
                                    Application received. Recruiters can now see your candidate record.
                                </div>
                            )}

                            <div className="space-y-4">
                                <CareersField icon={User} label="Name" value={form.name} onChange={(value) => updateForm('name', value)} required />
                                <CareersField icon={Mail} label="Email" type="email" value={form.email} onChange={(value) => updateForm('email', value)} required />
                                <CareersField icon={Phone} label="Phone" value={form.phone} onChange={(value) => updateForm('phone', value)} required />
                                <CareersField icon={LinkIcon} label="LinkedIn URL" value={form.linkedin_url} onChange={(value) => updateForm('linkedin_url', value)} />
                                <CareersField icon={Globe} label="Portfolio URL" value={form.portfolio_url} onChange={(value) => updateForm('portfolio_url', value)} />

                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Resume PDF</span>
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-indigo-200">
                                        <UploadCloud className="mx-auto text-slate-400" size={26} />
                                        <p className="mt-2 text-sm font-semibold text-slate-700">
                                            {form.resume ? form.resume.name : 'Upload your resume'}
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-slate-400">PDF only</p>
                                        <input
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            className="sr-only"
                                            onChange={(event) => updateForm('resume', event.target.files?.[0] || null)}
                                            required
                                        />
                                    </div>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedJob || isApplying}
                                className="btn btn-primary mt-6 w-full justify-center py-3.5 text-sm disabled:opacity-60"
                            >
                                {isApplying ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                                Submit Application
                            </button>
                        </form>
                    </section>
                </div>
            </main>
        </div>
    );
};

const CareersField = ({ icon: Icon, label, value, onChange, type = 'text', required = false }) => (
    <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
        <span className="relative block">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={required}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                placeholder={label}
            />
        </span>
    </label>
);

export default Careers;
