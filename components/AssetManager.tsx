
import React, { useState, useEffect, useMemo } from 'react';
import { db, ASSETS_SQL } from '../services/db';
import { Asset } from '../types';
import { Monitor, Plus, Trash2, Pencil, Search, X, AlertTriangle, Terminal, Copy } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const AssetManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Error Handling
  const [dbError, setDbError] = useState<{message: string, sql?: string} | null>(null);

  const [formData, setFormData] = useState({
    item: '',
    make: '',
    type: '',
    serialNumber: '',
    color: '',
    qty: 1,
    unitPrice: 0,
    remark: ''
  });

  const refreshData = async () => {
    try {
      setAssets(await db.getAssets());
    } catch (e: any) {
      console.error("Failed to load assets", e);
      if (e.message.includes('relation "assets" does not exist') || e.message.includes('404')) {
          setDbError({
              message: "The 'assets' table is missing from the database.",
              sql: ASSETS_SQL
          });
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbError(null);
    
    // Calculate total explicitly for UI consistency
    const total = formData.qty * formData.unitPrice;
    
    try {
        if (editingId) {
            await db.updateAsset(editingId, { ...formData, total });
            setAssets(assets.map(a => a.id === editingId ? { ...a, ...formData, total } : a));
        } else {
            const newAsset = await db.addAsset({ ...formData, total });
            setAssets([...assets, newAsset]);
        }
        setIsModalOpen(false);
        resetForm();
    } catch (e: any) {
        console.error("Save failed:", e);
        const msg = e.message || "Failed to save asset.";
        setDbError({
            message: msg,
            sql: msg.includes('relation "assets"') ? ASSETS_SQL : undefined
        });
    }
  };

  const resetForm = () => {
    setFormData({
      item: '',
      make: '',
      type: '',
      serialNumber: '',
      color: '',
      qty: 1,
      unitPrice: 0,
      remark: ''
    });
    setEditingId(null);
  };

  const handleEdit = (asset: Asset) => {
    setFormData({
      item: asset.item,
      make: asset.make,
      type: asset.type,
      serialNumber: asset.serialNumber,
      color: asset.color,
      qty: asset.qty,
      unitPrice: asset.unitPrice,
      remark: asset.remark
    });
    setEditingId(asset.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this asset?')) {
      await db.deleteAsset(id);
      setAssets(assets.filter(a => a.id !== id));
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.make.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  // Calculated total for form display
  const formTotal = formData.qty * formData.unitPrice;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Monitor className="text-blue-600" /> Asset Management
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Add Asset
        </button>
      </div>

      {dbError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                    <h3 className="font-bold text-red-800">Configuration Required</h3>
                    <p className="text-sm text-red-700 mt-1">{dbError.message}</p>
                    
                    {dbError.sql && (
                        <div className="mt-3 bg-gray-900 rounded-lg p-3 overflow-hidden">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-gray-400 flex items-center gap-1"><Terminal size={12}/> SQL Fix</span>
                                <button 
                                onClick={() => navigator.clipboard.writeText(dbError.sql!)}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    <Copy size={12} /> Copy
                                </button>
                            </div>
                            <code className="text-xs font-mono text-green-400 block break-all">
                                {dbError.sql}
                            </code>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search item, make, type or serial..." 
          className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Item</th>
                <th className="p-4 font-semibold text-gray-600">Make / Type</th>
                <th className="p-4 font-semibold text-gray-600">Serial No.</th>
                <th className="p-4 font-semibold text-gray-600">Color</th>
                <th className="p-4 font-semibold text-gray-600">Qty</th>
                <th className="p-4 font-semibold text-gray-600">Unit Price</th>
                <th className="p-4 font-semibold text-gray-600">Total</th>
                <th className="p-4 font-semibold text-gray-600">Remark</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{asset.item}</td>
                  <td className="p-4 text-gray-600">
                    <div className="flex flex-col">
                        <span>{asset.make}</span>
                        <span className="text-xs text-gray-400">{asset.type}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 font-mono text-xs">{asset.serialNumber || '-'}</td>
                  <td className="p-4 text-gray-600">{asset.color || '-'}</td>
                  <td className="p-4 text-gray-600">{asset.qty}</td>
                  <td className="p-4 text-gray-600">{formatCurrency(asset.unitPrice)}</td>
                  <td className="p-4 text-gray-800 font-bold">{formatCurrency(asset.total)}</td>
                  <td className="p-4 text-gray-500 text-xs max-w-[150px] truncate" title={asset.remark}>{asset.remark || '-'}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => handleEdit(asset)} className="text-blue-400 hover:text-blue-600">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(asset.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    {assets.length === 0 ? "No assets recorded." : "No assets match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Asset' : 'New Asset'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input required type="text" className="w-full border rounded-lg p-2" 
                  placeholder="e.g. Laptop, Generator"
                  value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make / Brand</label>
                  <input type="text" className="w-full border rounded-lg p-2" 
                    placeholder="e.g. Dell, Honda"
                    value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type / Model</label>
                  <input type="text" className="w-full border rounded-lg p-2" 
                    placeholder="e.g. XPS 15"
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input type="text" className="w-full border rounded-lg p-2" 
                    value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input type="text" className="w-full border rounded-lg p-2" 
                    value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={formData.qty} onChange={e => setFormData({...formData, qty: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input required type="number" min="0" className="w-full border rounded-lg p-2" 
                    value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total Value:</span>
                  <span className="text-lg font-bold text-gray-800">{formatCurrency(formTotal)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                <textarea className="w-full border rounded-lg p-2" rows={3}
                  placeholder="Additional notes..."
                  value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 mt-2">
                {editingId ? 'Update Asset' : 'Save Asset'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
