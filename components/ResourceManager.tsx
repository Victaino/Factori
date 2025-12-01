import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/db';
import { Plant, Operator } from '../types';
import { Trash2, Plus, Users, Factory, Pencil, Check, X, Search } from 'lucide-react';

export const ResourceManager: React.FC = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setPlants(await db.getPlants());
      setOperators(await db.getOperators());
    };
    fetchData();
  }, []);

  const [newPlant, setNewPlant] = useState('');
  const [newOperator, setNewOperator] = useState('');
  
  // Edit states
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  const [editPlantName, setEditPlantName] = useState('');
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);
  const [editOperatorName, setEditOperatorName] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlant) return;
    const added = await db.addPlant(newPlant);
    setPlants([...plants, added]);
    setNewPlant('');
  };

  const handleUpdatePlant = async (id: string) => {
    if (!editPlantName.trim()) return;
    await db.updatePlant(id, editPlantName);
    setPlants(plants.map(p => p.id === id ? { ...p, name: editPlantName } : p));
    setEditingPlantId(null);
  };

  const startEditPlant = (plant: Plant) => {
    setEditingPlantId(plant.id);
    setEditPlantName(plant.name);
  };

  const handleDeletePlant = async (id: string) => {
    if (confirm('Are you sure? This might affect production records.')) {
        await db.deletePlant(id);
        setPlants(plants.filter(p => p.id !== id));
    }
  };

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOperator) return;
    const added = await db.addOperator(newOperator);
    setOperators([...operators, added]);
    setNewOperator('');
  };

  const handleUpdateOperator = async (id: string) => {
     if (!editOperatorName.trim()) return;
    await db.updateOperator(id, editOperatorName);
    setOperators(operators.map(o => o.id === id ? { ...o, name: editOperatorName } : o));
    setEditingOperatorId(null);
  };

  const startEditOperator = (op: Operator) => {
    setEditingOperatorId(op.id);
    setEditOperatorName(op.name);
  };

  const handleDeleteOperator = async (id: string) => {
    if (confirm('Are you sure? This might affect production records.')) {
        await db.deleteOperator(id);
        setOperators(operators.filter(o => o.id !== id));
    }
  };

  const filteredPlants = useMemo(() => plants.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())), [plants, searchTerm]);
  const filteredOperators = useMemo(() => operators.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())), [operators, searchTerm]);

  return (
    <div className="space-y-6">
      
       {/* Search Bar */}
       <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search plants or operators..." 
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Plants Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-6">
            <Factory className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Plants</h2>
          </div>
          
          <form onSubmit={handleAddPlant} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPlant}
              onChange={e => setNewPlant(e.target.value)}
              placeholder="New Plant Name"
              className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus size={20} />
            </button>
          </form>

          <ul className="divide-y max-h-[400px] overflow-y-auto">
            {filteredPlants.map(plant => (
              <li key={plant.id} className="py-3 flex justify-between items-center group min-h-[50px]">
                {editingPlantId === plant.id ? (
                  <div className="flex-1 flex gap-2 items-center">
                      <input 
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          value={editPlantName}
                          onChange={e => setEditPlantName(e.target.value)}
                      />
                      <button onClick={() => handleUpdatePlant(plant.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16}/></button>
                      <button onClick={() => setEditingPlantId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                  </div>
                ) : (
                  <>
                      <span className="text-gray-700">{plant.name}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditPlant(plant)} className="text-blue-400 hover:text-blue-600">
                              <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDeletePlant(plant.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={18} />
                          </button>
                      </div>
                  </>
                )}
              </li>
            ))}
            {filteredPlants.length === 0 && <li className="py-4 text-center text-gray-500">No plants found.</li>}
          </ul>
        </div>

        {/* Operators Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-6">
            <Users className="text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">Operators</h2>
          </div>
          
          <form onSubmit={handleAddOperator} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newOperator}
              onChange={e => setNewOperator(e.target.value)}
              placeholder="New Operator Name"
              className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              <Plus size={20} />
            </button>
          </form>

          <ul className="divide-y max-h-[400px] overflow-y-auto">
            {filteredOperators.map(op => (
              <li key={op.id} className="py-3 flex justify-between items-center group min-h-[50px]">
                {editingOperatorId === op.id ? (
                   <div className="flex-1 flex gap-2 items-center">
                      <input 
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          value={editOperatorName}
                          onChange={e => setEditOperatorName(e.target.value)}
                      />
                      <button onClick={() => handleUpdateOperator(op.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16}/></button>
                      <button onClick={() => setEditingOperatorId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                  </div>
                ) : (
                  <>
                      <span className="text-gray-700">{op.name}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditOperator(op)} className="text-blue-400 hover:text-blue-600">
                              <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDeleteOperator(op.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={18} />
                          </button>
                      </div>
                  </>
                )}
              </li>
            ))}
            {filteredOperators.length === 0 && <li className="py-4 text-center text-gray-500">No operators found.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};