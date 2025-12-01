import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { Bank } from '../types';
import { Landmark, Plus, Trash2, Pencil, Check, X, Search } from 'lucide-react';

export const BankManager: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);

  useEffect(() => {
    db.getBanks().then(setBanks);
  }, []);

  const [newBank, setNewBank] = useState({ name: '', sortCode: '' });
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', sortCode: '' });

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank.name || !newBank.sortCode) return;
    const added = await db.addBank(newBank);
    setBanks([...banks, added]);
    setNewBank({ name: '', sortCode: '' });
  };

  const startEdit = (bank: Bank) => {
    setEditingId(bank.id);
    setEditForm({ name: bank.name, sortCode: bank.sortCode });
  };

  const handleUpdate = async () => {
      if (editingId && editForm.name && editForm.sortCode) {
          await db.updateBank(editingId, editForm);
          setBanks(banks.map(b => b.id === editingId ? { ...b, ...editForm } : b));
          setEditingId(null);
      }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this bank?')) {
      await db.deleteBank(id);
      setBanks(banks.filter(b => b.id !== id));
    }
  };

  const filteredBanks = useMemo(() => {
    return banks.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [banks, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Landmark className="text-teal-600" /> Bank Management
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Bank</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input 
                required 
                type="text" 
                className="w-full border rounded-lg p-2"
                placeholder="e.g. Chase Bank"
                value={newBank.name}
                onChange={e => setNewBank({ ...newBank, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Code</label>
              <input 
                required 
                type="text" 
                className="w-full border rounded-lg p-2"
                placeholder="e.g. 00-11-22"
                value={newBank.sortCode}
                onChange={e => setNewBank({ ...newBank, sortCode: e.target.value })}
              />
            </div>
            <button type="submit" className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700">
              Add Bank
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-gray-800">Registered Banks</h3>
             <div className="relative w-40">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  className="w-full border rounded-md pl-7 pr-2 py-1 text-sm outline-none focus:border-teal-500"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
           </div>

          <ul className="divide-y">
            {filteredBanks.map(bank => (
              <li key={bank.id} className="py-3 flex justify-between items-center group min-h-[60px]">
                {editingId === bank.id ? (
                    <div className="flex-1 space-y-2 mr-2">
                        <input 
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={editForm.name}
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                        />
                        <input 
                            className="w-full border rounded px-2 py-1 text-xs"
                            value={editForm.sortCode}
                            onChange={e => setEditForm({...editForm, sortCode: e.target.value})}
                        />
                         <div className="flex gap-2">
                            <button onClick={handleUpdate} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Cancel</button>
                         </div>
                    </div>
                ) : (
                    <div>
                        <p className="font-semibold text-gray-800">{bank.name}</p>
                        <p className="text-xs text-gray-500">Sort Code: {bank.sortCode}</p>
                    </div>
                )}
                
                {!editingId && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => startEdit(bank)}
                            className="text-blue-400 hover:text-blue-600"
                        >
                            <Pencil size={18} />
                        </button>
                        <button 
                            onClick={() => handleDelete(bank.id)}
                            className="text-red-400 hover:text-red-600"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}
              </li>
            ))}
            {filteredBanks.length === 0 && <p className="text-gray-400 text-center py-4">No matching banks.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};