import React, { useState, useMemo } from 'react';
import { db } from '../services/db';
import { Supplier } from '../types';
import { Plus, Trash2, Truck, Phone, Mail, MapPin, Pencil, Search, X } from 'lucide-react';

export const SupplierManager: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(db.getSuppliers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        db.updateSupplier(editingId, formData);
        setSuppliers(suppliers.map(s => s.id === editingId ? { ...s, ...formData } : s));
    } else {
        const newSupplier = db.addSupplier(formData);
        setSuppliers([...suppliers, newSupplier]);
    }
    setFormData({ name: '', address: '', phone: '', email: '', contactPerson: '' });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
        name: supplier.name,
        address: supplier.address,
        phone: supplier.phone,
        email: supplier.email,
        contactPerson: supplier.contactPerson
    });
    setEditingId(supplier.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      db.deleteSupplier(id);
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };

  const openNewModal = () => {
      setFormData({ name: '', address: '', phone: '', email: '', contactPerson: '' });
      setEditingId(null);
      setIsModalOpen(true);
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Truck className="text-orange-600" /> Suppliers
        </h2>
        <button 
          onClick={openNewModal}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
        >
          <Plus size={20} /> Add Supplier
        </button>
      </div>

       {/* Search Bar */}
       <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by name, contact or email..." 
          className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(supplier => (
          <div key={supplier.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => handleEdit(supplier)}
                    className="text-gray-300 hover:text-blue-500"
                >
                    <Pencil size={18} />
                </button>
                <button 
                    onClick={() => handleDelete(supplier.id)}
                    className="text-gray-300 hover:text-red-500"
                >
                    <Trash2 size={18} />
                </button>
              </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{supplier.name}</h3>
                <p className="text-sm text-gray-500">{supplier.contactPerson}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" />
                <span>{supplier.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                <span>{supplier.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                <a href={`mailto:${supplier.email}`} className="text-orange-500 hover:underline">{supplier.email}</a>
              </div>
            </div>
          </div>
        ))}
        {filteredSuppliers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <Truck className="mx-auto text-gray-300 mb-2" size={48} />
            <p>{suppliers.length === 0 ? "No suppliers registered yet." : "No suppliers match your search."}</p>
          </div>
        )}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input required type="text" className="w-full border rounded-lg p-2" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input required type="text" className="w-full border rounded-lg p-2" 
                  value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" className="w-full border rounded-lg p-2" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input required type="tel" className="w-full border rounded-lg p-2" 
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea required className="w-full border rounded-lg p-2" rows={3}
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 mt-4">
                {editingId ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};