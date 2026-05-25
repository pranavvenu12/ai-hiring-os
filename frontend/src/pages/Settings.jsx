import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Globe, Mail, MapPin, Layers3, Users, Lock, ShieldCheck, Save } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
    const [form, setForm] = useState(emptyForm);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const canEdit = ['admin', 'hr'].includes(user?.role?.toLowerCase?.() || '');

    useEffect(() => {
        document.title = 'AI Hiring OS - Settings';
        if (user?.company_id) {
            fetchCompany();
        }
    }, [user]);

    const fetchCompany = async () => {
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
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

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
            window.alert('Company details saved.');
        } catch (error) {
            window.alert(error.detail || 'Failed to save company details');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex bg-slate-50 min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] p-6 md:p-10">
                <Topbar title="Company Settings" />

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-morphism rounded-[2.5rem] p-8 border border-white/50 shadow-2xl shadow-slate-200/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                    <Building2 size={22} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">{company?.name || 'Your Company'}</h2>
                                    <p className="text-sm text-slate-400 font-medium">Managed by {user?.role?.toUpperCase?.() || 'USER'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <SettingSummary icon={Layers3} label="Industry" value={company?.industry} />
                                <SettingSummary icon={Globe} label="Website" value={company?.website} />
                                <SettingSummary icon={MapPin} label="Location" value={company?.location} />
                                <SettingSummary icon={Users} label="Team Size" value={company?.employee_count_range} />
                                <SettingSummary icon={Mail} label="Contact Email" value={company?.contact_email} />
                            </div>
                        </div>

                        <div className="glass-morphism rounded-[2.5rem] p-8 border border-white/50 shadow-2xl shadow-slate-200/50">
                            <div className="flex items-center gap-3 mb-4">
                                <ShieldCheck className="text-indigo-600" size={20} />
                                <h3 className="text-lg font-black text-slate-900">Account Security</h3>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Auth is handled by Supabase, and company edits are restricted to HR/Admin roles within the authenticated tenant.
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <Lock size={14} /> Read-only for non-admin roles
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="glass-morphism rounded-[2.5rem] p-8 md:p-10 border border-white/50 shadow-2xl shadow-slate-200/50 space-y-8">
                            <div className="flex items-start justify-between gap-6 flex-wrap">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Edit Company Details</h3>
                                    <p className="text-sm font-medium text-slate-400">Keep the company profile accurate for your team.</p>
                                </div>
                                {!canEdit && (
                                    <div className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-widest border border-amber-100">
                                        View Only
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field label="Company Name" icon={Building2} value={form.name} onChange={(value) => handleChange('name', value)} disabled={!canEdit} required />
                                <Field label="Industry" icon={Layers3} value={form.industry} onChange={(value) => handleChange('industry', value)} disabled={!canEdit} />
                                <Field label="Website" icon={Globe} value={form.website} onChange={(value) => handleChange('website', value)} disabled={!canEdit} />
                                <Field label="Location" icon={MapPin} value={form.location} onChange={(value) => handleChange('location', value)} disabled={!canEdit} />
                                <Field label="Team Size" icon={Users} value={form.employee_count_range} onChange={(value) => handleChange('employee_count_range', value)} disabled={!canEdit} placeholder="11-50" />
                                <Field label="Contact Email" icon={Mail} value={form.contact_email} onChange={(value) => handleChange('contact_email', value)} disabled={!canEdit} />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Company Description</label>
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
                                    className="btn btn-primary px-8 py-3 shadow-xl shadow-indigo-600/20 disabled:opacity-60"
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
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</div>
            <div className="text-sm font-black text-slate-700">{value || 'Not set'}</div>
        </div>
    </div>
);

const Field = ({ label, icon: Icon, value, onChange, disabled, required = false, placeholder }) => (
    <div className="space-y-3">
        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
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
