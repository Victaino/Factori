
import React, { useState, useEffect, useMemo } from 'react';
import { db, PRODUCTION_FIX_SQL } from '../services/db';
import { Production, Plant, Operator, Material, Product } from '../types';
import { Plus, Trash2, Clock, Calendar, Pencil, Search, Filter, X, AlertTriangle, Terminal, Copy } from 'lucide-react';

export const ProductionManager: React.FC = () => {
  const [data, setData] = useState<Production[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Error State
  const [error, setError] = useState<{message: string, sql?: string} | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterPlant, setFilterPlant] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productId: '',
    plantId: '',
    operatorId: '',
    materialsUsed: [{ materialId: '', inputTonnage: 0 }],
    outputTonnage: 0,
    outputUnit: 'Tons', // Default
    timeStart: '08:00',
    timeStop: '17:00',
    notes: ''
  });

  const refreshData = async () => {
    const [p, pl, op, mat, prod] = await Promise.all([
      db.getProduction(),
      db.getPlants(),
      db.getOperators(),
      db.getMaterials(),
      db.getProducts()
    ]);
    setData(p);
    setPlants(pl);
    setOperators(op);
    setMaterials(mat);
    setProducts(prod);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Calculate Duration
  const currentDuration = useMemo(() => {
    if (!formData.timeStart || !formData.timeStop) return 0;
    const [startH, startM] = formData.timeStart.split(':').map(Number);
    const [endH, endM] = formData.timeStop.split(':').map(Number);
    
    let diff = (endH + endM / 60) - (startH + startM / 60);
    if (diff < 0) diff += 24; // Handle overnight roughly
    return parseFloat(diff.toFixed(2));
  }, [formData.timeStart, formData.timeStop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
        if (editingId) {
            await db.updateProduction(editingId, { ...formData, duration: currentDuration });
        } else {
            await db.addProduction({ ...formData, duration: currentDuration });
        }
        setIsModalOpen(false);
        refreshData();
        resetForm();
    } catch (err: any) {
        console.error("Operation failed:", err);
        let msg = err.message || 'An error occurred';
        const lowerMsg = msg.toLowerCase();
        let sql = undefined;

        // Detect missing column for materialsUsed or outputUnit
        // Checks for terms like "Could not find the 'outputUnit' column" or "schema cache"
        if (
            (lowerMsg.includes('materialsused') || lowerMsg.includes('outputunit')) && 
            (lowerMsg.includes('column') || lowerMsg.includes('cache') || lowerMsg.includes('find'))
        ) {
            msg = "Database Update Required: Schema fields are missing. Please run the SQL Fix.";
            sql = PRODUCTION_FIX_SQL;
        }

        setError({ message: msg, sql });
    }
  };

  const resetForm = () => {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        productId: '',
        plantId: '',
        operatorId: '',
        materialsUsed: [{ materialId: '', inputTonnage: 0 }],
        outputTonnage: 0,
        outputUnit: 'Tons',
        timeStart: '08:00',
        timeStop: '17:00',
        notes: ''
      });
      setEditingId(null);
      setError(null);
  };

  const handleEdit = (prod: Production) => {
      setFormData({
          date: prod.date,
          productId: prod.productId,
          plantId: prod.plantId,
          operatorId: prod.operatorId,
          materialsUsed: Array.isArray(prod.materialsUsed) && prod.materialsUsed.length > 0
            ? prod.materialsUsed
            : [{ materialId: '', inputTonnage: 0 }],
          outputTonnage: prod.outputTonnage,
          outputUnit: prod.outputUnit || 'Tons',
          timeStart: prod.timeStart,
          timeStop: prod.timeStop,
          notes: prod.notes || ''
      });
      setEditingId(prod.id);
      setIsModalOpen(true);
      setError(null);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Delete this production record?')) {
      await db.deleteProduction(id);
      refreshData();
    }
  };

  // --- Dynamic Form Handlers for Materials ---
  const handleMaterialChange = (index: number, field: 'materialId' | 'inputTonnage', value: string | number) => {
    const updatedMaterials = [...formData.materialsUsed];
    const material = updatedMaterials[index];

    if (field === 'materialId') {
      material.materialId = value as string;
    } else if (field === 'inputTonnage') {
      material.inputTonnage = parseFloat(value as string) || 0;
    }
    
    setFormData(prev => ({ ...prev, materialsUsed: updatedMaterials }));
  };

  const addMaterialRow = () => {
    setFormData(prev => ({
      ...prev,
      materialsUsed: [...prev.materialsUsed, { materialId: '', inputTonnage: 0 }]
    }));
  };

  const removeMaterialRow = (index: number) => {
    if (formData.materialsUsed.length <= 1) return; // Must have at least one
    const updatedMaterials = formData.materialsUsed.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, materialsUsed: updatedMaterials }));
  };

  const getEntityName = (list: any[], id: string) => list.find(i => i.id === id)?.name || 'Unknown';

  // Filter Logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const plantName = getEntityName(plants, item.plantId).toLowerCase();
      const productName = getEntityName(products, item.productId).toLowerCase();
      const operatorName = getEntityName(operators, item.operatorId).toLowerCase();
      const materialNames = (item.materialsUsed || []).map(m => getEntityName(materials, m.materialId).toLowerCase()).join(' ');
      const notes = (item.notes || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || 
        plantName.includes(term) || 
        productName.includes(term) || 
        operatorName.includes(term) || 
        materialNames.includes(term) ||
        notes.includes(term);

      const matchesDate = !filterDate || item.date === filterDate;
      const matchesPlant = !filterPlant || item.plantId === filterPlant;
      const matchesProduct = !filterProduct || item.productId === filterProduct;

      return matchesSearch && matchesDate && matchesPlant && matchesProduct;
    });
  }, [data, searchTerm, filterDate, filterPlant, filterProduct, plants, products, operators, materials]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterPlant('');
    setFilterProduct('');
  };

  const outputUnits = ['Tons', 'Kg', 'Litres', 'Pieces', 'Bags', 'M3'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Filter className="text-blue-600" /> Production Log
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Record Production
        </button>
      </div>

       {/* Filter Toolbar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search logs..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500 text-sm"
          value={filterPlant}
          onChange={(e) => setFilterPlant(e.target.value)}
        >
          <option value="">All Plants</option>
          {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select 
          className="border rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-500 text-sm"
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
        >
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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

        {(searchTerm || filterDate || filterPlant || filterProduct) && (
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
                <th className="p-4 font-semibold text-gray-600">Plant</th>
                <th className="p-4 font-semibold text-gray-600">Operator</th>
                <th className="p-4 font-semibold text-gray-600">Materials Used</th>
                <th className="p-4 font-semibold text-gray-600">Product Output</th>
                <th className="p-4 font-semibold text-gray-600">Duration</th>
                <th className="p-4 font-semibold text-gray-600">Notes</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-800">{item.date}</td>
                  <td className="p-4 text-gray-600">{getEntityName(plants, item.plantId)}</td>
                  <td className="p-4 text-gray-600">{getEntityName(operators, item.operatorId)}</td>
                  <td className="p-4">
                    <ul className="space-y-1">
                      {(item.materialsUsed || []).map((mat, index) => (
                        <li key={index} className="text-xs">
                          <span className="font-medium text-gray-800">{getEntityName(materials, mat.materialId)}:</span>
                          <span className="text-gray-500 ml-1">{mat.inputTonnage} Tons</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                       <span className="text-gray-800 font-medium">{getEntityName(products, item.productId)}</span>
                       <span className="text-xs text-green-600">
                         Qty: {item.outputTonnage} {item.outputUnit || 'Tons'}
                       </span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{item.duration.toFixed(1)} hrs</td>
                  <td className="p-4 text-gray-500 text-xs max-w-xs truncate" title={item.notes}>{item.notes || '-'}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-600">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    {data.length === 0 ? "No production records found." : "No records match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Production Record' : 'New Production Record'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            {/* Error Banner */}
            {error && (
                <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h3 className="font-bold text-red-800">Operation Failed</h3>
                            <p className="text-sm text-red-700 mt-1">{error.message}</p>
                            
                            {error.sql && (
                                <div className="mt-3 bg-gray-900 rounded-lg p-3 overflow-hidden">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-gray-400 flex items-center gap-1"><Terminal size={12}/> SQL Fix</span>
                                        <button 
                                        onClick={() => navigator.clipboard.writeText(error.sql!)}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Copy size={12} /> Copy
                                        </button>
                                    </div>
                                    <code className="text-xs font-mono text-green-400 block break-all">
                                        {error.sql}
                                    </code>
                                </div>
                            )}
                            {error.sql && <p className="text-xs text-red-600 mt-2">Run this SQL in your Supabase Query Editor.</p>}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input required type="date" className="w-full border rounded-lg p-2" 
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
                  <select required className="w-full border rounded-lg p-2"
                    value={formData.plantId} onChange={e => setFormData({...formData, plantId: e.target.value})}>
                    <option value="">Select Plant</option>
                    {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <select required className="w-full border rounded-lg p-2"
                    value={formData.operatorId} onChange={e => setFormData({...formData, operatorId: e.target.value})}>
                    <option value="">Select Operator</option>
                    {operators.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Produced</label>
                  <select required className="w-full border rounded-lg p-2"
                    value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="col-span-2 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Materials Used</label>
                <div className="space-y-2">
                  {formData.materialsUsed.map((mat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select required className="flex-1 border rounded-lg p-2" value={mat.materialId} onChange={e => handleMaterialChange(index, 'materialId', e.target.value)}>
                        <option value="">Select Material</option>
                        {materials.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input required type="number" step="0.1" className="w-32 border rounded-lg p-2" placeholder="Tons" value={isNaN(mat.inputTonnage) ? '' : mat.inputTonnage} onChange={e => handleMaterialChange(index, 'inputTonnage', e.target.value)} />
                      <button type="button" onClick={() => removeMaterialRow(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg" disabled={formData.materialsUsed.length <= 1}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addMaterialRow} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2">
                  <Plus size={16} /> Add Another Material
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="col-span-2 flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Output Quantity</label>
                        <input required type="number" step="0.1" className="w-full border rounded-lg p-2"
                            value={isNaN(formData.outputTonnage) ? '' : formData.outputTonnage} onChange={e => setFormData({...formData, outputTonnage: parseFloat(e.target.value)})} />
                    </div>
                    <div className="w-1/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <select 
                            className="w-full border rounded-lg p-2"
                            value={formData.outputUnit}
                            onChange={e => setFormData({...formData, outputUnit: e.target.value})}
                        >
                            {outputUnits.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Start</label>
                  <input required type="time" className="w-full border rounded-lg p-2"
                    value={formData.timeStart} onChange={e => setFormData({...formData, timeStart: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Stop</label>
                  <input required type="time" className="w-full border rounded-lg p-2"
                    value={formData.timeStop} onChange={e => setFormData({...formData, timeStop: e.target.value})} />
                </div>
                 <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calculated Duration (Hours)</label>
                  <div className="w-full border rounded-lg p-2 bg-gray-50 text-gray-600 flex items-center gap-2">
                    <Clock size={16} />
                    <span>{currentDuration.toFixed(2)} hours</span>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Remarks</label>
                  <textarea 
                    className="w-full border rounded-lg p-2 h-20"
                    placeholder="Enter any additional details about the production run..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">
                  {editingId ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
