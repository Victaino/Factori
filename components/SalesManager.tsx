
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Sale, Customer, Product } from '../types';
import { Plus, Trash2, TrendingUp, Search, X, Download, FileText, CheckSquare, Square, CheckCircle, ArrowLeft } from 'lucide-react';
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
        onUpdate(item.id, { price: localPrice });
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
        />
      </td>
      <td className="p-4 text-gray-800 font-semibold">{formatCurrency(item.amount)}</td>
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
  const { formatCurrency } = useSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bulk Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Report State
  const [showReport, setShowReport] = useState(false);
  const [reportRange, setReportRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PAID'

  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    quantity: 0,
    price: 0,
    paid: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const refreshData = async () => {
    setSales(await db.getSales());
    setCustomers(await db.getCustomers());
    setProducts(await db.getProducts());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Customer';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown Product';

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
    
    // In a real app, db service should have a bulkDelete method.
    // Here we iterate for simplicity.
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
    const headers = ['Sale ID', 'Date', 'Customer', 'Product', 'Quantity', 'Price', 'Total', 'Paid', 'Balance'];
    
    const rows = filteredSales.map(sale => [
      sale.id,
      sale.date,
      `"${getCustomerName(sale.customerId)}"`,
      `"${getProductName(sale.productId)}"`,
      sale.quantity,
      sale.price,
      sale.amount,
      sale.paid,
      sale.balance
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Filtering ---

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const customerName = getCustomerName(sale.customerId).toLowerCase();
      const productName = getProductName(sale.productId).toLowerCase();
      const term = searchTerm.toLowerCase();

      // Enhanced Search: Checks text fields AND numeric fields
      const matchesSearch = !term || 
        customerName.includes(term) || 
        productName.includes(term) ||
        sale.quantity.toString().includes(term) ||
        sale.amount.toString().includes(term);

      const matchesDate = !filterDate || sale.date === filterDate;
      const matchesCustomer = !filterCustomer || sale.customerId === filterCustomer;
      const matchesProduct = !filterProduct || sale.productId === filterProduct;
      
      const matchesStatus = 
        filterStatus === 'ALL' || 
        (filterStatus === 'UNPAID' && sale.balance > 0) || 
        (filterStatus === 'PAID' && sale.balance === 0);

      return matchesSearch && matchesDate && matchesCustomer && matchesProduct && matchesStatus;
    });
  }, [sales, searchTerm, filterDate, filterCustomer, filterProduct, filterStatus, customers, products]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterCustomer('');
    setFilterProduct('');
    setFilterStatus('ALL');
  };

  // --- CRUD & Form Handlers ---

  const handleProductChange = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    setFormData(prev => ({
      ...prev,
      productId,
      price: prod ? prod.price : 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = formData.quantity * formData.price;
    const balance = amount - formData.paid;
    
    if (editingId) {
       await db.updateSale(editingId, { ...formData, amount, balance });
    } else {
       await db.addSale({ ...formData, amount, balance });
    }
    
    setIsModalOpen(false);
    refreshData();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      productId: '',
      quantity: 0,
      price: 0,
      paid: 0,
      date: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
  };

  const handleUpdateSale = async (id: string, updates: Partial<Sale>) => {
    await db.updateSale(id, updates);
    refreshData();
  };

  const handleDelete = async (id: string) => {
    if(confirm('Delete this sale record?')) {
      await db.deleteSale(id);
      refreshData();
    }
  };

  const amount = formData.quantity * formData.price;
  const balance = amount - formData.paid;

  // --- Report Logic ---

  const reportData = useMemo(() => {
    if (!showReport) return { byProduct: [], byCustomer: [], totalSales: 0 };

    const relevantSales = sales.filter(s => s.date >= reportRange.start && s.date <= reportRange.end);
    
    const totalSales = relevantSales.reduce((sum, s) => sum + s.amount, 0);

    // Group by Product
    const prodMap = new Map<string, number>();
    relevantSales.forEach(s => {
      const name = getProductName(s.productId);
      prodMap.set(name, (prodMap.get(name) || 0) + s.amount);
    });
    const byProduct = Array.from(prodMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Group by Customer
    const custMap = new Map<string, number>();
    relevantSales.forEach(s => {
      const name = getCustomerName(s.customerId);
      custMap.set(name, (custMap.get(name) || 0) + s.amount);
    });
    const byCustomer = Array.from(custMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { byProduct, byCustomer, totalSales };
  }, [sales, showReport, reportRange, customers, products]);


  // --- Render ---

  if (showReport) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Sales Report
          </h2>
          <button 
            onClick={() => setShowReport(false)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200"
          >
            <ArrowLeft size={20} /> Back to List
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-4 mb-6">
             <div>
               <label className="block text-xs text-gray-500 mb-1">Start Date</label>
               <input 
                 type="date" 
                 className="border rounded p-2 text-sm"
                 value={reportRange.start}
                 onChange={e => setReportRange(prev => ({...prev, start: e.target.value}))}
               />
             </div>
             <div>
               <label className="block text-xs text-gray-500 mb-1">End Date</label>
               <input 
                 type="date" 
                 className="border rounded p-2 text-sm"
                 value={reportRange.end}
                 onChange={e => setReportRange(prev => ({...prev, end: e.target.value}))}
               />
             </div>
             <div className="ml-auto text-right">
               <span className="block text-xs text-gray-500">Total Sales in Period</span>
               <span className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalSales)}</span>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
               <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Sales by Product</h3>
               <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500">
                   <tr>
                     <th className="p-2">Product</th>
                     <th className="p-2 text-right">Total Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {reportData.byProduct.map(item => (
                     <tr key={item.name}>
                       <td className="p-2">{item.name}</td>
                       <td className="p-2 text-right font-medium">{formatCurrency(item.value)}</td>
                     </tr>
                   ))}
                   {reportData.byProduct.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-gray-400">No data</td></tr>}
                 </tbody>
               </table>
             </div>

             <div>
               <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Sales by Customer</h3>
               <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-500">
                   <tr>
                     <th className="p-2">Customer</th>
                     <th className="p-2 text-right">Total Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {reportData.byCustomer.map(item => (
                     <tr key={item.name}>
                       <td className="p-2">{item.name}</td>
                       <td className="p-2 text-right font-medium">{formatCurrency(item.value)}</td>
                     </tr>
                   ))}
                    {reportData.byCustomer.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-gray-400">No data</td></tr>}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="text-green-600" /> Sales Log
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowReport(true)}
            className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100"
          >
            <FileText size={20} /> Report
          </button>
          <button 
            onClick={handleExportCsv}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200"
          >
            <Download size={20} /> Export
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus size={20} /> New Sale
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600 text-white p-3 rounded-lg flex justify-between items-center shadow-md animate-fade-in">
          <span className="font-medium pl-2">{selectedIds.size} item(s) selected</span>
          <div className="flex gap-2">
            <button 
              onClick={handleBulkMarkPaid}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm flex items-center gap-1"
            >
              <CheckCircle size={16} /> Mark Paid
            </button>
            <button 
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded text-sm flex items-center gap-1"
            >
              <Trash2 size={16} /> Delete
            </button>
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customer, product, qty or amount..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-green-500 text-sm min-w-[140px]"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="UNPAID">Outstanding Due</option>
          <option value="PAID">Paid in Full</option>
        </select>

        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-green-500 text-sm"
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
        >
          <option value="">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-green-500 text-sm"
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
        >
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <input 
          type="date" 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-green-500 text-sm"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        {(searchTerm || filterDate || filterCustomer || filterProduct || filterStatus !== 'ALL') && (
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
                <th className="p-4 w-10">
                  <button onClick={handleSelectAll} className="text-gray-500 hover:text-blue-600">
                     {filteredSales.length > 0 && selectedIds.size === filteredSales.length ? (
                       <CheckSquare size={20} className="text-blue-600" />
                     ) : (
                       <Square size={20} />
                     )}
                  </button>
                </th>
                <th className="p-4 font-semibold text-gray-600">Date</th>
                <th className="p-4 font-semibold text-gray-600">Customer</th>
                <th className="p-4 font-semibold text-gray-600">Product</th>
                <th className="p-4 font-semibold text-gray-600">Qty</th>
                <th className="p-4 font-semibold text-gray-600">Unit Price</th>
                <th className="p-4 font-semibold text-gray-600">Amount</th>
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
                  onUpdate={handleUpdateSale}
                  formatCurrency={formatCurrency}
                />
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    {sales.length === 0 ? "No sales recorded." : "No matching sales found."}
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
              <h3 className="text-xl font-bold">{editingId ? 'Edit Sale' : 'Record Sale'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale ID</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 font-mono text-sm"
                  value={editingId || 'Auto-generated'} 
                />
              </div>

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
                  value={formData.productId} onChange={e => handleProductChange(e.target.value)}>
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
                <span className="text-lg font-bold text-gray-800">{formatCurrency(amount)}</span>
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
                     {formatCurrency(balance)}
                   </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 mt-2">
                {editingId ? 'Update Sale' : 'Save Sale'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
