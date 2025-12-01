
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { PurchaseOrder, Supplier } from '../types';
import { ShoppingBag, Plus, Trash2, Calendar, Truck, Pencil, Search, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const PurchaseOrderManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState('');

  const [formData, setFormData] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    receivedDate: '',
    totalAmount: 0,
    status: 'Pending' as 'Pending' | 'Received' | 'Cancelled'
  });

  useEffect(() => {
    const fetchData = async () => {
        setOrders(await db.getPurchaseOrders());
        setSuppliers(await db.getSuppliers());
    };
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      supplierId: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      receivedDate: '',
      totalAmount: 0,
      status: 'Pending'
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        await db.updatePurchaseOrder(editingId, formData);
        setOrders(orders.map(o => o.id === editingId ? { ...o, ...formData } : o));
    } else {
        const newOrder = await db.addPurchaseOrder(formData);
        setOrders([newOrder, ...orders]);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (order: PurchaseOrder) => {
      setFormData({
          supplierId: order.supplierId,
          orderDate: order.orderDate,
          expectedDeliveryDate: order.expectedDeliveryDate,
          receivedDate: order.receivedDate || '',
          totalAmount: order.totalAmount,
          status: order.status
      });
      setEditingId(order.id);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      await db.deletePurchaseOrder(id);
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const status = newStatus as 'Pending' | 'Received' | 'Cancelled';
    await db.updatePurchaseOrder(id, { status });
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown Supplier';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return 'bg-green-100 text-green-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  // Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const supplierName = getSupplierName(order.supplierId).toLowerCase();
      const matchesSearch = !searchTerm || 
        supplierName.includes(searchTerm.toLowerCase()) || 
        order.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
      const matchesDate = !filterDate || order.orderDate === filterDate;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchTerm, filterStatus, filterDate, suppliers]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingBag className="text-emerald-600" /> Purchase Orders
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
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
            placeholder="Search supplier or order ID..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-emerald-500 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Received">Received</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
            type="date" 
            className="border rounded-lg pl-10 pr-3 py-2 bg-white outline-none focus:border-emerald-500 text-sm"
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
                <th className="p-4 font-semibold text-gray-600">Supplier</th>
                <th className="p-4 font-semibold text-gray-600">Order Date</th>
                <th className="p-4 font-semibold text-gray-600">Expected Delivery</th>
                <th className="p-4 font-semibold text-gray-600">Received Date</th>
                <th className="p-4 font-semibold text-gray-600">Amount</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-500 font-mono">#{order.id.slice(0, 6)}</td>
                  <td className="p-4 text-gray-800 font-medium">{getSupplierName(order.supplierId)}</td>
                  <td className="p-4 text-gray-600">{order.orderDate}</td>
                  <td className="p-4 text-gray-600">{order.expectedDeliveryDate}</td>
                  <td className="p-4 text-gray-600">{order.receivedDate || '-'}</td>
                  <td className="p-4 text-gray-800 font-semibold">{formatCurrency(order.totalAmount)}</td>
                  <td className="p-4">
                    <select 
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-semibold border-none outline-none cursor-pointer ${getStatusColor(order.status)}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Received">Received</option>
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
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    {orders.length === 0 ? "No purchase orders found." : "No orders match your filters."}
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
              <h3 className="text-xl font-bold">{editingId ? 'Edit Purchase Order' : 'New Purchase Order'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order ID</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full border rounded-lg p-2 bg-gray-100 text-gray-500 font-mono text-sm"
                  value={editingId || 'Auto-generated'} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select required className="w-full border rounded-lg p-2"
                  value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                  <input required type="date" className="w-full border rounded-lg p-2" 
                    value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                  <input required type="date" className="w-full border rounded-lg p-2" 
                    value={formData.expectedDeliveryDate} onChange={e => setFormData({...formData, expectedDeliveryDate: e.target.value})} />
                </div>
              </div>

               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Received Date (Optional)</label>
                  <input type="date" className="w-full border rounded-lg p-2" 
                    value={formData.receivedDate} onChange={e => setFormData({...formData, receivedDate: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                  value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: parseFloat(e.target.value)})} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-semibold hover:bg-emerald-700 mt-2">
                {editingId ? 'Update Order' : 'Create Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
