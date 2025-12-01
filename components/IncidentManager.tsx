
import React, { useState, useMemo } from 'react';
import { db } from '../services/db';
import { IncidentReport, Production } from '../types';
import { AlertTriangle, Plus, Trash2, Pencil, Search, Calendar, X } from 'lucide-react';

export const IncidentManager: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentReport[]>(db.getIncidents());
  const [productions] = useState<Production[]>(db.getProduction());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const [form, setForm] = useState({
    productionId: '',
    description: '',
    remark: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        db.updateIncident(editingId, form);
        setIncidents(incidents.map(i => i.id === editingId ? { ...i, ...form } : i));
    } else {
        const added = db.addIncident(form);
        setIncidents([added, ...incidents]);
    }
    
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
      setForm({ productionId: '', description: '', remark: '', date: new Date().toISOString().split('T')[0] });
      setEditingId(null);
  };

  const handleEdit = (inc: IncidentReport) => {
      setForm({
          productionId: inc.productionId,
          description: inc.description,
          remark: inc.remark,
          date: inc.date
      });
      setEditingId(inc.id);
      setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this incident report?')) {
        db.deleteIncident(id);
        setIncidents(incidents.filter(i => i.id !== id));
    }
  };

  // Filter Logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term || 
        inc.description.toLowerCase().includes(term) || 
        inc.remark.toLowerCase().includes(term) ||
        inc.productionId.toLowerCase().includes(term);
      
      const matchesDate = !filterDate || inc.date === filterDate;
      
      return matchesSearch && matchesDate;
    });
  }, [incidents, searchTerm, filterDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <AlertTriangle className="text-red-500" /> Incident Reports
        </h2>
        <button 
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <Plus size={20} /> Report Incident
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search description, remark or production ID..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
            type="date" 
            className="border rounded-lg pl-10 pr-3 py-2 bg-white outline-none focus:border-red-500 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            />
        </div>

        {(searchTerm || filterDate) && (
          <button 
            onClick={clearFilters}
            className="text-gray-500 hover:text-red-500 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            <X size={16} /> Clear
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-red-100 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">{editingId ? 'Edit Incident Report' : 'New Incident Report'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input 
                type="date"
                required 
                className="w-full border rounded-lg p-2"
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Production Run</label>
              <select 
                required 
                className="w-full border rounded-lg p-2 bg-gray-50"
                value={form.productionId}
                onChange={e => setForm({...form, productionId: e.target.value})}
              >
                <option value="">Select Production ID</option>
                {productions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.date} - ID: {p.id} (Output: {p.outputTonnage}t)
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input 
                required 
                className="w-full border rounded-lg p-2"
                placeholder="What happened?"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remark / Resolution</label>
              <textarea 
                className="w-full border rounded-lg p-2 h-24"
                placeholder="How was it handled?"
                value={form.remark}
                onChange={e => setForm({...form, remark: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                {editingId ? 'Update Report' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredIncidents.map(inc => (
          <div key={inc.id} className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-red-500 border-gray-100 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-gray-800 text-lg">{inc.description}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{inc.date}</span>
              </div>
              <p className="text-gray-600 mb-2">{inc.remark}</p>
              <p className="text-xs text-gray-400">Ref: Production #{inc.productionId}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleEdit(inc)} className="text-gray-300 hover:text-blue-500">
                    <Pencil size={20} />
                </button>
                <button onClick={() => handleDelete(inc.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 size={20} />
                </button>
            </div>
          </div>
        ))}
        {filteredIncidents.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            {incidents.length === 0 ? "No incidents recorded. Safety is 100%!" : "No incidents match your search."}
          </div>
        )}
      </div>
    </div>
  );
};
