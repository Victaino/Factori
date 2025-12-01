
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Material, Product, InventoryItem } from '../types';
import { Plus, Trash2, Box, Package, ShoppingCart, Save, AlertTriangle, Pencil, Check, X, ArrowRightLeft, Image as ImageIcon, Search } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

type Tab = 'MATERIALS' | 'PRODUCTS' | 'INVENTORY';

interface InventoryRowProps {
  item: InventoryItem;
  productName: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newQuantity: number) => void;
  onUpdateThreshold: (id: string, newThreshold: number) => void;
  formatCurrency: (amount: number) => string;
}

const InventoryRow: React.FC<InventoryRowProps> = ({ item, productName, onDelete, onUpdate, onUpdateThreshold, formatCurrency }) => {
  const [adjustment, setAdjustment] = useState('');
  const [threshold, setThreshold] = useState(item.lowStockThreshold?.toString() || '0');

  const isLowStock = item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold;

  const handleAdjust = () => {
    const val = parseFloat(adjustment);
    if (isNaN(val) || val === 0) return;
    
    const newQty = item.quantity + val;
    if (newQty < 0) {
      alert("Cannot reduce inventory below zero.");
      return;
    }

    const confirmMsg = `Adjust inventory for ${productName}?\n\nCurrent: ${item.quantity}\nAdjustment: ${val > 0 ? '+' : ''}${val}\nNew Quantity: ${newQty}`;
    
    if (window.confirm(confirmMsg)) {
      onUpdate(item.id, newQty);
      setAdjustment('');
    }
  };

  const handleThresholdBlur = () => {
    const val = parseFloat(threshold);
    if (!isNaN(val) && val >= 0 && val !== item.lowStockThreshold) {
      onUpdateThreshold(item.id, val);
    }
  };

  return (
    <tr className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50 hover:bg-red-100' : ''} transition-colors border-b`}>
      <td className="p-4 font-medium text-gray-800 flex items-center gap-2">
        {isLowStock && <AlertTriangle size={16} className="text-red-500" />}
        {productName}
      </td>
      <td className={`p-4 font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-600'}`}>{item.quantity}</td>
      <td className="p-4">
        <div className="flex items-center gap-1">
           <input 
            type="number"
            className="w-20 border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="+/-"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
          />
          <button 
            onClick={handleAdjust}
            disabled={!adjustment}
            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50"
            title="Apply Adjustment"
          >
            <ArrowRightLeft size={16} />
          </button>
        </div>
      </td>
      <td className="p-4">
        <input 
          type="number"
          min="0"
          className="w-20 border rounded px-2 py-1 text-sm text-gray-600 focus:border-blue-500 outline-none bg-white/50"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          onBlur={handleThresholdBlur}
        />
      </td>
      <td className="p-4 text-gray-600">{formatCurrency(item.price)}</td>
      <td className="p-4 text-gray-800 font-medium">{formatCurrency(item.quantity * item.price)}</td>
    </tr>
  );
};

