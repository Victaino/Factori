
import React, { useState, useMemo, useEffect } from 'react';
import { db, PAYROLL_FIELDS_SQL } from '../services/db';
import { Payroll, Employee, Adjustment, Bank, Attendance } from '../types';
import { Banknote, Plus, Trash2, Search, X, Pencil, Calendar, Download, AlertTriangle, Terminal, Copy, Clock } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const PayrollManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  
  // Error handling
  const [dbError, setDbError] = useState<{message: string, sql?: string} | null>(null);

  // Settings for calculation
  const WORKING_DAYS_PER_MONTH = 22;

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [pay, emp, adj, att, bnk] = await Promise.all([
                db.getPayroll(),
                db.getEmployees(),
                db.getAdjustments(),
                db.getAttendance(),
                db.getBanks()
            ]);
            setPayrolls(pay);
            setEmployees(emp);
            setAdjustments(adj);
            setAttendance(att);
            setBanks(bnk);
        } catch (err: any) {
            console.error("Fetch payroll error", err);
            // Check for missing columns in payroll table
            if (err.message && (err.message.includes('salary') || err.message.includes('attendanceDeduction') || err.message.includes('column'))) {
                setDbError({
                    message: "Database Update Required: Missing payroll columns (salary, additions, deductions, attendanceDeduction).",
                    sql: PAYROLL_FIELDS_SQL
                });
            }
        }
    };
    fetchData();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    salary: 0,
    additions: 0,
    deductions: 0,
    attendanceDeduction: 0,
    amountPayable: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const calculatePay = (empId: string, dateStr: string) => {
      const emp = employees.find(e => e.id === empId);
      if (!emp) return { salary: 0, additions: 0, deductions: 0, attendanceDeduction: 0, amountPayable: 0 };

      // Filter adjustments for the selected month/year
      const formDate = new Date(dateStr);
      const targetMonth = formDate.getMonth();
      const targetYear = formDate.getFullYear();

      const empAdjustments = adjustments.filter(a => {
          const adjDate = new Date(a.date);
          return a.employeeId === empId && 
                 adjDate.getMonth() === targetMonth && 
                 adjDate.getFullYear() === targetYear;
      });

      // Calculate Attendance Deduction
      // Count unique days present for this employee in this month
      const daysPresent = new Set(attendance.filter(a => {
          const attDate = new Date(a.date);
          return a.employeeId === empId &&
                 attDate.getMonth() === targetMonth &&
                 attDate.getFullYear() === targetYear;
      }).map(a => a.date)).size; // Use Set size for unique days

      const missedDays = Math.max(0, WORKING_DAYS_PER_MONTH - daysPresent);
      const dailyRate = emp.salary / WORKING_DAYS_PER_MONTH;
      const attDeduction = missedDays * dailyRate;

      const salary = emp.salary;
      const additions = empAdjustments
        .filter(a => a.type === 'Bonus' || a.type === 'Overtime')
        .reduce((sum, a) => sum + a.amount, 0);
      
      const deductions = empAdjustments
        .filter(a => a.type === 'Deduction')
        .reduce((sum, a) => sum + a.amount, 0);

      const amountPayable = Math.max(0, salary + additions - deductions - attDeduction);

      return { salary, additions, deductions, attendanceDeduction: attDeduction, amountPayable };
  };

  const updateCalculations = (empId: string, dateStr: string) => {
      const calcs = calculatePay(empId, dateStr);
      setFormData(prev => ({
          ...prev,
          employeeId: empId,
          date: dateStr,
          ...calcs
      }));
  };

  const handleEmployeeChange = (empId: string) => {
    updateCalculations(empId, formData.date);
  };

  const handleDateChange = (dateStr: string) => {
    updateCalculations(formData.employeeId, dateStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbError(null);
    try {
        if (editingId) {
            await db.updatePayroll(editingId, formData);
            setPayrolls(payrolls.map(p => p.id === editingId ? { ...p, ...formData } : p));
        } else {
            const added = await db.addPayroll(formData);
            setPayrolls([added, ...payrolls]);
        }
        setIsModalOpen(false);
        resetForm();
    } catch (err: any) {
        console.error("Save payroll failed", err);
        setDbError({
            message: err.message || "Failed to save record.",
            sql: (err.message.includes('salary') || err.message.includes('column')) ? PAYROLL_FIELDS_SQL : undefined
        });
    }
  };

  const resetForm = () => {
      setFormData({
        employeeId: '', salary: 0, additions: 0, deductions: 0, attendanceDeduction: 0, amountPayable: 0, 
        date: new Date().toISOString().split('T')[0]
      });
      setEditingId(null);
  };

  const handleEdit = (pay: Payroll) => {
      setFormData({
          employeeId: pay.employeeId,
          salary: pay.salary || 0,
          additions: pay.additions || 0,
          deductions: pay.deductions || 0,
          attendanceDeduction: pay.attendanceDeduction || 0,
          amountPayable: pay.amountPayable,
          date: pay.date
      });
      setEditingId(pay.id);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this payroll record?')) {
      await db.deletePayroll(id);
      setPayrolls(payrolls.filter(p => p.id !== id));
    }
  };

  const handleExportCsv = () => {
      const headers = ['Employee Name', 'Account Number', 'Sort Code', 'Amount Payable'];
      
      const rows = filteredPayrolls.map(pay => {
          const emp = employees.find(e => e.id === pay.employeeId);
          const bank = banks.find(b => b.id === emp?.bankId);
          
          const sortCode = bank?.sortCode ? `="${bank.sortCode}"` : '';
          const accountNo = emp?.bankAccountNo ? `="${emp.bankAccountNo}"` : '';

          return [
              `"${emp?.name || 'Unknown'}"`,
              accountNo,
              sortCode,
              pay.amountPayable.toFixed(2)
          ];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payroll_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter(p => {
      const empName = getEmployeeName(p.employeeId).toLowerCase();
      const matchesSearch = empName.includes(searchTerm.toLowerCase());
      const matchesDate = !filterDate || p.date === filterDate;
      return matchesSearch && matchesDate;
    });
  }, [payrolls, searchTerm, filterDate, employees]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Banknote className="text-green-600" /> Payroll
        </h2>
        <div className="flex gap-2">
            <button 
                onClick={handleExportCsv}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200"
            >
                <Download size={20} /> Export Excel
            </button>
            <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
            <Plus size={20} /> New Payment
            </button>
        </div>
      </div>

       {/* Filter Toolbar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search employee..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
            type="date" 
            className="border rounded-lg pl-10 pr-3 py-2 bg-white outline-none focus:border-green-500 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            />
        </div>

        {(searchTerm || filterDate) && (
          <button 
            onClick={clearFilters}
            className="text-gray-500 hover:text-red-500 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            <X size={16} /> Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Date</th>
              <th className="p-4 font-semibold text-gray-600">Employee</th>
              <th className="p-4 font-semibold text-gray-600">Base Salary</th>
              <th className="p-4 font-semibold text-gray-600">Net Payable</th>
              <th className="p-4 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPayrolls.map(pay => (
              <tr key={pay.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-800">{pay.date}</td>
                <td className="p-4 text-gray-800 font-medium">{getEmployeeName(pay.employeeId)}</td>
                <td className="p-4 text-gray-500">
                    {pay.salary ? formatCurrency(pay.salary) : '-'}
                </td>
                <td className="p-4 text-green-600 font-bold">
                    <div className="flex flex-col">
                        <span>{formatCurrency(pay.amountPayable)}</span>
                        <div className="text-[10px] text-gray-400 font-normal flex gap-1">
                            {pay.additions > 0 && <span>+{pay.additions}</span>}
                            {pay.deductions > 0 && <span className="text-red-300">-{pay.deductions}</span>}
                            {pay.attendanceDeduction > 0 && <span className="text-orange-300">-{Math.round(pay.attendanceDeduction)} (Abs)</span>}
                        </div>
                    </div>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleEdit(pay)} className="text-blue-400 hover:text-blue-600">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(pay.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredPayrolls.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  {payrolls.length === 0 ? "No payroll records found." : "No records match your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg">
             <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Payroll Record' : 'Process Payroll'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            {dbError && (
                <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h3 className="font-bold text-red-800">Database Update Required</h3>
                            <p className="text-sm text-red-700 mt-1">{dbError.message}</p>
                            
                            {dbError.sql && (
                                <div className="mt-3 bg-gray-900 rounded-lg p-3 overflow-hidden">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-400 flex items-center gap-1"><Terminal size={12}/> SQL Fix</span>
                                        <button 
                                        onClick={() => navigator.clipboard.writeText(dbError.sql!)}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Copy size={12} /> Copy
                                        </button>
                                    </div>
                                    <code className="text-xs font-mono text-green-400 block break-all">
                                        {dbError.sql}
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input required type="date" className="w-full border rounded-lg p-2"
                  value={formData.date} onChange={e => handleDateChange(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Attendance & Adjustments are calculated for this month.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select required className="w-full border rounded-lg p-2"
                  value={formData.employeeId} onChange={e => handleEmployeeChange(e.target.value)}>
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              {/* Breakdown Section */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 border text-sm">
                  <div className="flex justify-between text-gray-600">
                      <span>Base Salary:</span>
                      <span>{formatCurrency(formData.salary)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                      <span>+ Additions (Bonus/OT):</span>
                      <span>{formatCurrency(formData.additions)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                      <span>- Deductions (Misc):</span>
                      <span>{formatCurrency(formData.deductions)}</span>
                  </div>
                  
                  {formData.attendanceDeduction > 0 && (
                      <div className="flex justify-between text-orange-600">
                          <span className="flex items-center gap-1"><Clock size={12}/> - Attendance (Missed Days):</span>
                          <span>{formatCurrency(formData.attendanceDeduction)}</span>
                      </div>
                  )}

                  <div className="flex justify-between font-bold text-lg text-gray-800 border-t pt-2 mt-2">
                      <span>Net Payable:</span>
                      <span>{formatCurrency(formData.amountPayable)}</span>
                  </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg mt-4 hover:bg-green-700">
                {editingId ? 'Update Record' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
