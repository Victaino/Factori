
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { Deduction } from '../types';
import { FileMinus, Trash2, Pencil, Search } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const DeductionManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [deductions, setDeductions] = useState<Deduction[]>([]);

  useEffect(() => {
    db.getDeductions().then(setDeductions);
  }, []);

  const [newDeduction, setNewDeduction] = useState({ description: '', amount: 0 });

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', amount: 0 });

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeduction.description || newDeduction.amount <= 0) return;
    const added = await db.addDeduction(newDeduction);
    setDeductions([...deductions, added]);
    setNewDeduction({ description: '', amount: 0 });
  };

  const startEdit = (ded: Deduction) => {
    setEditingId(ded.id);
    setEditForm({ description: ded.description, amount: ded.amount });
  };

  const handleUpdate = async () => {
      if (editingId && editForm.description && editForm.amount > 0) {
          await db.updateDeduction(editingId, editForm);
          setDeductions(deductions.map(d => d.id === editingId ? { ...d, ...editForm } : d));
          setEditingId(null);
      }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this deduction type?')) {
      await db.deleteDeduction(id);
      setDeductions(deductions.filter(d => d.id !== id));
    }
  };

  const filteredDeductions = useMemo(() => {
    return deductions.filter(d => d.description.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [deductions, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileMinus className="text-rose-600" /> Deductions
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Create Deduction Type</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input 
                required 
                type="text" 
                className="w-full border rounded-lg p-2"
                placeholder="e.g. Health Insurance"
                value={newDeduction.description}
                onChange={e => setNewDeduction({ ...newDeduction, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input 
                required 
                type="number"
                min="0"
                className="w-full border rounded-lg p-2"
                placeholder="0.00"
                value={newDeduction.amount}
                onChange={e => setNewDeduction({ ...newDeduction, amount: parseFloat(e.target.value) })}
              />
            </div>
            <button type="submit" className="w-full bg-rose-600 text-white py-2 rounded-lg hover:bg-rose-700">
              Save Deduction
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Active Deduction Types</h3>
            <div className="relative w-40">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  className="w-full border rounded-md pl-7 pr-2 py-1 text-sm outline-none focus:border-rose-500"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          
          <ul className="divide-y">
            {filteredDeductions.map(ded => (
              <li key={ded.id} className="py-3 flex justify-between items-center group min-h-[60px]">
                {editingId === ded.id ? (
                    <div className="flex-1 space-y-2 mr-2">
                        <input 
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.description}
                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                        />
                        <input 
                            type="number"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.amount}
                            onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                        />
                         <div className="flex gap-2">
                            <button onClick={handleUpdate} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Cancel</button>
                         </div>
                    </div>
                ) : (
                    <div>
                      <p className="font-semibold text-gray-800">{ded.description}</p>
                      <p className="text-sm text-gray-500 font-mono">{formatCurrency(ded.amount)}</p>
                    </div>
                )}

                {!editingId && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => startEdit(ded)}
                            className="text-blue-400 hover:text-blue-600"
                        >
                            <Pencil size={18} />
                        </button>
                        <button 
                        onClick={() => handleDelete(ded.id)}
                        className="text-red-400 hover:text-red-600"
                        >
                        <Trash2 size={18} />
                        </button>
                    </div>
                )}
              </li>
            ))}
            {filteredDeductions.length === 0 && <p className="text-gray-400 text-center py-4">No matching deductions.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};
