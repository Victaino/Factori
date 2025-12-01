import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { SalesOrder, Customer, Product } from '../types';
import { ShoppingCart, Plus, Trash2, Calendar, Users, Package, Pencil, Search, X } from 'lucide-react';

export const SalesOrderManager: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>(db.getSalesOrders());
  const [customers, setCustomers] = useState<Customer[]>(db.getCustomers());
  const [products, setProducts] = useState<Product[]>(db.getProducts());
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
    totalAmount: 0,
    status: 'Pending' as 'Pending' | 'Received' | 'Confirmed' | 'Shipped' | 'Cancelled'
  });

  useEffect(() => {
    setOrders(db.getSalesOrders());
    setCustomers(db.getCustomers());
    setProducts(db.getProducts());
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
      totalAmount: 0,
      status: 'Pending'
    });
    setEditingId(null);
  };

  const handleProductChange = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    setFormData(prev => ({
      ...prev,
      productId: prodId,
      unitPrice: prod ? prod.price : 0,
      totalAmount: prod ? prod.price * prev.quantity : 0
    }));
  };

  const handleQtyChange = (qty: number) => {
    setFormData(prev => ({
      ...prev,
      quantity: qty,
      totalAmount: qty * prev.unitPrice
    }));
  };

  const handlePriceChange = (price: number) => {
    setFormData(prev => ({
      ...prev,
      unitPrice: price,
      totalAmount: price * prev.quantity
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        db.updateSalesOrder(editingId, formData);
        setOrders(orders.map(o => o.id === editingId ? { ...o, ...formData } : o));
    } else {
        const newOrder = db.addSalesOrder(formData);
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
        totalAmount: order.totalAmount,
        status: order.status
      });
      setEditingId(order.id);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this sales order?')) {
      db.deleteSalesOrder(id);
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const status = newStatus as 'Pending' | 'Received' | 'Confirmed' | 'Shipped' | 'Cancelled';
    
    if (status === 'Confirmed') {
        if(confirm("Confirming this order will generate a record in the Sales Log. Continue?")) {
            db.confirmSalesOrder(id);
            setOrders(db.getSalesOrders()); // Refresh full list
        }
    } else if (status === 'Received') {
        // Auto-set received date to today if setting to Received
        const today = new Date().toISOString().split('T')[0];
        db.updateSalesOrder(id, { status, receivedDate: today });
        setOrders(orders.map(o => o.id === id ? { ...o, status, receivedDate: today } : o));
    } else {
        db.updateSalesOrder(id, { status });
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
                <th className="p-4 font-semibold text-gray-600">ID</th>
                <th className="p-4 font-semibold text-gray-600">Customer</th>
                <th className="p-4 font-semibold text-gray-600">Product</th>
                <th className="p-4 font-semibold text-gray-600">Details</th>
                <th className="p-4 font-semibold text-gray-600">Delivery</th>
                <th className="p-4 font-semibold text-gray-600">Received</th>
                <th className="p-4 font-semibold text-gray-600">Amount</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-500 font-mono">#{order.id.slice(0, 6)}</td>
                  <td className="p-4 text-gray-800 font-medium">{getCustomerName(order.customerId)}</td>
                  <td className="p-4 text-gray-600">{getProductName(order.productId)}</td>
                  <td className="p-4 text-gray-600 text-xs">
                    {order.quantity} x ${order.unitPrice.toLocaleString()}
                  </td>
                  <td className="p-4 text-gray-600">{order.deliveryDate}</td>
                  <td className="p-4 text-gray-600">{order.receivedDate || '-'}</td>
                  <td className="p-4 text-gray-800 font-semibold">${order.totalAmount.toLocaleString()}</td>
                  <td className="p-4">
                    <select 
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      disabled={order.status === 'Confirmed' || order.status === 'Shipped'} 
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
                  <input required type="number" min="1" className="w-full border rounded-lg p-2" 
                    value={formData.quantity} onChange={e => handleQtyChange(parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={formData.unitPrice} onChange={e => handlePriceChange(parseFloat(e.target.value))} />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <select 
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as any;
                      setFormData(prev => ({
                        ...prev, 
                        status: newStatus,
                        // Auto-fill received date if setting to Received and date is empty
                        receivedDate: newStatus === 'Received' && !prev.receivedDate 
                          ? new Date().toISOString().split('T')[0] 
                          : prev.receivedDate
                      }));
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

              {formData.status === 'Received' && (
                <div className="animate-fade-in">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                   <input required type="date" className="w-full border rounded-lg p-2 border-cyan-500 ring-1 ring-cyan-100" 
                    value={formData.receivedDate} onChange={e => setFormData({...formData, receivedDate: e.target.value})} />
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                <span className="text-gray-600 font-medium">Total Amount</span>
                <span className="text-xl font-bold text-blue-600">${formData.totalAmount.toLocaleString()}</span>
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