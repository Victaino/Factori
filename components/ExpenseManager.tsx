import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Expense, Supplier } from '../types';
import { Plus, Trash2, Wallet, Pencil, Search, X, Calendar } from 'lucide-react';

export const ExpenseManager: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [formData, setFormData] = useState({
    supplierId: '',
    items: '',
    quantity: 0,
    price: 0,
    paid: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const refreshData = async () => {
    setExpenses(await db.getExpenses());
    setSuppliers(await db.getSuppliers());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = formData.quantity * formData.price;
    const balance = amount - formData.paid;
    
    if (editingId) {
        await db.updateExpense(editingId, { ...formData, amount, balance });
    } else {
        await db.addExpense({
            ...formData,
            amount,
            balance
        });
    }
    
    setIsModalOpen(false);
    refreshData();
    resetForm();
  };

  const resetForm = () => {
      setFormData({
        supplierId: '',
        items: '',
        quantity: 0,
        price: 0,
        paid: 0,
        date: new Date().toISOString().split('T')[0]
      });
      setEditingId(null);
  };

  const handleEdit = (expense: Expense) => {
      setFormData({
          supplierId: expense.supplierId,
          items: expense.items,
          quantity: expense.quantity,
          price: expense.price,
          paid: expense.paid,
          date: expense.date
      });
      setEditingId(expense.id);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Delete this purchase record?')) {
      await db.deleteExpense(id);
      refreshData();
    }
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown Supplier';

  const amount = formData.quantity * formData.price;
  const balance = amount - formData.paid;

  // Filter Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const supplierName = getSupplierName(item.supplierId).toLowerCase();
      const itemName = item.items.toLowerCase();
      const term = searchTerm.toLowerCase();
      
      const matchesSearch = !term || supplierName.includes(term) || itemName.includes(term);
      const matchesDate = !filterDate || item.date === filterDate;
      
      return matchesSearch && matchesDate;
    });
  }, [expenses, searchTerm, filterDate, suppliers]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Wallet className="text-purple-600" /> Purchases Log
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
        >
          <Plus size={20} /> New Purchase
        </button>
      </div>

       {/* Filter Toolbar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search supplier or items..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
            type="date" 
            className="border rounded-lg pl-10 pr-3 py-2 bg-white outline-none focus:border-purple-500 text-sm"
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Date</th>
                <th className="p-4 font-semibold text-gray-600">Supplier</th>
                <th className="p-4 font-semibold text-gray-600">Items</th>
                <th className="p-4 font-semibold text-gray-600">Qty</th>
                <th className="p-4 font-semibold text-gray-600">Amount</th>
                <th className="p-4 font-semibold text-gray-600">Paid</th>
                <th className="p-4 font-semibold text-gray-600">Balance</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredExpenses.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-800">{item.date}</td>
                  <td className="p-4 text-gray-800 font-medium">{getSupplierName(item.supplierId)}</td>
                  <td className="p-4 text-gray-600">{item.items}</td>
                  <td className="p-4 text-gray-600">{item.quantity}</td>
                  <td className="p-4 text-gray-800 font-semibold">${item.amount.toLocaleString()}</td>
                  <td className="p-4 text-green-600">${item.paid.toLocaleString()}</td>
                  <td className={`p-4 font-bold ${item.balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    ${item.balance.toLocaleString()}
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-600">
                        <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    {expenses.length === 0 ? "No purchases recorded." : "No purchases match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Purchase' : 'Record Purchase'}</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select required className="w-full border rounded-lg p-2"
                    value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Items Description</label>
                <input required type="text" className="w-full border rounded-lg p-2" 
                  value={formData.items} onChange={e => setFormData({...formData, items: e.target.value})} placeholder="e.g. Spare parts" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Total Amount:</span>
                <span className="text-lg font-bold text-gray-800">${amount.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={formData.paid} onChange={e => setFormData({...formData, paid: parseFloat(e.target.value)})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Balance Due</label>
                   <div className="w-full border rounded-lg p-2 bg-gray-100 text-gray-600">
                     ${balance.toLocaleString()}
                   </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 mt-2">
                {editingId ? 'Update Purchase' : 'Save Purchase'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};