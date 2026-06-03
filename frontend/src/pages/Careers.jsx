import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    Briefcase,
    CalendarDays,
    CheckCircle2,
    FileText,
    Globe,
    Link as LinkIcon,
    Loader2,
    Mail,
    MapPin,
    Moon,
    Phone,
    Rocket,
    Search,
    Sun,
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
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [applicationSent, setApplicationSent] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { isDark, toggleTheme } = useTheme();

    useEffect(() => {
        document.title = jobId ? 'AI Hiring OS - Apply' : 'AI Hiring OS - Careers';
    }, [jobId]);

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        if (!jobId) {
            setSelectedJob(null);
            setApplicationSent(false);
            setForm(emptyForm);
            return;
        }

        const existing = jobs.find((job) => job.id === jobId);
        if (existing) {
            setSelectedJob(existing);
            return;
        }

        fetchJobDetail(jobId);
    }, [jobId, jobs]);

    const fetchJobs = async () => {
        setIsLoading(true);
        try {
            const data = await api.get('/jobs/public');
            setJobs(Array.isArray(data) ? data : []);
        } catch (error) {
            setJobs([]);
            const isMissingPublicEndpoint = error?.status === 404 || error?.detail === 'Not Found';
            if (!isMissingPublicEndpoint) {
                toast.error(error.detail || 'Unable to load open roles.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchJobDetail = async (id) => {
        setIsDetailLoading(true);
        try {
            const data = await api.get(`/jobs/public/${id}`);
            setSelectedJob(data);
        } catch (error) {
            toast.error(error.detail || 'Unable to load this job.');
            navigate('/careers', { replace: true });
        } finally {
            setIsDetailLoading(false);
        }
    };

    const filteredJobs = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return jobs;
        return jobs.filter((job) => (
            job.title?.toLowerCase().includes(query)
            || job.company_name?.toLowerCase().includes(query)
            || job.description?.toLowerCase().includes(query)
            || job.location?.toLowerCase().includes(query)
            || job.salary_range?.toLowerCase().includes(query)
        ));
    }, [jobs, searchQuery]);

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
        <div className="min-h-screen bg-[#f8fafc] text-slate-950 transition-colors dark:bg-[#070707] dark:text-white">
            <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d0d0f]/85">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
                    <Link to="/" className="flex items-center gap-3 text-sm font-semibold tracking-tight">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
                            <Rocket size={18} />
                        </span>
                        AI Hiring OS Careers
                    </Link>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                        >
                            {isDark ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <Link to="/" className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:flex">
                            <ArrowLeft size={16} />
                            Home
                        </Link>
                    </div>
                </div>
            </nav>

            {jobId ? (
                <JobDetail
                    job={selectedJob}
                    isLoading={isDetailLoading || isLoading}
                    form={form}
                    applicationSent={applicationSent}
                    isApplying={isApplying}
                    onFieldChange={updateForm}
                    onApply={handleApply}
                />
            ) : (
                <JobBoard
                    jobs={filteredJobs}
                    hasAnyJobs={jobs.length > 0}
                    isLoading={isLoading}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
            )}
        </div>
    );
};

const JobBoard = ({ jobs, hasAnyJobs, isLoading, searchQuery, onSearchChange }) => (
    <main className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-16">
        <section className="mb-10 md:mb-14">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl"
            >
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Public Candidate Portal</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white md:text-6xl">
                    Find your next role.
                </h1>
                <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">
                    Browse company openings and apply with your resume. Every application enters the AI screening pipeline automatically.
                </p>
            </motion.div>
        </section>

        {hasAnyJobs && (
            <div className="relative mb-8 max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/10"
                    placeholder="Search open roles..."
                />
            </div>
        )}

        {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white text-sm font-semibold text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                <Loader2 className="mr-3 animate-spin" size={18} />
                Loading open jobs...
            </div>
        ) : jobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job, index) => (
                    <JobCard key={job.id} job={job} index={index} />
                ))}
            </div>
        ) : (
            <EmptyOpenings />
        )}
    </main>
);

