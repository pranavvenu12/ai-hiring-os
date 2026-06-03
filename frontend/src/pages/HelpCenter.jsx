import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LifeBuoy, Settings, Users, Briefcase, ShieldCheck } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const HelpCenter = () => {
    React.useEffect(() => {
        document.title = 'AI Hiring OS - Help Center';
    }, []);

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Help Center" />

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <Panel icon={LifeBuoy} title="Support" text="Need help? Use the resources below or contact the team directly." />
                        <Panel icon={ShieldCheck} title="Security" text="All data is tenant-scoped and protected by authenticated API access." />
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[1.5rem] p-6 md:p-8 border border-slate-200 shadow-sm">
                            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">Common tasks</h2>
                            <p className="text-sm text-slate-400 mb-8">Jump to the main product areas without leaving the app.</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <QuickLink icon={Briefcase} title="Jobs" to="/jobs" description="Create and manage job postings." />
                                <QuickLink icon={Users} title="Candidates" to="/candidates" description="Review uploaded resumes and AI scores." />
                                <QuickLink icon={Settings} title="Company Settings" to="/settings" description="Edit company details and tenant profile." />
                            </div>
                        </div>

                        <div className="bg-white rounded-[1.5rem] p-6 md:p-8 border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-900 mb-4">Need direct help?</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                Need assistance with your organization settings or matching algorithms? Use the button below to update your company profile or configure security parameters.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Link to="/settings" className="btn btn-primary px-6 py-3 font-semibold">
                                    Update Company Info
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

const Panel = ({ icon: Icon, title, text }) => (
    <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <Icon size={22} />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
    </div>
);

const QuickLink = ({ icon: Icon, title, to, description }) => (
    <Link to={to} className="rounded-3xl border border-slate-100 bg-white/60 p-5 hover:bg-white hover:shadow-lg transition-all block">
        <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                <Icon size={20} />
            </div>
            <div>
                <div className="font-semibold text-slate-900">{title}</div>
                <div className="text-sm text-slate-400 mt-1 leading-relaxed">{description}</div>
            </div>
        </div>
    </Link>
);

export default HelpCenter;


