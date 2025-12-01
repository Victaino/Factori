
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Production, Plant, Operator, Material, Product } from '../types';
import { Plus, Trash2, Clock, Calendar, Pencil } from 'lucide-react';

export const ProductionManager: React.FC = () => {
  const [data, setData] = useState<Production[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productId: '',
    plantId: '',
    operatorId: '',
    materialId: '',
    inputTonnage: 0,
    outputTonnage: 0,
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
    if (editingId) {
        await db.updateProduction(editingId, { ...formData, duration: currentDuration });
    } else {
        await db.addProduction({ ...formData, duration: currentDuration });
    }
    setIsModalOpen(false);
    refreshData();
    resetForm();
  };

  const resetForm = () => {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        productId: '',
        plantId: '',
        operatorId: '',
        materialId: '',
        inputTonnage: 0,
        outputTonnage: 0,
        timeStart: '08:00',
        timeStop: '17:00',
        notes: ''
      });
      setEditingId(null);
  };

  const handleEdit = (prod: Production) => {
      setFormData({
          date: prod.date,
          productId: prod.productId,
          plantId: prod.plantId,
          operatorId: prod.operatorId,
          materialId: prod.materialId,
          inputTonnage: prod.inputTonnage,
          outputTonnage: prod.outputTonnage,
          timeStart: prod.timeStart,
          timeStop: prod.timeStop,
          notes: prod.notes || ''
      });
      setEditingId(prod.id);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Delete this production record?')) {
      await db.deleteProduction(id);
      refreshData();
    }
  };

  const getEntityName = (list: any[], id: string) => list.find(i => i.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Production Log</h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Record Production
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Date</th>
                <th className="p-4 font-semibold text-gray-600">Product</th>
                <th className="p-4 font-semibold text-gray-600">Plant</th>
                <th className="p-4 font-semibold text-gray-600">Operator</th>
                <th className="p-4 font-semibold text-gray-600">In/Out (Tons)</th>
                <th className="p-4 font-semibold text-gray-600">Duration</th>
                <th className="p-4 font-semibold text-gray-600">Notes</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-800">{item.date}</td>
                  <td className="p-4 text-gray-800">{getEntityName(products, item.productId)}</td>
                  <td className="p-4 text-gray-600">{getEntityName(plants, item.plantId)}</td>
                  <td className="p-4 text-gray-600">{getEntityName(operators, item.operatorId)}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">In: {item.inputTonnage}</span>
                      <span className="font-medium text-green-600">Out: {item.outputTonnage}</span>
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
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">No production records found.</td>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select required className="w-full border rounded-lg p-2"
                    value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Used</label>
                  <select required className="w-full border rounded-lg p-2"
                    value={formData.materialId} onChange={e => setFormData({...formData, materialId: e.target.value})}>
                    <option value="">Select Material</option>
                    {materials.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Tonnage</label>
                  <input required type="number" step="0.1" className="w-full border rounded-lg p-2"
                    value={formData.inputTonnage} onChange={e => setFormData({...formData, inputTonnage: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Tonnage</label>
                  <input required type="number" step="0.1" className="w-full border rounded-lg p-2"
                    value={formData.outputTonnage} onChange={e => setFormData({...formData, outputTonnage: parseFloat(e.target.value)})} />
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
                  {editingId ? 'Update Production Record' : 'Save Production Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
