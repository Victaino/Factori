import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Sale, Customer, Product } from '../types';
import { Plus, Trash2, TrendingUp, Search, X } from 'lucide-react';

interface SaleRowProps {
  item: Sale;
  customerName: string;
  productName: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Sale>) => void;
}

const SaleRow: React.FC<SaleRowProps> = ({ item, customerName, productName, onDelete, onUpdate }) => {
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
    <tr className="hover:bg-gray-50">
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
      <td className="p-4 text-gray-800 font-semibold">${item.amount.toLocaleString()}</td>
      <td className="p-4 text-green-600">${item.paid.toLocaleString()}</td>
      <td className={`p-4 font-bold ${item.balance > 0 ? 'text-red-500' : 'text-gray-400'}`}>
        ${item.balance.toLocaleString()}
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
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Handle product selection to auto-populate price
  const handleProductChange = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    setFormData(prev => ({
      ...prev,
      productId,
      // Auto-populate price from product definition, default to 0 if not found
      price: prod ? prod.price : 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = formData.quantity * formData.price;
    const balance = amount - formData.paid;
    
    await db.addSale({
      ...formData,
      amount,
      balance
    });
    
    setIsModalOpen(false);
    refreshData();
    setFormData({
      customerId: '',
      productId: '',
      quantity: 0,
      price: 0,
      paid: 0,
      date: new Date().toISOString().split('T')[0]
    });
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

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Customer';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown Product';

  // Filter Logic
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const customerName = getCustomerName(sale.customerId).toLowerCase();
      const productName = getProductName(sale.productId).toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || customerName.includes(term) || productName.includes(term);
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

  // Real-time calculation for display
  const amount = formData.quantity * formData.price;
  const balance = amount - formData.paid;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="text-green-600" /> Sales
        </h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
        >
          <Plus size={20} /> New Sale
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customer or product..." 
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
                  onDelete={handleDelete}
                  onUpdate={handleUpdateSale}
                />
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
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
              <h3 className="text-xl font-bold">Record Sale</h3>
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

              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 mt-2">
                Save Sale
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};