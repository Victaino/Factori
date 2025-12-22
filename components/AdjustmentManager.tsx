
import React, { useState, useEffect, useMemo } from 'react';
import { db, ADJUSTMENT_SQL } from '../services/db';
import { Adjustment, Employee } from '../types';
import { Plus, Trash2, Pencil, Search, X, Calendar, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Terminal, Copy } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const AdjustmentManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dbError, setDbError] = useState<{message: string, sql?: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [adj, emp] = await Promise.all([
                db.getAdjustments(),
                db.getEmployees()
            ]);
            setAdjustments(adj);
            setEmployees(emp);
        } catch (err: any) {
            console.error("Failed to load adjustments", err);
            if (err.message.includes('relation "adjustments" does not exist') || err.message.includes('404')) {
                setDbError({
                    message: "The Adjustments table is missing from your database.",
                    sql: ADJUSTMENT_SQL
                });
            }
        }
    };
    fetchData();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'Overtime' as 'Overtime' | 'Bonus' | 'Deduction',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbError(null);
    try {
        if (editingId) {
            await db.updateAdjustment(editingId, formData);
            setAdjustments(adjustments.map(a => a.id === editingId ? { ...a, ...formData } : a));
        } else {
            const added = await db.addAdjustment(formData);
            setAdjustments([added, ...adjustments]);
        }
        setIsModalOpen(false);
        resetForm();
    } catch (err: any) {
        console.error("Save failed:", err);
        setDbError({ message: err.message || "Failed to save adjustment", sql: err.message.includes("relation") ? ADJUSTMENT_SQL : undefined });
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: 'Overtime',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setEditingId(null);
  };

  const handleEdit = (adj: Adjustment) => {
    setFormData({
      employeeId: adj.employeeId,
      type: adj.type,
      amount: adj.amount,
      date: adj.date,
      description: adj.description
    });
    setEditingId(adj.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this adjustment?')) {
      await db.deleteAdjustment(id);
      setAdjustments(adjustments.filter(a => a.id !== id));
    }
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter(a => {
      const empName = getEmployeeName(a.employeeId).toLowerCase();
      const desc = a.description.toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = empName.includes(term) || desc.includes(term);
      const matchesType = filterType === 'ALL' || a.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [adjustments, searchTerm, filterType, employees]);

  const getTypeColor = (type: string) => {
      switch (type) {
          case 'Overtime': return 'text-green-600 bg-green-50 border-green-200';
          case 'Bonus': return 'text-blue-600 bg-blue-50 border-blue-200';
          case 'Deduction': return 'text-red-600 bg-red-50 border-red-200';
          default: return 'text-gray-600 bg-gray-50 border-gray-200';
      }
  };

  const getTypeIcon = (type: string) => {
      if (type === 'Deduction') return <TrendingDown size={16} />;
      return <TrendingUp size={16} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="text-green-600" /> Salary Adjustments
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <Plus size={20} /> Add Adjustment
        </button>
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                    <h3 className="font-bold text-red-800">Configuration Required</h3>
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

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search employee or description..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-green-500 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="ALL">All Types</option>
          <option value="Overtime">Overtime</option>
          <option value="Bonus">Bonus</option>
          <option value="Deduction">Deduction</option>
        </select>

        {(searchTerm || filterType !== 'ALL') && (
          <button 
            onClick={() => { setSearchTerm(''); setFilterType('ALL'); }}
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
              <th className="p-4 font-semibold text-gray-600">Type</th>
              <th className="p-4 font-semibold text-gray-600">Description</th>
              <th className="p-4 font-semibold text-gray-600">Amount</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredAdjustments.map(adj => (
              <tr key={adj.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-800">{adj.date}</td>
                <td className="p-4 text-gray-800 font-medium">{getEmployeeName(adj.employeeId)}</td>
                <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 w-fit ${getTypeColor(adj.type)}`}>
                        {getTypeIcon(adj.type)} {adj.type}
                    </span>
                </td>
                <td className="p-4 text-gray-600">{adj.description}</td>
                <td className={`p-4 font-bold ${adj.type === 'Deduction' ? 'text-red-600' : 'text-green-600'}`}>
                    {adj.type === 'Deduction' ? '-' : '+'}{formatCurrency(adj.amount)}
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleEdit(adj)} className="text-blue-400 hover:text-blue-600">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(adj.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredAdjustments.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  {adjustments.length === 0 ? "No adjustments recorded." : "No records match your filters."}
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
              <h3 className="text-xl font-bold">{editingId ? 'Edit Adjustment' : 'New Adjustment'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input required type="date" className="w-full border rounded-lg p-2" 
                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select required className="w-full border rounded-lg p-2"
                        value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                        <option value="Overtime">Overtime</option>
                        <option value="Bonus">Bonus</option>
                        <option value="Deduction">Deduction</option>
                    </select>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select required className="w-full border rounded-lg p-2"
                    value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
                    <option value="">Select Employee</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input required type="text" className="w-full border rounded-lg p-2" 
                    placeholder="e.g. Weekend Shift, Project Bonus, Late Fine"
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input required type="number" min="0" step="0.01" className="w-full border rounded-lg p-2" 
                    value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
              </div>

              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 mt-2">
                {editingId ? 'Update Adjustment' : 'Save Adjustment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
