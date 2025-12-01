import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { Payroll, Employee, Deduction } from '../types';
import { Banknote, Plus, Trash2, Search, X, Pencil, Calendar } from 'lucide-react';

export const PayrollManager: React.FC = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
        setPayrolls(await db.getPayroll());
        setEmployees(await db.getEmployees());
        setDeductions(await db.getDeductions());
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
    deductionId: '',
    amountPayable: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    const ded = deductions.find(d => d.id === formData.deductionId);
    
    // Calculate payable if possible
    let payable = 0;
    if (emp) {
        payable = emp.salary;
        if (ded) payable -= ded.amount;
    }
    
    setFormData(prev => ({ ...prev, employeeId: empId, amountPayable: payable }));
  };

  const handleDeductionChange = (dedId: string) => {
    const emp = employees.find(e => e.id === formData.employeeId);
    const ded = deductions.find(d => d.id === dedId);

    let payable = formData.amountPayable;
    if (emp) {
        payable = emp.salary;
        if (ded) payable -= ded.amount;
    }
    // If clearing deduction
    if (!ded && emp) payable = emp.salary;

    setFormData(prev => ({ ...prev, deductionId: dedId, amountPayable: payable }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        await db.updatePayroll(editingId, formData);
        setPayrolls(payrolls.map(p => p.id === editingId ? { ...p, ...formData } : p));
    } else {
        const added = await db.addPayroll(formData);
        setPayrolls([added, ...payrolls]); // Newest first
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
      setFormData({
        employeeId: '', deductionId: '', amountPayable: 0, 
        date: new Date().toISOString().split('T')[0]
      });
      setEditingId(null);
  };

  const handleEdit = (pay: Payroll) => {
      setFormData({
          employeeId: pay.employeeId,
          deductionId: pay.deductionId,
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

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';
  const getDeductionDesc = (id: string) => deductions.find(d => d.id === id)?.description || 'None';

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
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <Plus size={20} /> New Payment
        </button>
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
              <th className="p-4 font-semibold text-gray-600">Deduction</th>
              <th className="p-4 font-semibold text-gray-600">Amount Payable</th>
              <th className="p-4 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPayrolls.map(pay => (
              <tr key={pay.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-800">{pay.date}</td>
                <td className="p-4 text-gray-800 font-medium">{getEmployeeName(pay.employeeId)}</td>
                <td className="p-4 text-gray-600">{getDeductionDesc(pay.deductionId)}</td>
                <td className="p-4 text-green-600 font-bold">${pay.amountPayable.toLocaleString()}</td>
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input required type="date" className="w-full border rounded-lg p-2"
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select required className="w-full border rounded-lg p-2"
                  value={formData.employeeId} onChange={e => handleEmployeeChange(e.target.value)}>
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} (${e.salary})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deduction</label>
                <select className="w-full border rounded-lg p-2"
                  value={formData.deductionId} onChange={e => handleDeductionChange(e.target.value)}>
                  <option value="">None</option>
                  {deductions.map(d => <option key={d.id} value={d.id}>{d.description} (-${d.amount})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Payable</label>
                <input required type="number" readOnly className="w-full border rounded-lg p-2 bg-gray-100"
                  value={formData.amountPayable} />
                <p className="text-xs text-gray-500 mt-1">Calculated as Salary - Deduction</p>
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