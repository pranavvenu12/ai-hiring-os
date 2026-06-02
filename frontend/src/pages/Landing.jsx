import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    BarChart3,
    Brain,
    Briefcase,
    CheckCircle2,
    ChevronRight,
    FileText,
    Lock,
    Menu,
    Rocket,
    Search,
    ShieldCheck,
    Sparkles,
    Sun,
    Moon,
    Users,
    X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const fadeUp = {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

const Landing = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const { isDark, toggleTheme } = useTheme();

    React.useEffect(() => {
        document.title = 'AI Hiring OS | Intelligent talent operations';
    }, []);

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-950 font-inter selection:bg-indigo-100 selection:text-indigo-800">
            <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/75 backdrop-blur-2xl">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-6">
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-950"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                            <Rocket size={17} />
                        </span>
                        AI Hiring OS
                    </button>

                    <div className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
                        <button onClick={() => scrollToSection('product')} className="hover:text-slate-950">Product</button>
                        <button onClick={() => scrollToSection('workflow')} className="hover:text-slate-950">Workflow</button>
                        <button onClick={() => scrollToSection('security')} className="hover:text-slate-950">Security</button>
                        <Link to="/careers" className="hover:text-slate-950">Careers</Link>
                    </div>

                    <div className="hidden items-center gap-4 md:flex">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-950"
                            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                        >
                            {isDark ? <Moon size={17} /> : <Sun size={18} />}
                        </button>
                        <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-950">Sign in</Link>
                        <Link to="/signup" className="theme-primary-action rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
                            Get started
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen((open) => !open)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white md:hidden"
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                {isMobileMenuOpen && (
                    <div className="border-t border-slate-200 bg-white px-5 py-4 shadow-lg shadow-slate-200/60 md:hidden">
                        <div className="mx-auto flex max-w-6xl flex-col gap-1">
                            <button onClick={() => scrollToSection('product')} className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Product
                            </button>
                            <button onClick={() => scrollToSection('workflow')} className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Workflow
                            </button>
                            <button onClick={() => scrollToSection('security')} className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Security
                            </button>
                            <Link
                                to="/careers"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Careers
                            </Link>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="mt-1 flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <span>{isDark ? 'Dark theme' : 'Light theme'}</span>
                                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                                    {isDark ? <Moon size={17} /> : <Sun size={18} />}
                                </span>
                            </button>
                            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                                <Link
                                    to="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    to="/signup"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="theme-primary-action flex h-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white"
                                >
                                    Get started
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            <main>
                <section className="relative overflow-hidden px-5 pb-20 pt-20 md:px-6 md:pb-28 md:pt-28">
                    <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[520px] max-w-5xl bg-[radial-gradient(circle_at_50%_0%,rgba(47,95,143,0.16),transparent_55%)]" />
                    <div className="relative mx-auto max-w-6xl text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"
                        >
                            <Sparkles size={14} className="text-indigo-600" />
                            AI-powered hiring, built for real teams
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 26 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.045em] text-slate-950 md:text-7xl md:leading-[0.95]"
                        >
                            Hire with clarity,
                            <br />
                            not guesswork.
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.7 }}
                            className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-600 md:text-lg"
                        >
                            AI Hiring OS brings resume scoring, interview intelligence, employee records, and team workflows into one calm operating system for modern HR.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25, duration: 0.7 }}
                            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
                        >
                            <Link to="/signup" className="theme-primary-action inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-indigo-700">
                                Create account
                                <ArrowRight size={17} />
                            </Link>
                            <Link to="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50">
                                Sign in
                                <ChevronRight size={17} />
                            </Link>
                        </motion.div>
                    </div>
                </section>

                <section id="product" className="px-5 pb-24 md:px-6">
                    <motion.div {...fadeUp} className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
                        <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4">
                            <div className="flex gap-2">
                                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                            </div>
                            <span className="text-xs font-medium text-slate-400">AI Hiring OS</span>
                            <div className="h-6 w-16" />
                        </div>

                        <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[240px_1fr]">
                            <aside className="border-b border-slate-200 bg-slate-50/70 p-5 lg:border-b-0 lg:border-r">
                                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">
                                    <Sparkles size={16} />
                                    Score resumes
                                </button>
                                <div className="mt-6 space-y-1">
                                    {[
                                        [Briefcase, 'Open roles', '12', true],
                                        [Users, 'Candidates', '248'],
                                        [FileText, 'Interviews', '31'],
                                        [BarChart3, 'Analytics', ''],
                                        [ShieldCheck, 'Settings', ''],
                                    ].map(([Icon, label, count, active]) => (
                                        <div key={label} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
                                            <span className="flex items-center gap-2">
                                                <Icon size={16} />
                                                {label}
                                            </span>
                                            {count && <span className="text-xs text-slate-400">{count}</span>}
                                        </div>
                                    ))}
                                </div>
                            </aside>

                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
                                <div className="p-5 md:p-7">
                                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-indigo-600">Senior Product Designer</p>
                                            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Candidate pipeline</h2>
                                        </div>
                                        <div className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-400">
                                            <Search size={16} />
                                            Search candidates
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        {[
                                            ['Maya Rao', 'Product systems, research ops, design leadership', 96, 'Interview ready'],
                                            ['Daniel Kim', 'Design systems, dashboards, enterprise UX', 91, 'Strong match'],
                                            ['Anika Shah', 'Mobile UX, prototyping, customer research', 84, 'Review'],
                                            ['Jon Bell', 'Visual design, brand systems, motion', 78, 'Hold'],
                                        ].map(([name, desc, score, status]) => (
                                            <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/60">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                                                            {name.split(' ').map((part) => part[0]).join('')}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-950">{name}</p>
                                                            <p className="truncate text-sm text-slate-500">{desc}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-semibold text-slate-950">{score}</p>
                                                    <p className="text-xs font-medium text-slate-400">{status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold">AI recommendation</p>
                                        <Brain size={18} className="text-violet-300" />
                                    </div>
                                    <div className="mt-8">
                                        <div className="text-6xl font-semibold tracking-tight">96</div>
                                        <p className="mt-2 text-sm text-white/50">Role fit score</p>
                                    </div>
                                    <div className="mt-8 space-y-4">
                                        {[
                                            ['Strength', 'Strong design systems and enterprise product history.'],
                                            ['Signal', 'Clear evidence of stakeholder communication.'],
                                            ['Next step', 'Schedule portfolio review with hiring manager.'],
                                        ].map(([label, text]) => (
                                            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">{label}</p>
                                                <p className="mt-2 text-sm leading-6 text-white/75">{text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                <section id="workflow" className="bg-white px-5 py-24 md:px-6">
                    <div className="mx-auto max-w-6xl">
                        <motion.div {...fadeUp} className="max-w-2xl">
                            <p className="text-sm font-semibold text-indigo-600">A quieter hiring workflow</p>
                            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
                                Everything important, nothing noisy.
                            </h2>
                            <p className="mt-5 text-base leading-7 text-slate-600">
                                Keep recruiters, HR admins, and managers aligned through a focused experience designed for repeated daily use.
                            </p>
                        </motion.div>

                        <div className="mt-14 grid gap-5 md:grid-cols-3">
                            {[
                                [Sparkles, 'Screen with context', 'Score resumes against the role, not just keywords.'],
                                [Users, 'Collaborate cleanly', 'Share shortlists, interview notes, and manager feedback in one place.'],
                                [BarChart3, 'Track outcomes', 'See pipeline health, hiring progress, and performance signals without exporting spreadsheets.'],
                            ].map(([Icon, title, desc]) => (
                                <motion.div key={title} {...fadeUp} className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
                                    <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm">
                                        <Icon size={22} />
                                    </div>
                                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">{desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="security" className="px-5 py-24 md:px-6">
                    <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                        <motion.div {...fadeUp}>
                            <p className="text-sm font-semibold text-indigo-600">Built for responsible teams</p>
                            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
                                Professional by default.
                            </h2>
                            <p className="mt-5 text-base leading-7 text-slate-600">
                                Role-based access, company isolation, and focused workflows keep candidate and employee information clear, private, and actionable.
                            </p>
                            <div className="mt-8 flex flex-col gap-3">
                                {['Tenant-aware company data', 'Role-based HR and manager access', 'Candidate evaluation history'].map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                                        <CheckCircle2 size={18} className="text-indigo-600" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div {...fadeUp} className="rounded-[2rem] bg-slate-950 p-2 shadow-2xl shadow-slate-300/60">
                            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 text-white">
                                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                                    <div>
                                        <p className="text-sm font-semibold">Company access</p>
                                        <p className="mt-1 text-xs text-white/40">Secure tenant workspace</p>
                                    </div>
                                    <Lock size={20} className="text-violet-300" />
                                </div>
                                <div className="mt-6 space-y-4">
                                    {[
                                        ['HR Admin', 'Full company setup and hiring controls'],
                                        ['Manager', 'Candidate review and interview feedback'],
                                        ['Employee', 'Self-service profile and attendance'],
                                    ].map(([role, copy]) => (
                                        <div key={role} className="rounded-2xl bg-white/[0.06] p-4">
                                            <p className="text-sm font-semibold">{role}</p>
                                            <p className="mt-1 text-sm text-white/45">{copy}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <section className="bg-white px-5 py-24 text-center md:px-6">
                    <motion.div {...fadeUp} className="mx-auto max-w-3xl">
                        <h2 className="text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-6xl">
                            A calmer way to build your team.
                        </h2>
                        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600">
                            Start with one role, one candidate pipeline, and the clarity your hiring team needs to move faster.
                        </p>
                        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link to="/signup" className="theme-primary-action inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-indigo-700">
                                Create account
                                <ArrowRight size={17} />
                            </Link>
                            <Link to="/login" className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                                Sign in
                            </Link>
                        </div>
                    </motion.div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white px-5 py-8 md:px-6">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                        <Rocket size={16} className="text-indigo-600" />
                        AI Hiring OS
                    </div>
                    <p>© 2026 AI Hiring OS. Intelligent talent operations.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
