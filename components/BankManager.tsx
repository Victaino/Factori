
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Bank } from '../types';
import { Landmark, Plus, Trash2, Pencil, Check, X, Search, ChevronDown } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

// Predefined list of banks mapped by currency symbol
const BANK_LISTS: Record<string, string[]> = {
  '₦': [
    'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank', 
    'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank', 
    'Guaranty Trust Bank (GTBank)', 'Heritage Bank', 'Jaiz Bank', 'Keystone Bank', 
    'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank', 'Standard Chartered Bank', 
    'Sterling Bank', 'SunTrust Bank', 'Taj Bank', 'Titan Trust Bank', 
    'Union Bank of Nigeria', 'United Bank for Africa (UBA)', 'Unity Bank', 
    'Wema Bank', 'Zenith Bank', 'Kuda Bank', 'Moniepoint', 'Opay', 'PalmPay'
  ],
  '$': [
    'JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup', 
    'U.S. Bancorp', 'Truist Financial', 'PNC Financial Services', 
    'Goldman Sachs', 'Capital One', 'TD Bank'
  ],
  '£': [
    'Barclays', 'HSBC', 'Lloyds Bank', 'NatWest', 'Royal Bank of Scotland (RBS)', 
    'Santander UK', 'Standard Chartered', 'Nationwide Building Society', 
    'Metro Bank', 'Monzo', 'Revolut', 'Starling Bank'
  ],
  '€': [
    'BNP Paribas', 'Crédit Agricole', 'Deutsche Bank', 'Banco Santander', 
    'Société Générale', 'Groupe BPCE', 'ING Group', 'Commerzbank'
  ],
  '₹': [
    'State Bank of India (SBI)', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank', 
    'Bank of Baroda', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank'
  ]
};

export const BankManager: React.FC = () => {
  const { currency } = useSettings();
  const [banks, setBanks] = useState<Bank[]>([]);

  useEffect(() => {
    db.getBanks().then(setBanks);
  }, []);

  const [newBank, setNewBank] = useState({ name: '', sortCode: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', sortCode: '' });

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank.name || !newBank.sortCode) return;
    const added = await db.addBank(newBank);
    setBanks([...banks, added]);
    setNewBank({ name: '', sortCode: '' });
    setShowSuggestions(false);
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

  // Autocomplete Logic
  const bankSuggestions = useMemo(() => {
      const list = BANK_LISTS[currency] || [];
      if (!newBank.name) return list;
      return list.filter(b => b.toLowerCase().includes(newBank.name.toLowerCase()));
  }, [currency, newBank.name]);

  const selectBank = (name: string) => {
      setNewBank(prev => ({ ...prev, name }));
      setShowSuggestions(false);
  };

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
            
            {/* Autocomplete Field */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <div className="relative">
                  <input 
                    required 
                    type="text" 
                    className="w-full border rounded-lg p-2 pr-8"
                    placeholder={`e.g. ${BANK_LISTS[currency]?.[0] || 'My Bank'}`}
                    value={newBank.name}
                    onChange={e => {
                        setNewBank({ ...newBank, name: e.target.value });
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <ChevronDown size={16} />
                  </div>
              </div>
              
              {/* Dropdown */}
              {showSuggestions && bankSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {bankSuggestions.map((bank) => (
                          <button
                              key={bank}
                              type="button"
                              onClick={() => selectBank(bank)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                          >
                              {bank}
                          </button>
                      ))}
                  </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Code / Routing Number</label>
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
