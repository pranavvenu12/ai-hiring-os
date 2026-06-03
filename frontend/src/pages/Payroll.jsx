import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeDollarSign, BarChart3, CheckCircle2, Download, FileText, Loader2, Receipt, Sparkles, Wallet } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useRealtime } from '../hooks/useRealtime';

const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const currentDate = new Date();

const Payroll = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const isEmployee = user?.role === 'employee';
    const canManage = ['admin', 'hr'].includes(user?.role);
    const canReadCompany = ['admin', 'hr', 'manager'].includes(user?.role);

    const [records, setRecords] = useState([]);
    const [allRecords, setAllRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());
    const [defaultSalary, setDefaultSalary] = useState(60000);
    const [defaultAllowances, setDefaultAllowances] = useState(8000);
    const [defaultBonuses, setDefaultBonuses] = useState(0);
    const [defaultDeductions, setDefaultDeductions] = useState(0);
    // Salary modal state (replaces browser prompt)
    const [salaryModalOpen, setSalaryModalOpen] = useState(false);
    const [salaryInput, setSalaryInput] = useState('');
    const [salaryTarget, setSalaryTarget] = useState(null);

    const fetchPayroll = useCallback(async () => {
        setLoading(true);
        try {
            if (isEmployee) {
                const data = await api.get('/payroll/me');
                setRecords(data.records || []);
                setSummary(data.summary || {});
                setEmployees([]);
            } else if (canReadCompany) {
                const [payrollData, allPayrollData, employeeData] = await Promise.all([
                    api.get(`/payroll?month=${month}&year=${year}&limit=500`),
                    api.get('/payroll?limit=500'),
                    api.get('/employees?limit=200').catch(() => ({ employees: [] })),
                ]);
                setRecords(payrollData.records || []);
                setAllRecords(allPayrollData.records || []);
                setSummary(payrollData.summary || {});
                setEmployees(employeeData.employees || []);
            }
        } catch (error) {
            toast.error(error?.detail || 'Payroll data could not be loaded.');
        } finally {
            setLoading(false);
        }
    }, [canReadCompany, isEmployee, month, toast, year]);

    useEffect(() => {
        document.title = 'AI Hiring OS - Payroll';
        fetchPayroll();
    }, [fetchPayroll]);

    const handleRealtimeEvent = useCallback((event) => {
        if (event.type === 'payroll.generated' || event.type === 'payroll.status_updated') {
            fetchPayroll();
        }
    }, [fetchPayroll]);

    useRealtime(handleRealtimeEvent, canReadCompany || isEmployee);

    const recordsByEmployee = useMemo(() => {
        const map = new Map();
        records.forEach((record) => map.set(record.employee_id, record));
        return map;
    }, [records]);

    const salaryDistribution = useMemo(() => {
        const buckets = [
            { label: '< 50k', count: 0 },
            { label: '50k-1L', count: 0 },
            { label: '1L+', count: 0 },
        ];
        records.forEach((record) => {
            if (record.net_salary < 50000) buckets[0].count += 1;
            else if (record.net_salary < 100000) buckets[1].count += 1;
            else buckets[2].count += 1;
        });
        return buckets;
    }, [records]);

    const monthlyTrend = useMemo(() => {
        const trend = {};
        allRecords.forEach((record) => {
            const key = `${monthNames[record.month - 1]?.slice(0, 3)} ${record.year}`;
            trend[key] = (trend[key] || 0) + Number(record.net_salary || 0);
        });
        return Object.entries(trend).map(([label, value]) => ({ label, value }));
    }, [allRecords]);

    const generateForEmployee = async (employeeId, fallbackSalary = defaultSalary) => {
        // Open the project-styled salary modal instead of browser prompt
        setSalaryTarget(employeeId);
        setSalaryInput(String(fallbackSalary));
        setSalaryModalOpen(true);
    };

    const generateAll = async () => {
        setActionLoading(true);
        try {
            await api.post('/payroll/generate-all', {
                month,
                year,
                default_base_salary: Number(defaultSalary || 0),
                employee_salaries: {},
                default_allowances: Number(defaultAllowances || 0),
                default_bonuses: Number(defaultBonuses || 0),
                default_deductions: Number(defaultDeductions || 0),
            });
            toast.success('Company payroll generated.');
            await fetchPayroll();
        } catch (error) {
            toast.error(error?.detail || 'Bulk payroll generation failed.');
        } finally {
            setActionLoading(false);
        }
    };

    const confirmSalaryAndGenerate = async () => {
        const baseSalary = Number(salaryInput);
        if (Number.isNaN(baseSalary) || baseSalary < 0) {
            toast.error('Enter a valid salary amount.');
            return;
        }

        setSalaryModalOpen(false);
        setActionLoading(true);
        try {
            await api.post('/payroll/generate', {
                employee_id: salaryTarget,
                month,
                year,
                base_salary: baseSalary,
                allowances: Number(defaultAllowances || 0),
                bonuses: Number(defaultBonuses || 0),
                deductions: Number(defaultDeductions || 0),
            });
            toast.success('Payroll generated.');
            await fetchPayroll();
        } catch (error) {
            toast.error(error?.detail || 'Payroll generation failed.');
        } finally {
            setActionLoading(false);
            setSalaryTarget(null);
            setSalaryInput('');
        }
    };

    const cancelSalaryModal = () => {
        setSalaryModalOpen(false);
        setSalaryTarget(null);
        setSalaryInput('');
    };

    const updateStatus = async (record, action) => {
        setActionLoading(true);
        try {
            await api.put(`/payroll/${record.id}/${action}`);
            toast.success(action === 'approve' ? 'Payroll approved.' : 'Payroll marked paid.');
            await fetchPayroll();
        } catch (error) {
            toast.error(error?.detail || 'Payroll status update failed.');
        } finally {
            setActionLoading(false);
        }
    };

    const openPayslip = (record) => {
        setSelectedRecord(record);
    };

    const printPayslip = (record) => {
        const html = `
            <html>
                <head>
                    <title>Payslip - ${record.employee_name || 'Employee'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; color: #111827; padding: 32px; }
                        .sheet { max-width: 760px; margin: auto; border: 1px solid #e5e7eb; border-radius: 20px; padding: 32px; }
                        .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; }
                        h1 { margin: 0; font-size: 28px; }
                        .muted { color: #64748b; font-size: 13px; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
                        .box { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; }
                        .label { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; }
                        .value { font-size: 18px; font-weight: 700; margin-top: 6px; }
                        .net { background: #111827; color: white; }
                        .summary { margin-top: 24px; color: #475569; line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <div class="sheet">
                        <div class="top">
                            <div>
                                <h1>${record.company_name || 'AI Hiring OS'}</h1>
                                <div class="muted">Payroll payslip for ${monthNames[record.month - 1]} ${record.year}</div>
                            </div>
                            <div class="muted">Status: ${record.status.toUpperCase()}</div>
                        </div>
                        <div class="grid">
                            ${payslipBox('Employee', record.employee_name || '-')}
                            ${payslipBox('Department', record.department || 'Unassigned')}
                            ${payslipBox('Base Salary', currency.format(record.base_salary))}
                            ${payslipBox('Gross Salary', currency.format(record.gross_salary))}
                            ${payslipBox('Present / Half / Absent', `${record.present_days} / ${record.half_days} / ${record.absent_days}`)}
                            ${payslipBox('Deductions', currency.format(record.deductions))}
                            ${payslipBox('Net Salary', currency.format(record.net_salary), 'net')}
                            ${payslipBox('Working Days', record.working_days)}
                        </div>
                        <div class="summary">${record.ai_summary || 'Payroll was calculated from attendance records.'}</div>
                    </div>
                    <script>window.onload = () => window.print();</script>
                </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
        }
    };

    const emptyCompanyRows = employees.filter((employee) => !recordsByEmployee.has(employee.id));

    return (
        <div className="flex bg-[#f8fafc] min-h-screen font-inter overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 min-w-0 ml-0 lg:ml-[280px] px-4 py-6 md:p-10 overflow-x-hidden">
                <Topbar title={isEmployee ? 'My Payroll' : 'Payroll Management'} />

                {loading ? (
                    <div className="h-[50vh] flex items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin mr-2" /> Loading payroll...
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                            <MetricCard icon={Wallet} label="Total Payroll Cost" value={currency.format(summary.total_payroll_cost || 0)} />
                            <MetricCard icon={CheckCircle2} label="Employees Paid" value={summary.employees_paid || 0} />
                            <MetricCard icon={Receipt} label="Pending Payroll" value={summary.pending_payroll || 0} />
                            <MetricCard icon={FileText} label="Approved Payroll" value={summary.approved_payroll || 0} />
                            <MetricCard icon={BadgeDollarSign} label="Average Salary" value={currency.format(summary.average_salary || 0)} />
                        </div>

                        {canManage && (
                            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-5 flex flex-col lg:flex-row gap-4 lg:items-end">
                                <Field label="Month">
                                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field py-3">
                                        {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Year">
                                    <input value={year} onChange={(e) => setYear(Number(e.target.value))} type="number" className="input-field py-3" />
                                </Field>
                                <Field label="Default Base Salary">
                                    <input value={defaultSalary} onChange={(e) => setDefaultSalary(Number(e.target.value))} type="number" className="input-field py-3" />
                                </Field>
                                <Field label="Allowances">
                                    <input value={defaultAllowances} onChange={(e) => setDefaultAllowances(Number(e.target.value))} type="number" className="input-field py-3" />
                                </Field>
                                <Field label="Bonuses">
                                    <input value={defaultBonuses} onChange={(e) => setDefaultBonuses(Number(e.target.value))} type="number" className="input-field py-3" />
                                </Field>
                                <Field label="Manual Deductions">
                                    <input value={defaultDeductions} onChange={(e) => setDefaultDeductions(Number(e.target.value))} type="number" className="input-field py-3" />
                                </Field>
                                <button disabled={actionLoading} onClick={generateAll} className="btn btn-primary justify-center py-3.5 px-6 rounded-2xl">
                                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                    Generate Company Payroll
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 min-w-0">
                            <section className="xl:col-span-2 bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden min-w-0">
                                <div className="p-6 border-b border-slate-100">
                                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{isEmployee ? 'Payslip History' : 'Payroll Register'}</h2>
                                    <p className="text-sm font-medium text-slate-500 mt-1">{summary.ai_summary || 'Attendance-based payroll records for the selected period.'}</p>
                                </div>
                                <div className="overflow-x-auto w-full">
                                    <table className="min-w-[900px] w-full text-left">
                                        <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4">Employee</th>
                                                <th className="px-6 py-4">Department</th>
                                                <th className="px-6 py-4">Components</th>
                                                <th className="px-6 py-4">Present</th>
                                                <th className="px-6 py-4">Absent</th>
                                                <th className="px-6 py-4">Deductions</th>
                                                <th className="px-6 py-4">Net</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {records.map((record) => (
                                                <tr key={record.id} className="text-sm">
                                                    <td className="px-6 py-5 font-semibold text-slate-900">{record.employee_name || 'Employee'}</td>
                                                    <td className="px-6 py-5 text-slate-500">{record.department || 'Unassigned'}</td>
                                                    <td className="px-6 py-5">
                                                        <PayrollBreakdownMini record={record} />
                                                    </td>
                                                    <td className="px-6 py-5">{record.present_days}</td>
                                                    <td className="px-6 py-5">{record.absent_days}</td>
                                                    <td className="px-6 py-5 text-rose-600 font-semibold">{currency.format(record.deductions)}</td>
                                                    <td className="px-6 py-5 font-semibold text-slate-950">{currency.format(record.net_salary)}</td>
                                                    <td className="px-6 py-5"><StatusBadge status={record.status} /></td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-wrap gap-2">
                                                            <button onClick={() => openPayslip(record)} className="btn btn-secondary text-xs px-3 py-2">View</button>
                                                            <button onClick={() => printPayslip(record)} className="btn btn-secondary text-xs px-3 py-2"><Download size={14} /> PDF</button>
                                                            {canManage && record.status === 'generated' && (
                                                                <button onClick={() => updateStatus(record, 'approve')} className="btn btn-primary text-xs px-3 py-2">Approve</button>
                                                            )}
                                                            {canManage && record.status === 'approved' && (
                                                                <button onClick={() => updateStatus(record, 'mark-paid')} className="btn btn-primary text-xs px-3 py-2">Mark Paid</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {records.length === 0 && (
                                                <tr>
                                                    <td colSpan="9" className="px-6 py-16 text-center text-slate-400 font-semibold">
                                                        No payroll records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <aside className="space-y-6">
                                <AnalyticsCard title="Salary Distribution" data={salaryDistribution} />
                                <AnalyticsCard title="Department Cost" data={Object.entries(summary.department_costs || {}).map(([label, value]) => ({ label, value }))} money />
                                <AnalyticsCard title="Monthly Payroll Trend" data={monthlyTrend} money />
                            </aside>
                        </div>

                        {canManage && emptyCompanyRows.length > 0 && (
                            <section className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-slate-950 mb-4">Employees Without Payroll This Period</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {emptyCompanyRows.map((employee) => (
                                        <div key={employee.id} className="rounded-2xl border border-slate-100 p-4 flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="font-semibold text-slate-900 truncate">{employee.full_name}</div>
                                                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 truncate">{employee.department || 'Unassigned'}</div>
                                            </div>
                                            <button onClick={() => generateForEmployee(employee.id)} className="btn btn-primary text-xs px-3 py-2 shrink-0">Generate</button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {selectedRecord && (
                    <PayslipModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onPrint={() => printPayslip(selectedRecord)} />
                )}
                {salaryModalOpen && (
                    <SalaryModal
                        open={salaryModalOpen}
                        initialValue={salaryInput}
                        onChange={(v) => setSalaryInput(v)}
                        onConfirm={confirmSalaryAndGenerate}
                        onCancel={cancelSalaryModal}
                        employeeName={employees.find((e) => e.id === salaryTarget)?.full_name}
                    />
                )}
            </main>
        </div>
    );
};

    // Salary modal state and handlers
    // (Placed after the component for simplicity; uses the same styles as PayslipModal)


const payslipBox = (label, value, extra = '') => `
    <div class="box ${extra}">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
    </div>
`;

const MetricCard = ({ icon: Icon, label, value }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-5">
        <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 mb-5">
            <Icon size={21} />
        </div>
        <div className="text-2xl font-semibold tracking-tight text-slate-950 break-words">{value}</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mt-1">{label}</div>
    </motion.div>
);

const Field = ({ label, children }) => (
    <label className="flex-1 min-w-[180px]">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</span>
        {children}
    </label>
);

const StatusBadge = ({ status }) => {
    const styles = {
        generated: 'bg-amber-50 text-amber-700 border-amber-100',
        approved: 'bg-blue-50 text-blue-700 border-blue-100',
        paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        draft: 'bg-slate-50 text-slate-600 border-slate-100',
    };
    return <span className={`inline-flex px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${styles[status] || styles.draft}`}>{status}</span>;
};

const PayrollBreakdownMini = ({ record }) => (
    <div className="space-y-1 text-xs">
        <div className="font-semibold text-slate-900">{currency.format(record.basic_salary ?? record.base_salary)}</div>
        <div className="text-slate-400">
            + {currency.format(record.allowances || 0)} allowances, + {currency.format(record.bonuses || 0)} bonus
        </div>
        <div className="text-rose-500">
            - {currency.format(record.attendance_deductions || 0)} attendance, - {currency.format(record.manual_deductions || 0)} manual
        </div>
    </div>
);

const AnalyticsCard = ({ title, data, money = false }) => {
    const max = Math.max(...data.map((item) => Number(item.value || item.count || 0)), 1);
    return (
        <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-950 mb-5 flex items-center gap-2">
                <BarChart3 size={18} className="text-slate-500" /> {title}
            </h3>
            <div className="space-y-4">
                {data.length === 0 && <div className="text-sm font-medium text-slate-400">No data yet.</div>}
                {data.map((item) => {
                    const value = Number(item.value ?? item.count ?? 0);
                    return (
                        <div key={item.label}>
                            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                                <span>{item.label}</span>
                                <span>{money ? currency.format(value) : value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-slate-950 rounded-full" style={{ width: `${Math.max((value / max) * 100, value ? 8 : 0)}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const PayslipModal = ({ record, onClose, onPrint }) => (
    <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-950">Payslip</h2>
                    <p className="text-sm font-medium text-slate-500">{monthNames[record.month - 1]} {record.year}</p>
                </div>
                <button onClick={onClose} className="btn btn-secondary px-4 py-2">Close</button>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Detail label="Company" value={record.company_name || 'AI Hiring OS'} />
                    <Detail label="Employee" value={record.employee_name || '-'} />
                    <Detail label="Department" value={record.department || 'Unassigned'} />
                    <Detail label="Status" value={record.status} />
                    <Detail label="Basic Salary" value={currency.format(record.basic_salary ?? record.base_salary)} />
                    <Detail label="Allowances" value={currency.format(record.allowances || 0)} />
                    <Detail label="Bonuses" value={currency.format(record.bonuses || 0)} />
                    <Detail label="Attendance Deductions" value={currency.format(record.attendance_deductions || 0)} />
                    <Detail label="Other Deductions" value={currency.format(record.manual_deductions || 0)} />
                    <Detail label="Gross Salary" value={currency.format(record.gross_salary)} />
                    <Detail label="Attendance" value={`${record.present_days} present, ${record.half_days} half, ${record.absent_days} absent`} />
                    <Detail label="Deductions" value={currency.format(record.deductions)} />
                    <Detail label="Net Salary" value={currency.format(record.net_salary)} strong />
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">AI Payroll Insight</div>
                    <p className="text-sm font-medium leading-relaxed text-slate-600">{record.ai_summary || 'Payroll was calculated from attendance records.'}</p>
                </div>
                <button onClick={onPrint} className="btn btn-primary w-full justify-center py-3.5"><Download size={18} /> Download PDF</button>
            </div>
        </div>
    </div>
);

const Detail = ({ label, value, strong = false }) => (
    <div className={`rounded-2xl border p-4 ${strong ? 'bg-slate-950 text-white border-slate-950' : 'bg-white border-slate-100'}`}>
        <div className={`text-[10px] font-semibold uppercase tracking-[0.2em] mb-1 ${strong ? 'text-slate-300' : 'text-slate-400'}`}>{label}</div>
        <div className="text-base font-semibold break-words">{value}</div>
    </div>
);

const SalaryModal = ({ open, initialValue, onChange, onConfirm, onCancel, employeeName }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[110] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[1.25rem] border border-slate-200 shadow-2xl w-full max-w-md p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">Generate Payroll</h3>
                    <p className="text-sm text-slate-500">Enter monthly base salary for {employeeName || 'the employee'}.</p>
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-600 mb-2">Base salary (INR)</label>
                    <input autoFocus value={initialValue} onChange={(e) => onChange(e.target.value)} type="number" className="form-control" />
                </div>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="btn btn-secondary px-4 py-2">Cancel</button>
                    <button onClick={onConfirm} className="btn btn-primary px-4 py-2">Generate</button>
                </div>
            </div>
        </div>
    );
};

export default Payroll;
