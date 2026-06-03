import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Globe, Mail, MapPin, Layers3, Users, Lock, ShieldCheck, Save } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const emptyForm = {
    name: '',
    industry: '',
    website: '',
    location: '',
    employee_count_range: '',
    contact_email: '',
    description: '',
};

const Settings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [company, setCompany] = useState(() => {
        const cached = localStorage.getItem(`company_${user?.company_id}`);
        return cached ? JSON.parse(cached) : null;
    });
    const [form, setForm] = useState(() => {
        const cached = localStorage.getItem(`company_${user?.company_id}`);
        if (cached) {
            const data = JSON.parse(cached);
            return {
                name: data.name || '',
                industry: data.industry || '',
                website: data.website || '',
                location: data.location || '',
                employee_count_range: data.employee_count_range || '',
                contact_email: data.contact_email || '',
                description: data.description || '',
            };
        }
        return emptyForm;
    });
    const [isLoading, setIsLoading] = useState(!company);
    const [isSaving, setIsSaving] = useState(false);
    const [companyUsers, setCompanyUsers] = useState([]);

    const canEdit = ['admin', 'hr'].includes(user?.role?.toLowerCase?.() || '');
    const hrContact = companyUsers.find((member) => ['admin', 'hr'].includes(member.role?.toLowerCase?.() || ''));
    const visibleTeamSize = company?.employee_count_range || (companyUsers.length ? `${companyUsers.length} team member${companyUsers.length === 1 ? '' : 's'}` : '');
    const visibleContactEmail = company?.contact_email || hrContact?.email || '';

    const fetchCompany = useCallback(async () => {
        if (!user?.company_id) return;
        try {
            const data = await api.get(`/companies/${user.company_id}`);
            setCompany(data);
            setForm({
                name: data.name || '',
                industry: data.industry || '',
                website: data.website || '',
                location: data.location || '',
                employee_count_range: data.employee_count_range || '',
                contact_email: data.contact_email || '',
                description: data.description || '',
            });
            localStorage.setItem(`company_${user.company_id}`, JSON.stringify(data));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id]);

    const fetchCompanyUsers = useCallback(async () => {
        try {
            const users = await api.get('/users?limit=500');
            setCompanyUsers(Array.isArray(users) ? users : []);
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        document.title = 'AI Hiring OS - Settings';
        if (user?.company_id) {
            const cached = localStorage.getItem(`company_${user.company_id}`);
            if (cached) {
                const data = JSON.parse(cached);
                setCompany(data);
                setForm({
                    name: data.name || '',
                    industry: data.industry || '',
                    website: data.website || '',
                    location: data.location || '',
                    employee_count_range: data.employee_count_range || '',
                    contact_email: data.contact_email || '',
                    description: data.description || '',
                });
                setIsLoading(false);
            }
            fetchCompany();
            fetchCompanyUsers();
        }
    }, [fetchCompany, fetchCompanyUsers, user?.company_id]);

    const handleChange = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canEdit) return;

        setIsSaving(true);
        try {
            const updated = await api.put(`/companies/${user.company_id}`, form);
            setCompany(updated);
            localStorage.setItem(`company_${user.company_id}`, JSON.stringify(updated));
            toast.success('Company details saved.');
        } catch (error) {
            toast.error(error.detail || 'Failed to save company details');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Company Settings" />

                {isLoading && !company ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse mt-8">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 bg-slate-200 rounded-full w-2/3" />
                                        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                                    </div>
                                </div>
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <div key={n} className="h-14 bg-slate-100 rounded-2xl w-full" />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-[1.5rem] p-6 md:p-8 border border-slate-200 shadow-sm space-y-8">
                                <div className="space-y-2">
                                    <div className="h-6 bg-slate-200 rounded-full w-1/4" />
                                    <div className="h-4 bg-slate-100 rounded-full w-1/3" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    {[1, 2, 3, 4, 5, 6].map((n) => (
                                        <div key={n} className="space-y-2">
                                            <div className="h-3 bg-slate-100 rounded-full w-1/4" />
                                            <div className="h-14 bg-slate-100 rounded-2xl w-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                                        <Building2 size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">{company?.name || 'Your Company'}</h2>
                                        <p className="text-sm text-slate-400 font-medium">Managed by {user?.role?.toUpperCase?.() || 'USER'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SettingSummary icon={Layers3} label="Industry" value={company?.industry} />
                                    <SettingSummary icon={Globe} label="Website" value={company?.website} />
                                    <SettingSummary icon={MapPin} label="Location" value={company?.location} />
                                    <SettingSummary icon={Users} label="Team Size" value={visibleTeamSize} />
                                    <SettingSummary icon={Mail} label="Contact Email" value={visibleContactEmail} />
                                    {!canEdit && hrContact && (
                                        <SettingSummary icon={ShieldCheck} label="HR/Admin Contact" value={`${hrContact.name} - ${hrContact.email}`} />
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <ShieldCheck className="text-indigo-600" size={20} />
                                    <h3 className="text-lg font-semibold text-slate-900">Account Security</h3>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                    Auth is handled by Supabase, and company edits are restricted to HR/Admin roles within the authenticated tenant.
                                    {!canEdit && !company?.industry && !company?.website && !company?.location && (
                                        <span className="block mt-3 text-slate-400">
                                            Company profile details have not been completed by HR/Admin yet.
                                        </span>
                                    )}
                                </p>
                                <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                    <Lock size={14} /> Read-only for non-admin roles
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <form onSubmit={handleSubmit} className="bg-white rounded-[1.5rem] p-6 md:p-8 border border-slate-200 shadow-sm space-y-8">
                                <div className="flex items-start justify-between gap-6 flex-wrap">
                                    <div>
                                        <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Edit Company Details</h3>
                                        <p className="text-sm font-medium text-slate-400">Keep the company profile accurate for your team.</p>
                                    </div>
                                    {!canEdit && (
                                        <div className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold uppercase tracking-widest border border-amber-100">
                                            View Only
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field label="Company Name" icon={Building2} value={form.name} onChange={(value) => handleChange('name', value)} disabled={!canEdit} required />
                                    <Field label="Industry" icon={Layers3} value={form.industry} onChange={(value) => handleChange('industry', value)} disabled={!canEdit} />
                                    <Field label="Website" icon={Globe} value={form.website} onChange={(value) => handleChange('website', value)} disabled={!canEdit} />
                                    <Field label="Location" icon={MapPin} value={form.location} onChange={(value) => handleChange('location', value)} disabled={!canEdit} />
                                    <Field label="Team Size" icon={Users} value={form.employee_count_range || (!canEdit ? visibleTeamSize : '')} onChange={(value) => handleChange('employee_count_range', value)} disabled={!canEdit} placeholder="11-50" />
                                    <Field label="Contact Email" icon={Mail} value={form.contact_email || (!canEdit ? visibleContactEmail : '')} onChange={(value) => handleChange('contact_email', value)} disabled={!canEdit} />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">Company Description</label>
                                    <textarea
                                        className="w-full min-h-[180px] bg-white/60 border border-slate-200 rounded-2xl py-4 px-5 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium"
                                        value={form.description}
                                        onChange={(event) => handleChange('description', event.target.value)}
                                        disabled={!canEdit}
                                        placeholder="Describe your company, mission, team culture, or hiring focus..."
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={!canEdit || isSaving || isLoading}
                                        className="btn btn-primary px-8 py-3 shadow-sm disabled:opacity-60"
                                    >
                                        {isSaving ? 'Saving...' : (
                                            <>
                                                <Save size={18} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
};

const SettingSummary = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-white/60 border border-slate-100 px-4 py-3">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Icon size={18} />
        </div>
        <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
            <div className="text-sm font-semibold text-slate-700">{value || 'Not set'}</div>
        </div>
    </div>
);

const Field = ({ label, icon: Icon, value, onChange, disabled, required = false, placeholder }) => (
    <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 ml-1">{label}</label>
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <Icon size={18} />
            </div>
            <input
                type="text"
                className="w-full bg-white/60 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium disabled:bg-slate-100/70 disabled:text-slate-400"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                required={required}
                placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            />
        </div>
    </div>
);

export default Settings;


