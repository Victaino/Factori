
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Sale, Customer, Product, Tax } from '../types';
import { Plus, Trash2, TrendingUp, Search, X, Download, FileText, CheckSquare, Square, CheckCircle, ArrowLeft, Calendar } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SaleRowProps {
  item: Sale;
  customerName: string;
  productName: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Sale>) => void;
  formatCurrency: (amount: number) => string;
}

const SaleRow: React.FC<SaleRowProps> = ({ 
  item, customerName, productName, isSelected, onSelect, onDelete, onUpdate, formatCurrency 
}) => {
  const [localPrice, setLocalPrice] = useState(item.price);

  useEffect(() => {
    setLocalPrice(item.price);
  }, [item.price]);

  const handleBlur = () => {
    if (localPrice !== item.price) {
        if (item.taxRate && item.taxRate > 0) {
            alert("Please edit via the 'Edit' form to recalculate taxes.");
            setLocalPrice(item.price);
        } else {
            onUpdate(item.id, { price: localPrice, amount: localPrice * item.quantity });
        }
    }
  };

  return (
    <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="p-4">
        <button onClick={() => onSelect(item.id)} className="text-gray-400 hover:text-blue-600">
          {isSelected ? <CheckSquare className="text-blue-600" size={20} /> : <Square size={20} />}
        </button>
      </td>
      <td className="p-4 text-gray-800">{item.date}</td>
      <td className="p-4 text-gray-800 font-medium">{customerName}</td>
      <td className="p-4 text-gray-600">{productName}</td>
      <td className="p-4 text-gray-600">{item.quantity}</td>
      <td className="p-4">
        <input 
            type="number" 
            min="0"
            className="w-24 border rounded px-2 py-1 text-sm focus:border-green-500 outline-none bg-white"
            value={localPrice}
            onChange={(e) => setLocalPrice(parseFloat(e.target.value) || 0)}
            onBlur={handleBlur}
            disabled={!!item.taxRate} 
            title={!!item.taxRate ? "Edit via form to recalculate tax" : ""}
        />
      </td>
      <td className="p-4 text-gray-800 font-semibold">
          <div className="flex flex-col">
            <span>{formatCurrency(item.amount)}</span>
            {item.taxAmount ? <span className="text-xs text-gray-500">Inc. {formatCurrency(item.taxAmount)} Tax</span> : null}
          </div>
      </td>
      <td className="p-4 text-green-600">{formatCurrency(item.paid)}</td>
      <td className={`p-4 font-bold ${item.balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>
        {formatCurrency(item.balance)}
      </td>
      <td className="p-4 text-right">
        <button onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-600">
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
};

export const SalesManager: React.FC = () => {
  const { formatCurrency, settings } = useSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PAID'

  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    quantity: 0,
    price: 0,
    paid: 0,
    date: new Date().toISOString().split('T')[0],
    taxRate: settings?.taxRate || 0,
    taxAmount: 0,
    amount: 0 // Total amount
  });

  const refreshData = async () => {
    setSales(await db.getSales());
    setCustomers(await db.getCustomers());
    setProducts(await db.getProducts());
    setTaxes(await db.getTaxes());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Update default tax
  useEffect(() => {
    if (!editingId && settings?.taxRate) {
        setFormData(prev => ({ ...prev, taxRate: settings.taxRate }));
    }
  }, [settings, editingId]);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Customer';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown Product';

  // --- Filter Logic ---
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const customerName = getCustomerName(sale.customerId).toLowerCase();
      const productName = getProductName(sale.productId).toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term || customerName.includes(term) || productName.includes(term);
      
      const matchesDate = !filterDate || sale.date === filterDate;
      
      let matchesStatus = true;
      if (filterStatus === 'UNPAID') matchesStatus = sale.balance > 0;
      if (filterStatus === 'PAID') matchesStatus = sale.balance === 0;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [sales, searchTerm, filterDate, filterStatus, customers, products]);

  // --- Bulk Actions ---

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredSales.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSales.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} sales?`)) return;
    for (const id of selectedIds) {
      await db.deleteSale(id);
    }
    setSelectedIds(new Set());
    refreshData();
  };

  const handleBulkMarkPaid = async () => {
    if (!confirm(`Mark ${selectedIds.size} sales as fully paid?`)) return;

    for (const id of selectedIds) {
      const sale = sales.find(s => s.id === id);
      if (sale && sale.balance > 0) {
        await db.updateSale(id, {
          paid: sale.amount,
          balance: 0
        });
      }
    }
    setSelectedIds(new Set());
    refreshData();
  };

  // --- Export ---

  const handleExportCsv = () => {
    const headers = ['Sale ID', 'Date', 'Customer', 'Product', 'Quantity', 'Price', 'Tax', 'Total', 'Paid', 'Balance'];
    
    const rows = filteredSales.map(sale => [
      sale.id,
      sale.date,
      `"${getCustomerName(sale.customerId)}"`,
      `"${getProductName(sale.productId)}"`,
      sale.quantity,
      sale.price,
      sale.taxAmount || 0,
      sale.amount,
      sale.paid,
      sale.balance
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CRUD Handlers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = (formData.quantity * formData.price) + formData.taxAmount;
    const balance = amount - formData.paid;

    if (editingId) {
      await db.updateSale(editingId, { ...formData, amount, balance });
    } else {
      await db.addSale({ ...formData, amount, balance });
    }
    
    setIsModalOpen(false);
    resetForm();
    refreshData();
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      productId: '',
      quantity: 0,
      price: 0,
      paid: 0,
      date: new Date().toISOString().split('T')[0],
      taxRate: settings?.taxRate || 0,
      taxAmount: 0,
      amount: 0
    });
    setEditingId(null);
  };
  
  const calculateTax = (price: number, qty: number, rate: number) => {
      const p = isNaN(price) ? 0 : price;
      const q = isNaN(qty) ? 0 : qty;
      const r = isNaN(rate) ? 0 : rate;
      const subtotal = p * q;
      return subtotal * (r / 100);
  };

  const updateFormCalculations = (newQty: number, newPrice: number, newTaxRate: number) => {
      const taxAmt = calculateTax(newPrice, newQty, newTaxRate);
      setFormData(prev => ({
          ...prev,
          quantity: newQty,
          price: newPrice,
          taxRate: newTaxRate,
          taxAmount: taxAmt
      }));
  };

  const handleDelete = async (id: string) => {
      if(confirm("Delete this sale record?")) {
          await db.deleteSale(id);
          refreshData();
      }
  };
  
  const handleUpdateInline = async (id: string, updates: Partial<Sale>) => {
      await db.updateSale(id, updates);
      refreshData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="text-blue-600" /> Sales Log
        </h2>
        <div className="flex gap-2">
             {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 px-3 rounded-lg border border-blue-100 animate-fade-in">
                    <span className="text-sm font-medium text-blue-700">{selectedIds.size} selected</span>
                    <button onClick={handleBulkMarkPaid} className="p-2 text-green-600 hover:bg-green-100 rounded" title="Mark Paid">
                        <CheckCircle size={18} />
                    </button>
                    <button onClick={handleBulkDelete} className="p-2 text-red-600 hover:bg-red-100 rounded" title="Delete">
                        <Trash2 size={18} />
                    </button>
                </div>
            )}
            <button 
              onClick={handleExportCsv}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200"
            >
              <Download size={20} /> Export
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus size={20} /> Record Sale
            </button>
        </div>
      </div>

       {/* Filter Toolbar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customer or product..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="UNPAID">Unpaid / Partial</option>
          <option value="PAID">Fully Paid</option>
        </select>

        <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
            type="date" 
            className="border rounded-lg pl-10 pr-3 py-2 bg-white outline-none focus:border-blue-500 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            />
        </div>

        {(searchTerm || filterDate || filterStatus !== 'ALL') && (
          <button 
            onClick={() => { setSearchTerm(''); setFilterDate(''); setFilterStatus('ALL'); }}
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
                <th className="p-4 w-10">
                  <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600">
                    {filteredSales.length > 0 && selectedIds.size === filteredSales.length ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                </th>
                <th className="p-4 font-semibold text-gray-600">Date</th>
                <th className="p-4 font-semibold text-gray-600">Customer</th>
                <th className="p-4 font-semibold text-gray-600">Product</th>
                <th className="p-4 font-semibold text-gray-600">Qty</th>
                <th className="p-4 font-semibold text-gray-600">Price</th>
                <th className="p-4 font-semibold text-gray-600">Total</th>
                <th className="p-4 font-semibold text-gray-600">Paid</th>
                <th className="p-4 font-semibold text-gray-600">Balance</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSales.map(item => (
                <SaleRow 
                  key={item.id}
                  item={item}
                  customerName={getCustomerName(item.customerId)}
                  productName={getProductName(item.productId)}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={handleSelectOne}
                  onDelete={handleDelete}
                  onUpdate={handleUpdateInline}
                  formatCurrency={formatCurrency}
                />
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    {sales.length === 0 ? "No sales recorded." : "No sales match your filters."}
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
              <h3 className="text-xl font-bold">{editingId ? 'Edit Sale' : 'Record New Sale'}</h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <select required className="w-full border rounded-lg p-2"
                      value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                      <option value="">Select Customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select required className="w-full border rounded-lg p-2"
                  value={formData.productId} 
                  onChange={e => {
                      const prod = products.find(p => p.id === e.target.value);
                      const price = prod ? prod.price : 0;
                      setFormData({...formData, productId: e.target.value, price}); // Auto-fill price
                      updateFormCalculations(formData.quantity, price, formData.taxRate);
                  }}
                >
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={isNaN(formData.quantity) ? '' : formData.quantity} 
                    onChange={e => updateFormCalculations(parseFloat(e.target.value), formData.price, formData.taxRate)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={isNaN(formData.price) ? '' : formData.price} 
                    onChange={e => updateFormCalculations(formData.quantity, parseFloat(e.target.value), formData.taxRate)} />
                </div>
              </div>

               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                <select 
                    className="w-full border rounded-lg p-2"
                    value={formData.taxRate}
                    onChange={e => updateFormCalculations(formData.quantity, formData.price, parseFloat(e.target.value))}
                >
                    <option value={0}>No Tax (0%)</option>
                    {/* Organization Default */}
                    {settings?.taxRate && (
                        <option value={settings.taxRate}>
                            {settings.taxName || 'Org Default'} ({settings.taxRate}%)
                        </option>
                    )}
                    {taxes.map(t => (
                        <option key={t.id} value={t.rate}>{t.name} ({t.rate}%)</option>
                    ))}
                </select>
              </div>

               <div className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total (Inc. Tax):</span>
                  <span className="text-lg font-bold text-gray-800">
                      {formatCurrency(((isNaN(formData.quantity) ? 0 : formData.quantity) * (isNaN(formData.price) ? 0 : formData.price)) + (isNaN(formData.taxAmount) ? 0 : formData.taxAmount))}
                  </span>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={isNaN(formData.paid) ? '' : formData.paid} onChange={e => setFormData({...formData, paid: parseFloat(e.target.value)})} />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 mt-2">
                {editingId ? 'Update Sale' : 'Save Sale'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