const JobCard = ({ job, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
    >
        <Link
            to={`/careers/${job.id}`}
            className="group flex h-full min-h-[270px] flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.045] dark:hover:border-white/20 dark:hover:shadow-black/30"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-950 dark:bg-white/10 dark:text-white">
                    <Briefcase size={21} />
                </div>
                <ArrowRight className="mt-2 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-950 dark:text-slate-600 dark:group-hover:text-white" size={20} />
            </div>

            <div className="mt-6 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {job.company_name}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {job.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {job.description}
                </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
                <Pill icon={Banknote}>{job.salary_range || 'Salary not disclosed'}</Pill>
                <Pill icon={MapPin}>{job.location || 'Location not set'}</Pill>
            </div>
        </Link>
    </motion.div>
);

const JobDetail = ({
    job,
    isLoading,
    form,
    applicationSent,
    isApplying,
    onFieldChange,
    onApply,
}) => (
    <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <Link
            to="/careers"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
            <ArrowLeft size={16} />
            Back to openings
        </Link>

        {isLoading || !job ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white text-sm font-semibold text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                <Loader2 className="mr-3 animate-spin" size={18} />
                Loading job...
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_460px]">
                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.045] md:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {job.company_name}
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white md:text-5xl">
                        {job.title}
                    </h1>
                    <p className="mt-5 max-w-3xl whitespace-pre-wrap text-base leading-8 text-slate-600 dark:text-slate-300">
                        {job.description}
                    </p>

                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <DetailItem icon={Banknote} label="Salary" value={job.salary_range || 'Salary not disclosed'} />
                        <DetailItem icon={MapPin} label="Location" value={job.location || 'Location not specified'} />
                        <DetailItem icon={Briefcase} label="Employment" value={job.employment_type || 'Full-time'} />
                        <DetailItem icon={CalendarDays} label="Open Till" value={job.open_until ? formatShortDate(job.open_until) : 'Not specified'} />
                    </div>
                </section>

                <ApplicationForm
                    form={form}
                    applicationSent={applicationSent}
                    isApplying={isApplying}
                    onFieldChange={onFieldChange}
                    onApply={onApply}
                />
            </div>
        )}
    </main>
);

const ApplicationForm = ({ form, applicationSent, isApplying, onFieldChange, onApply }) => (
    <form
        onSubmit={onApply}
        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.045] md:p-7"
    >
        <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Apply</h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                Your resume enters AI screening automatically after upload.
            </p>
        </div>

        {applicationSent && (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="mb-2" size={18} />
                Application received. Recruiters can now see your candidate record.
            </div>
        )}

        <div className="space-y-4">
            <CareersField icon={User} label="Name" value={form.name} onChange={(value) => onFieldChange('name', value)} required />
            <CareersField icon={Mail} label="Email" type="email" value={form.email} onChange={(value) => onFieldChange('email', value)} required />
            <CareersField icon={Phone} label="Phone" value={form.phone} onChange={(value) => onFieldChange('phone', value)} required />
            <CareersField icon={LinkIcon} label="LinkedIn URL" value={form.linkedin_url} onChange={(value) => onFieldChange('linkedin_url', value)} />
            <CareersField icon={Globe} label="Portfolio URL" value={form.portfolio_url} onChange={(value) => onFieldChange('portfolio_url', value)} />

            <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">Resume PDF</span>
                <span className="block cursor-pointer rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-slate-400 dark:border-white/10 dark:bg-black/20 dark:hover:border-white/30">
                    <UploadCloud className="mx-auto text-slate-400" size={26} />
                    <span className="mt-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {form.resume ? form.resume.name : 'Upload your resume'}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-slate-400">PDF only</span>
                    <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="sr-only"
                        onChange={(event) => onFieldChange('resume', event.target.files?.[0] || null)}
                        required
                    />
                </span>
            </label>
        </div>

        <button
            type="submit"
            disabled={isApplying}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
            {isApplying ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            Submit Application
        </button>
    </form>
);

const EmptyOpenings = () => (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white px-6 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <FileText className="text-slate-300 dark:text-slate-600" size={46} />
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            No job openings yet
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            When HR or a manager has a company requirement, they can publish a job opening. Those openings will appear here for candidates to apply.
        </p>
    </div>
);

const Pill = ({ icon: Icon, children }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
        <Icon size={14} />
        {children}
    </span>
);

const DetailItem = ({ icon: Icon, label, value }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
        <Icon className="text-slate-400" size={19} />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
);

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
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white dark:focus:ring-white/10"
                placeholder={label}
            />
        </span>
    </label>
);

export default Careers;
