
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { Tax } from '../types';
import { Percent, Plus, Trash2, Pencil, Search, X } from 'lucide-react';

export const TaxManager: React.FC = () => {
  const [taxes, setTaxes] = useState<Tax[]>([]);

  useEffect(() => {
    db.getTaxes().then(setTaxes);
  }, []);

  const [newTax, setNewTax] = useState({ name: '', rate: 0, description: '' });

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', rate: 0, description: '' });

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTax.name || newTax.rate < 0) return;
    const added = await db.addTax(newTax);
    setTaxes([...taxes, added]);
    setNewTax({ name: '', rate: 0, description: '' });
  };

  const startEdit = (tax: Tax) => {
    setEditingId(tax.id);
    setEditForm({ name: tax.name, rate: tax.rate, description: tax.description || '' });
  };

  const handleUpdate = async () => {
      if (editingId && editForm.name && editForm.rate >= 0) {
          await db.updateTax(editingId, editForm);
          setTaxes(taxes.map(t => t.id === editingId ? { ...t, ...editForm } : t));
          setEditingId(null);
      }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this tax rate?')) {
      await db.deleteTax(id);
      setTaxes(taxes.filter(t => t.id !== id));
    }
  };

  const filteredTaxes = useMemo(() => {
    return taxes.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [taxes, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Percent className="text-indigo-600" /> Tax Management
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Tax Rate</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Name</label>
              <input 
                required 
                type="text" 
                className="w-full border rounded-lg p-2"
                placeholder="e.g. VAT, GST"
                value={newTax.name}
                onChange={e => setNewTax({ ...newTax, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
              <input 
                required 
                type="number"
                step="0.01"
                min="0"
                className="w-full border rounded-lg p-2"
                placeholder="e.g. 7.5"
                value={newTax.rate}
                onChange={e => setNewTax({ ...newTax, rate: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <input 
                type="text" 
                className="w-full border rounded-lg p-2"
                placeholder="Additional info..."
                value={newTax.description}
                onChange={e => setNewTax({ ...newTax, description: e.target.value })}
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
              Add Tax
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-gray-800">Tax Rates</h3>
             <div className="relative w-40">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  className="w-full border rounded-md pl-7 pr-2 py-1 text-sm outline-none focus:border-indigo-500"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
           </div>

          <ul className="divide-y">
            {filteredTaxes.map(tax => (
              <li key={tax.id} className="py-3 flex justify-between items-center group min-h-[60px]">
                {editingId === tax.id ? (
                    <div className="flex-1 space-y-2 mr-2">
                        <div className="flex gap-2">
                             <input 
                                className="w-2/3 border rounded px-2 py-1 text-sm"
                                value={editForm.name}
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                                placeholder="Name"
                            />
                            <input 
                                type="number"
                                className="w-1/3 border rounded px-2 py-1 text-sm"
                                value={editForm.rate}
                                onChange={e => setEditForm({...editForm, rate: parseFloat(e.target.value)})}
                                placeholder="%"
                            />
                        </div>
                        <input 
                            className="w-full border rounded px-2 py-1 text-xs"
                            value={editForm.description}
                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                            placeholder="Description"
                        />
                         <div className="flex gap-2">
                            <button onClick={handleUpdate} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Cancel</button>
                         </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2">
                             <p className="font-semibold text-gray-800">{tax.name}</p>
                             <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">{tax.rate}%</span>
                        </div>
                        <p className="text-xs text-gray-500">{tax.description || 'No description'}</p>
                    </div>
                )}
                
                {!editingId && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => startEdit(tax)}
                            className="text-blue-400 hover:text-blue-600"
                        >
                            <Pencil size={18} />
                        </button>
                        <button 
                            onClick={() => handleDelete(tax.id)}
                            className="text-red-400 hover:text-red-600"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}
              </li>
            ))}
            {filteredTaxes.length === 0 && <p className="text-gray-400 text-center py-4">No taxes defined.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};
