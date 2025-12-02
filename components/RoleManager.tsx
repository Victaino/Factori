
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Role } from '../types';
import { Key, Plus, Trash2, Pencil, CheckSquare, Square, X, Shield } from 'lucide-react';
import { getAllPermissions } from '../constants';

export const RoleManager: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  const availablePermissions = getAllPermissions();

  const fetchData = async () => {
    setRoles(await db.getRoles());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        await db.updateRole(editingId, formData);
    } else {
        await db.addRole(formData);
    }
    setIsModalOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
      setFormData({ name: '', description: '', permissions: [] });
      setEditingId(null);
  };

  const handleEdit = (r: Role) => {
      setFormData({
          name: r.name,
          description: r.description,
          permissions: r.permissions || []
      });
      setEditingId(r.id);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const roleToDelete = roles.find(r => r.id === id);
    if (roleToDelete?.name === 'admin') {
        alert("Cannot delete the system admin role.");
        return;
    }
    if (confirm('Delete this role? Users assigned to this role may lose access.')) {
      await db.deleteRole(id);
      fetchData();
    }
  };

  const togglePermission = (permId: string) => {
      setFormData(prev => {
          const perms = new Set(prev.permissions);
          if (perms.has(permId)) {
              perms.delete(permId);
          } else {
              perms.add(permId);
          }
          return { ...prev, permissions: Array.from(perms) };
      });
  };

  const handleSelectAll = () => {
      if (formData.permissions.length === availablePermissions.length) {
          setFormData(prev => ({ ...prev, permissions: [] }));
      } else {
          setFormData(prev => ({ ...prev, permissions: availablePermissions.map(p => p.id) }));
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Key className="text-blue-600" /> Access Control & Roles
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg capitalize">{role.name}</h3>
                        <p className="text-xs text-gray-500">{role.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <button onClick={() => handleEdit(role)} className="text-gray-300 hover:text-blue-500">
                        <Pencil size={18} />
                    </button>
                    {role.name !== 'admin' && (
                        <button onClick={() => handleDelete(role.id)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="border-t pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Privileges ({role.permissions?.length || 0})</p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {role.permissions?.map(p => (
                        <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded border">
                            {p.replace('_GROUP', '').replace('_', ' ')}
                        </span>
                    ))}
                </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Role' : 'Create New Role'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              <div className="p-6 space-y-4 border-b">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                        <input required type="text" className="w-full border rounded-lg p-2"
                        placeholder="e.g. Supervisor"
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input required type="text" className="w-full border rounded-lg p-2"
                        placeholder="e.g. Shift supervisor with production access"
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-gray-50 flex-1">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-700">Assign Privileges</h4>
                      <button type="button" onClick={handleSelectAll} className="text-sm text-blue-600 hover:underline">
                          {formData.permissions.length === availablePermissions.length ? 'Deselect All' : 'Select All'}
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {availablePermissions.map(perm => (
                          <label key={perm.id} className="flex items-start gap-2 p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                              <div className="mt-0.5 text-blue-600">
                                  {formData.permissions.includes(perm.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                              </div>
                              <input 
                                  type="checkbox" 
                                  className="hidden"
                                  checked={formData.permissions.includes(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                              />
                              <div>
                                  <p className="text-sm font-medium text-gray-800">{perm.label}</p>
                                  <p className="text-[10px] text-gray-500">{perm.group}</p>
                              </div>
                          </label>
                      ))}
                  </div>
              </div>

              <div className="p-6 border-t bg-white rounded-b-2xl">
                  <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
                    {editingId ? 'Update Role' : 'Create Role'}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
