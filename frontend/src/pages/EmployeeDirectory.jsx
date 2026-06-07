import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Search, Plus, User, Mail, Phone, Building, Calendar, ArrowLeft, X, Briefcase, Filter } from 'lucide-react';
import { formatShortDate } from '../utils/date';

const EmployeeDirectory = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [departments, setDepartments] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [page, setPage] = useState(0);
    const { toast } = useToast();
    const limit = 20;

    const [newEmployee, setNewEmployee] = useState({
        full_name: '', email: '', phone: '', department: '', designation: '',
        manager_id: '', joining_date: '', employment_type: 'full_time',
    });

    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set('skip', page * limit);
            params.set('limit', limit);
            if (searchQuery) params.set('search', searchQuery);
            if (departmentFilter) params.set('department', departmentFilter);

            const data = await api.get(`/employees?${params.toString()}`);
            setEmployees(data.employees || []);
            setTotal(data.total || 0);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [departmentFilter, page, searchQuery]);

    const fetchDepartments = useCallback(async () => {
        try {
            const data = await api.get('/employees/departments');
            setDepartments(data.departments || []);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        document.title = 'AI Hiring OS - Employee Directory';
        fetchEmployees();
        fetchDepartments();
    }, [fetchDepartments, fetchEmployees]);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newEmployee,
                manager_id: newEmployee.manager_id || null,
                joining_date: newEmployee.joining_date || null,
            };
            await api.post('/employees', payload);
            setShowAddModal(false);
            setNewEmployee({ full_name: '', email: '', phone: '', department: '', designation: '', manager_id: '', joining_date: '', employment_type: 'full_time' });
            fetchEmployees();
            fetchDepartments();
            toast.success('Employee added successfully!');
        } catch (err) { toast.error(err.detail || 'Failed to add employee'); }
    };

    const isHROrAdmin = user && ['admin', 'hr'].includes(user.role.toLowerCase());
    const totalPages = Math.ceil(total / limit);
    const getManagerName = (managerId) => {
        if (!managerId) return 'Not assigned';
        return employees.find((employee) => employee.id === managerId)?.full_name || 'Assigned manager';
    };

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-[280px] px-4 py-6 md:p-10">
                <Topbar title="Employee Directory" />

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Employee Directory</h2>
                            <p className="text-sm font-medium text-slate-400">{total} employees in your organization</p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto flex-wrap">
                            <div className="relative group flex-1 md:flex-none md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input
                                    type="text" placeholder="Search employees..."
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium text-sm shadow-sm"
                                    value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select
                                    className="bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-8 outline-none focus:border-indigo-600 font-medium text-sm shadow-sm appearance-none cursor-pointer"
                                    value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(0); }}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            {isHROrAdmin && (
                                <button onClick={() => setShowAddModal(true)} className="btn btn-primary px-6 py-3 shadow-sm whitespace-nowrap">
                                    <Plus size={20} /> Add Employee
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Employee Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {employees.map((emp, i) => (
                            <motion.div
                                key={emp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => setSelectedEmployee(emp)}
                                className="bg-white rounded-[1.5rem] p-5 border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-300 cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                        {emp.full_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{emp.full_name}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{emp.designation || emp.employee_code}</div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : emp.status === 'inactive' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {emp.status}
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail size={14} className="text-slate-300" />
                                        <span className="text-slate-500 font-medium truncate">{emp.email}</span>
                                    </div>
                                    {emp.department && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <Building size={14} className="text-slate-300" />
                                            <span className="text-slate-500 font-medium">{emp.department}</span>
                                        </div>
                                    )}
                                    {emp.manager_id && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <User size={14} className="text-slate-300" />
                                            <span className="text-slate-500 font-medium truncate">Reports to {getManagerName(emp.manager_id)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Briefcase size={14} className="text-slate-300" />
                                        <span className="text-slate-500 font-medium capitalize">{emp.employment_type.replace('_', ' ')}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {employees.length === 0 && !loading && (
                        <div className="text-center py-24 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                                <User size={32} />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">No employees found</h4>
                            <p className="text-sm font-medium text-slate-400">
                                {searchQuery || departmentFilter ? 'Try adjusting your search or filters.' : 'Add your first employee to get started.'}
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-indigo-50 disabled:opacity-40 transition-all">Previous</button>
                            <span className="px-4 py-2 text-sm font-bold text-slate-500">Page {page + 1} of {totalPages}</span>
                            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-indigo-50 disabled:opacity-40 transition-all">Next</button>
                        </div>
                    )}
                </motion.div>
            </main>

            {/* Employee Profile Drawer */}
            <AnimatePresence>
                {selectedEmployee && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEmployee(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
                        <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 w-full max-w-[480px] h-screen bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] z-[101] overflow-y-auto">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedEmployee(null)} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h3 className="text-xl font-semibold text-slate-900">Employee Profile</h3>
                                </div>
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="text-center">
                                    <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-3xl font-semibold mx-auto mb-4 shadow-md shadow-slate-300/50 rotate-3">
                                        {selectedEmployee.full_name.charAt(0)}
                                    </div>
                                    <h4 className="text-2xl font-semibold text-slate-900">{selectedEmployee.full_name}</h4>
                                    <div className="text-sm font-bold text-indigo-600 mt-1">{selectedEmployee.designation || 'No role'}</div>
                                    <div className="inline-block px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-semibold uppercase tracking-widest mt-2">{selectedEmployee.employee_code}</div>
                                </div>
                                <div className="space-y-4">
                                    <ProfileField icon={Mail} label="Email" value={selectedEmployee.email} />
                                    <ProfileField icon={Phone} label="Phone" value={selectedEmployee.phone || 'Not provided'} />
                                    <ProfileField icon={Briefcase} label="Role" value={selectedEmployee.designation || 'Not assigned'} />
                                    <ProfileField icon={Building} label="Department" value={selectedEmployee.department || 'Not assigned'} />
                                    <ProfileField icon={User} label="Reporting Manager" value={getManagerName(selectedEmployee.manager_id)} />
                                    <ProfileField icon={Briefcase} label="Employment Type" value={selectedEmployee.employment_type?.replace('_', ' ')} />
                                    <ProfileField icon={Calendar} label="Date Joined" value={selectedEmployee.joining_date ? formatShortDate(selectedEmployee.joining_date) : 'Not set'} />
                                    <ProfileField icon={User} label="Status" value={selectedEmployee.status} />
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Add Employee Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 flex items-center justify-center z-[101] p-4">
                            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-semibold text-slate-900">Add New Employee</h3>
                                    <button onClick={() => setShowAddModal(false)} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400"><X size={20} /></button>
                                </div>
                                <form onSubmit={handleAddEmployee} className="space-y-4">
                                    <FormField label="Full Name" placeholder="Aarav Sharma" value={newEmployee.full_name} onChange={v => setNewEmployee({...newEmployee, full_name: v})} required />
                                    <FormField label="Email" type="email" placeholder="aarav.sharma@journeysync.com" value={newEmployee.email} onChange={v => setNewEmployee({...newEmployee, email: v})} required />
                                    <FormField label="Phone" placeholder="+91 98765 43210" value={newEmployee.phone} onChange={v => setNewEmployee({...newEmployee, phone: v})} />
                                    <FormField label="Role" placeholder="AI/ML Engineer" value={newEmployee.designation} onChange={v => setNewEmployee({...newEmployee, designation: v})} required />
                                    <FormField label="Department" placeholder="Engineering" value={newEmployee.department} onChange={v => setNewEmployee({...newEmployee, department: v})} required />
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Reporting Manager</label>
                                        <select value={newEmployee.manager_id} onChange={e => setNewEmployee({...newEmployee, manager_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-indigo-600">
                                            <option value="">No manager assigned</option>
                                            {employees.map((employee) => (
                                                <option key={employee.id} value={employee.id}>
                                                    {employee.full_name} {employee.designation ? `- ${employee.designation}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <FormField label="Date Joined" type="date" value={newEmployee.joining_date} onChange={v => setNewEmployee({...newEmployee, joining_date: v})} />
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">Employment Type</label>
                                        <select value={newEmployee.employment_type} onChange={e => setNewEmployee({...newEmployee, employment_type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-indigo-600">
                                            <option value="full_time">Full Time</option>
                                            <option value="part_time">Part Time</option>
                                            <option value="contract">Contract</option>
                                            <option value="intern">Intern</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full justify-center py-3 mt-4 font-bold shadow-sm">Add Employee</button>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const ProfileField = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all">
            <Icon size={18} />
        </div>
        <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</div>
            <div className="text-sm font-bold text-slate-700 capitalize">{value}</div>
        </div>
    </div>
);

const FormField = ({ label, value, onChange, type = 'text', placeholder = '', required = false }) => (
    <div>
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 block">{label}</label>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all"
        />
    </div>
);

export default EmployeeDirectory;


