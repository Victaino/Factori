
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { SalesOrder, Customer, Product, Tax } from '../types';
import { ShoppingCart, Plus, Trash2, Calendar, Users, Package, Pencil, Search, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const SalesOrderManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState('');

  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    quantity: 0,
    unitPrice: 0,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    receivedDate: '',
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 0,
    status: 'Pending' as 'Pending' | 'Received' | 'Confirmed' | 'Shipped' | 'Cancelled'
  });

  useEffect(() => {
    const fetchData = async () => {
        setOrders(await db.getSalesOrders());
        setCustomers(await db.getCustomers());
        setProducts(await db.getProducts());
        setTaxes(await db.getTaxes());
    };
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      customerId: '',
      productId: '',
      quantity: 0,
      unitPrice: 0,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      receivedDate: '',
      taxRate: 0,
      taxAmount: 0,
      totalAmount: 0,
      status: 'Pending'
    });
    setEditingId(null);
  };

  const calculateTotals = (qty: number, price: number, taxRate: number) => {
      const subtotal = qty * price;
      const taxAmt = subtotal * (taxRate / 100);
      return {
          taxAmount: taxAmt,
          totalAmount: subtotal + taxAmt
      };
  };

  const handleProductChange = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    const price = prod ? prod.price : 0;
    const { taxAmount, totalAmount } = calculateTotals(formData.quantity, price, formData.taxRate);
    
    setFormData(prev => ({
      ...prev,
      productId: prodId,
      unitPrice: price,
      taxAmount,
      totalAmount
    }));
  };

  const handleQtyChange = (qty: number) => {
    const { taxAmount, totalAmount } = calculateTotals(qty, formData.unitPrice, formData.taxRate);
    setFormData(prev => ({
      ...prev,
      quantity: qty,
      taxAmount,
      totalAmount
    }));
  };

  const handlePriceChange = (price: number) => {
    const { taxAmount, totalAmount } = calculateTotals(formData.quantity, price, formData.taxRate);
    setFormData(prev => ({
      ...prev,
      unitPrice: price,
      taxAmount,
      totalAmount
    }));
  };

  const handleTaxChange = (rate: number) => {
      const { taxAmount, totalAmount } = calculateTotals(formData.quantity, formData.unitPrice, rate);
      setFormData(prev => ({
          ...prev,
          taxRate: rate,
          taxAmount,
          totalAmount
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        await db.updateSalesOrder(editingId, formData);
        setOrders(orders.map(o => o.id === editingId ? { ...o, ...formData } : o));
    } else {
        const newOrder = await db.addSalesOrder(formData);
        setOrders([newOrder, ...orders]);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (order: SalesOrder) => {
      setFormData({
        customerId: order.customerId,
        productId: order.productId,
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        receivedDate: order.receivedDate || '',
        taxRate: order.taxRate || 0,
        taxAmount: order.taxAmount || 0,
        totalAmount: order.totalAmount,
        status: order.status
      });
      setEditingId(order.id);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this sales order?')) {
      await db.deleteSalesOrder(id);
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const status = newStatus as 'Pending' | 'Received' | 'Confirmed' | 'Shipped' | 'Cancelled';
    
    if (status === 'Confirmed') {
        if(confirm("Confirming this order will generate a record in the Sales Log. Continue?")) {
            await db.confirmSalesOrder(id);
            setOrders(await db.getSalesOrders()); // Refresh full list
        }
    } else if (status === 'Received') {
        const today = new Date().toISOString().split('T')[0];
        await db.updateSalesOrder(id, { status, receivedDate: today });
        setOrders(orders.map(o => o.id === id ? { ...o, status, receivedDate: today } : o));
    } else {
        await db.updateSalesOrder(id, { status });
        setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Customer';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown Product';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return 'bg-cyan-100 text-cyan-700';
      case 'Confirmed': return 'bg-blue-100 text-blue-700';
      case 'Shipped': return 'bg-green-100 text-green-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  // Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const customerName = getCustomerName(order.customerId).toLowerCase();
      const matchesSearch = !searchTerm || 
        customerName.includes(searchTerm.toLowerCase()) || 
        order.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
      const matchesDate = !filterDate || order.orderDate === filterDate;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchTerm, filterStatus, filterDate, customers]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="text-blue-600" /> Sales Orders
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} /> Create Order
        </button>
      </div>

       {/* Filter Toolbar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customer or order ID..." 
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
          <option value="Pending">Pending</option>
          <option value="Received">Received</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Shipped">Shipped</option>
          <option value="Cancelled">Cancelled</option>
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
                <th className="p-4 font-semibold text-gray-600">Sales Order ID</th>
                <th className="p-4 font-semibold text-gray-600">Customer</th>
                <th className="p-4 font-semibold text-gray-600">Product</th>
                <th className="p-4 font-semibold text-gray-600">Order Date</th>
                <th className="p-4 font-semibold text-gray-600">Received Date</th>
                <th className="p-4 font-semibold text-gray-600">Tax</th>
                <th className="p-4 font-semibold text-gray-600">Total</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-500 font-mono">#{order.id.slice(0, 6)}</td>
                  <td className="p-4 text-gray-800 font-medium">{getCustomerName(order.customerId)}</td>
                   <td className="p-4 text-gray-600">
                    <div className="flex flex-col">
                        <span>{getProductName(order.productId)}</span>
                        <span className="text-xs text-gray-400">Qty: {order.quantity}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{order.orderDate}</td>
                  <td className="p-4 text-gray-600">{order.receivedDate || '-'}</td>
                  <td className="p-4 text-gray-600">
                    {order.taxRate ? (
                        <div className="flex flex-col">
                            <span className="text-xs">{order.taxRate}%</span>
                            <span className="text-xs text-gray-500">{formatCurrency(order.taxAmount || 0)}</span>
                        </div>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-gray-800 font-semibold">{formatCurrency(order.totalAmount)}</td>
                  <td className="p-4">
                    <select 
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-semibold border-none outline-none cursor-pointer ${getStatusColor(order.status)}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Received">Received</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => handleEdit(order)} className="text-blue-400 hover:text-blue-600">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(order.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    {orders.length === 0 ? "No sales orders found." : "No orders match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Sales Order' : 'New Sales Order'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Order ID</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 font-mono text-sm"
                  value={editingId || 'Auto-generated'} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select required className="w-full border rounded-lg p-2"
                  value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
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
                    value={formData.quantity} onChange={e => handleQtyChange(parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={formData.unitPrice} onChange={e => handlePriceChange(parseFloat(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                <select 
                    className="w-full border rounded-lg p-2"
                    value={formData.taxRate}
                    onChange={e => handleTaxChange(parseFloat(e.target.value))}
                >
                    <option value={0}>No Tax (0%)</option>
                    {taxes.map(t => (
                        <option key={t.id} value={t.rate}>{t.name} ({t.rate}%)</option>
                    ))}
                </select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2 border">
                  <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(formData.quantity * formData.unitPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax Amount ({formData.taxRate}%):</span>
                      <span>{formatCurrency(formData.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-gray-800 border-t pt-2">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(formData.totalAmount)}</span>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                  <input required type="date" className="w-full border rounded-lg p-2" 
                    value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input required type="date" className="w-full border rounded-lg p-2" 
                    value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
                </div>
              </div>

              {formData.status === 'Received' && (
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                  <input type="date" className="w-full border rounded-lg p-2" 
                    value={formData.receivedDate} onChange={e => setFormData({...formData, receivedDate: e.target.value})} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <select 
                    value={formData.status}
                    onChange={(e) => {
                         const newStatus = e.target.value as any;
                         let newReceived = formData.receivedDate;
                         if (newStatus === 'Received' && !newReceived) {
                             newReceived = new Date().toISOString().split('T')[0];
                         }
                         setFormData({...formData, status: newStatus, receivedDate: newReceived});
                    }}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Received">Received</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 mt-2">
                {editingId ? 'Update Order' : 'Create Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
