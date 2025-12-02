
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, Role } from '../types';
import { Shield, Plus, Trash2, Pencil, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const UserManager: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: '' 
  });

  const fetchData = async () => {
    setUsers(await db.getAppUsers());
    setRoles(await db.getRoles());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        // Only update password if provided
        const updates: any = { name: formData.name, role: formData.role };
        if (formData.password) updates.password = formData.password;
        
        await db.updateAppUser(editingId, updates);
    } else {
        if (!formData.password) {
            alert('Password is required for new users');
            return;
        }
        await db.addAppUser(formData);
    }
    
    setIsModalOpen(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
      // Default to first available role or empty
      setFormData({ name: '', username: '', password: '', role: roles[0]?.name || '' });
      setEditingId(null);
  };

  const handleEdit = (u: User) => {
      setFormData({
          name: u.name,
          username: u.username,
          password: '', // Don't show existing password
          role: u.role
      });
      setEditingId(u.id);
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (id === user?.id) {
        alert("You cannot delete your own account.");
        return;
    }
    if (confirm('Delete this user? They will no longer be able to log in.')) {
      await db.deleteAppUser(id);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="text-blue-600" /> User Management
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Name</th>
              <th className="p-4 font-semibold text-gray-600">Username</th>
              <th className="p-4 font-semibold text-gray-600">Role</th>
              <th className="p-4 font-semibold text-gray-600">Last Login</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{u.name}</td>
                <td className="p-4 text-gray-600">{u.username}</td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-gray-100 text-gray-700">
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-gray-500 text-xs">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleEdit(u)} className="text-blue-400 hover:text-blue-600">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit User' : 'New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input required type="text" className="w-full border rounded-lg p-2"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input required type="text" className="w-full border rounded-lg p-2"
                      value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingId ? 'New Password (leave blank to keep)' : 'Password'}
                </label>
                <input 
                    type="password" 
                    required={!editingId}
                    className="w-full border rounded-lg p-2"
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                    className="w-full border rounded-lg p-2 capitalize"
                    value={formData.role}
                    required
                    onChange={e => setFormData({...formData, role: e.target.value})}
                >
                    <option value="">Select Role</option>
                    {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 mt-2">
                {editingId ? 'Update User' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