export const InventoryManager: React.FC<{ initialTab?: Tab }> = ({ initialTab = 'INVENTORY' }) => {
  const { formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); // Polymorphic state for Material or Product
  const [modalType, setModalType] = useState<'MATERIAL' | 'PRODUCT' | null>(null);

  // Form Data
  const [formData, setFormData] = useState({ name: '', price: 0, quantity: 0, imageUrl: '' });

  const refreshData = async () => {
    const [mat, prod, inv] = await Promise.all([
      db.getMaterials(),
      db.getProducts(),
      db.getInventory()
    ]);
    setMaterials(mat);
    setProducts(prod);
    
    // Safety check: Only keep inventory items that have a corresponding product definition.
    // This filters out "Unknown Products" caused by previous deletion bugs.
    const validInventory = inv.filter(i => prod.some(p => p.id === i.productId));
    setInventory(validInventory);
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Derived state for low stock count
  const lowStockCount = useMemo(() => {
    return inventory.filter(i => i.lowStockThreshold !== undefined && i.quantity <= i.lowStockThreshold).length;
  }, [inventory]);

  // Search logic
  const filteredInventory = inventory.filter(i => {
    const prodName = products.find(p => p.id === i.productId)?.name || '';
    return prodName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // CRUD Handlers
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'MATERIAL') {
      if (editingItem) {
        await db.updateMaterial(editingItem.id, {
          name: formData.name,
          price: formData.price,
          quantity: formData.quantity
        });
      } else {
        await db.addMaterial({
          name: formData.name,
          price: formData.price,
          quantity: formData.quantity
        });
      }
    } else if (modalType === 'PRODUCT') {
      if (editingItem) {
        await db.updateProduct(editingItem.id, {
          name: formData.name,
          price: formData.price,
          quantity: formData.quantity,
          imageUrl: formData.imageUrl
        });
      } else {
        await db.addProduct({
           name: formData.name,
           price: formData.price,
           quantity: formData.quantity,
           imageUrl: formData.imageUrl
        });
      }
    }
    setIsModalOpen(false);
    setEditingItem(null);
    setModalType(null);
    setFormData({ name: '', price: 0, quantity: 0, imageUrl: '' });
    refreshData();
  };

  const handleEdit = (item: any, type: 'MATERIAL' | 'PRODUCT') => {
    setEditingItem(item);
    setModalType(type);
    setFormData({ 
      name: item.name, 
      price: item.price, 
      quantity: item.quantity,
      imageUrl: item.imageUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleAdd = (type: 'MATERIAL' | 'PRODUCT') => {
    setEditingItem(null);
    setModalType(type);
    setFormData({ name: '', price: 0, quantity: 0, imageUrl: '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'MATERIAL' | 'PRODUCT') => {
    if (!confirm('Are you sure?')) return;
    if (type === 'MATERIAL') await db.deleteMaterial(id);
    if (type === 'PRODUCT') await db.deleteProduct(id);
    refreshData();
  };

  const handleUpdateInventory = async (id: string, newQty: number) => {
    await db.updateInventory(id, { quantity: newQty });
    refreshData();
  };

  const handleUpdateThreshold = async (id: string, newThreshold: number) => {
    await db.updateInventory(id, { lowStockThreshold: newThreshold });
    refreshData();
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown Product';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-1">
        <div className="flex space-x-4">
          <button
            onClick={() => { setActiveTab('INVENTORY'); setSearchTerm(''); }}
            className={`pb-2 px-4 font-medium transition-colors relative ${
              activeTab === 'INVENTORY' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inventory Log
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('MATERIALS'); setSearchTerm(''); }}
            className={`pb-2 px-4 font-medium transition-colors ${
              activeTab === 'MATERIALS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Raw Materials
          </button>
          <button
            onClick={() => { setActiveTab('PRODUCTS'); setSearchTerm(''); }}
            className={`pb-2 px-4 font-medium transition-colors ${
              activeTab === 'PRODUCTS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Product Definitions
          </button>
        </div>
        
        {/* Search Bar */}
         <div className="relative w-full sm:w-64 mb-2 sm:mb-0">
            <input
              type="text"
              placeholder="Search..."
              className="w-full border rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
               <Search size={14} />
             </div>
        </div>
      </div>

      {activeTab === 'INVENTORY' && (
        <>
          {lowStockCount > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-orange-500" />
                <div>
                  <h3 className="font-bold text-orange-800">Low Stock Alert</h3>
                  <p className="text-sm text-orange-700">{lowStockCount} items are below their minimum threshold.</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">Product</th>
                  <th className="p-4 font-semibold text-gray-600">Current Qty</th>
                  <th className="p-4 font-semibold text-gray-600">Adjust</th>
                  <th className="p-4 font-semibold text-gray-600">Min Stock</th>
                  <th className="p-4 font-semibold text-gray-600">Unit Price</th>
                  <th className="p-4 font-semibold text-gray-600">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => (
                  <InventoryRow 
                    key={item.id} 
                    item={item} 
                    productName={getProductName(item.productId)}
                    onDelete={() => {}} // Inventory deletion handled via Product deletion for now
                    onUpdate={handleUpdateInventory}
                    onUpdateThreshold={handleUpdateThreshold}
                    formatCurrency={formatCurrency}
                  />
                ))}
                {filteredInventory.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No matching inventory items.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'MATERIALS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Raw Materials</h3>
            <button onClick={() => handleAdd('MATERIAL')} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700">
              <Plus size={16} /> Add Material
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">Name</th>
                  <th className="p-4 font-semibold text-gray-600">Price / Ton</th>
                  <th className="p-4 font-semibold text-gray-600">Quantity (Tons)</th>
                  <th className="p-4 font-semibold text-gray-600">Total Value</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMaterials.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">{m.name}</td>
                    <td className="p-4 text-gray-600">{formatCurrency(m.price)}</td>
                    <td className="p-4 text-gray-600">{m.quantity}</td>
                    <td className="p-4 text-gray-800 font-medium">{formatCurrency(m.amount)}</td>
                    <td className="p-4 text-right flex justify-end gap-2">
                       <button onClick={() => handleEdit(m, 'MATERIAL')} className="text-blue-400 hover:text-blue-600"><Pencil size={18}/></button>
                       <button onClick={() => handleDelete(m.id, 'MATERIAL')} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
                {filteredMaterials.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No materials found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Product Definitions</h3>
            <button onClick={() => handleAdd('PRODUCT')} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-700">
              <Plus size={16} /> Add Product
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">Image</th>
                  <th className="p-4 font-semibold text-gray-600">Name</th>
                  <th className="p-4 font-semibold text-gray-600">Unit Price</th>
                  <th className="p-4 font-semibold text-gray-600">Initial Qty</th>
                  <th className="p-4 font-semibold text-gray-600">Total Value</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="text-gray-400" size={20} />
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gray-800">{p.name}</td>
                    <td className="p-4 text-gray-600">{formatCurrency(p.price)}</td>
                    <td className="p-4 text-gray-600">{p.quantity}</td>
                    <td className="p-4 text-gray-800 font-medium">{formatCurrency(p.amount)}</td>
                    <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleEdit(p, 'PRODUCT')} className="text-blue-400 hover:text-blue-600"><Pencil size={18}/></button>
                        <button onClick={() => handleDelete(p.id, 'PRODUCT')} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No products found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shared Modal for Materials and Products */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingItem ? 'Edit' : 'Add'} {modalType === 'MATERIAL' ? 'Material' : 'Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required type="text" className="w-full border rounded-lg p-2"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              {modalType === 'PRODUCT' && (
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
                   <div className="relative">
                     <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                     <input type="text" className="w-full border rounded-lg pl-9 pr-2 py-2"
                       placeholder="https://..."
                       value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                   <input required type="number" min="0" className="w-full border rounded-lg p-2"
                     value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                   <input required type="number" min="0" className="w-full border rounded-lg p-2"
                     value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value)})} />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
