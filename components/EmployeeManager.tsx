
import React, { useState, useMemo, useEffect } from 'react';
import { db, STORAGE_FIX_SQL } from '../services/db';
import { Employee, Bank } from '../types';
import { UserPlus, Trash2, Plus, Mail, Phone, Briefcase, Calendar, CreditCard, Pencil, Search, X, Upload, Loader2, Image as ImageIcon, AlertCircle, Link as LinkIcon, Copy } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const EmployeeManager: React.FC = () => {
  const { formatCurrency } = useSettings();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  useEffect(() => {
    db.getEmployees().then(setEmployees);
    db.getBanks().then(setBanks);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload State
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [useUrlInput, setUseUrlInput] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    photo: '',
    phone: '',
    email: '',
    salary: 0,
    bankAccountNo: '',
    bankId: '',
    dateEmployed: new Date().toISOString().split('T')[0],
    dateDisengaged: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        await db.updateEmployee(editingId, formData);
        setEmployees(employees.map(e => e.id === editingId ? { ...e, ...formData } : e));
    } else {
        const added = await db.addEmployee(formData);
        setEmployees([...employees, added]);
    }
    
    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
      setFormData({
        name: '', position: '', photo: '', phone: '', email: '', salary: 0, 
        bankAccountNo: '', bankId: '', dateEmployed: new Date().toISOString().split('T')[0], dateDisengaged: ''
      });
      setPreviewUrl(null);
      setUploadError(null);
      setEditingId(null);
      setUseUrlInput(false);
  };

  const handleEdit = (emp: Employee) => {
      setFormData({
          name: emp.name,
          position: emp.position,
          photo: emp.photo,
          phone: emp.phone,
          email: emp.email,
          salary: emp.salary,
          bankAccountNo: emp.bankAccountNo,
          bankId: emp.bankId,
          dateEmployed: emp.dateEmployed,
          dateDisengaged: emp.dateDisengaged || ''
      });
      setPreviewUrl(emp.photo || null);
      setUploadError(null);
      setEditingId(emp.id);
      setUseUrlInput(!!emp.photo && !emp.photo.includes('supabase'));
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this employee record?')) {
      await db.deleteEmployee(id);
      setEmployees(employees.filter(e => e.id !== id));
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];

      setUploading(true);
      setUploadError(null);
      
      // Immediate local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      try {
          const url = await db.uploadImage(file);
          setFormData(prev => ({ ...prev, photo: url }));
      } catch (err: any) {
          const isBucketError = err.message.includes('bucket not found') || err.message.includes('storage bucket');
          const isRlsError = err.message.includes('Permission Denied') || err.message.includes('RLS') || err.message.includes('security policy');
          
          if (isBucketError) {
              setUploadError('Upload storage not configured. Switched to manual URL mode.');
          } else if (isRlsError) {
              setUploadError('Storage permission denied (RLS). Switched to manual URL mode.');
          } else {
              console.error("Upload failed", err); // Only log unexpected
              setUploadError(err.message || "Upload failed");
          }
          setUseUrlInput(true); // Auto-switch to URL input
      } finally {
          setUploading(false);
          e.target.value = ''; // Reset input
      }
  };

  const getBankName = (id: string) => banks.find(b => b.id === id)?.name || 'Unknown Bank';

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <UserPlus className="text-indigo-600" /> Employees
        </h2>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
        >
          <Plus size={20} /> Add Employee
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search name, position, email..." 
          className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
        {filteredEmployees.map(emp => (
          <div key={emp.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => handleEdit(emp)}
                    className="text-gray-300 hover:text-blue-500"
                >
                    <Pencil size={18} />
                </button>
                <button 
                onClick={() => handleDelete(emp.id)}
                className="text-gray-300 hover:text-red-500"
                >
                <Trash2 size={18} />
                </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                {emp.photo ? (
                  <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                ) : (
                  <UserPlus className="text-gray-400" size={32} />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{emp.name}</h3>
                <p className="text-sm text-indigo-600 font-medium flex items-center gap-1">
                  <Briefcase size={14} /> {emp.position}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                <a href={`mailto:${emp.email}`} className="hover:text-indigo-600">{emp.email}</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                <span>{emp.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span>Joined: {emp.dateEmployed}</span>
              </div>
              {emp.dateDisengaged && (
                <div className="flex items-center gap-2 text-red-500">
                  <Calendar size={16} />
                  <span>Left: {emp.dateDisengaged}</span>
                </div>
              )}
              
              <div className="border-t pt-2 mt-3">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-gray-500">Salary:</span>
                   <span className="font-semibold text-gray-800">{formatCurrency(emp.salary)}</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                   <CreditCard size={14} />
                   <span>{getBankName(emp.bankId)} •••• {emp.bankAccountNo.slice(-4)}</span>
                 </div>
              </div>
            </div>
          </div>
        ))}
        {filteredEmployees.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p>{employees.length === 0 ? "No employees added yet." : "No employees match your search."}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Employee' : 'New Employee'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Photo Upload Section */}
              <div className="space-y-2">
                   <div className="flex justify-between items-center">
                       <label className="block text-sm font-medium text-gray-700">Employee Photo</label>
                        <button 
                        type="button"
                        onClick={() => setUseUrlInput(!useUrlInput)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                       >
                           {useUrlInput ? <Upload size={12} /> : <LinkIcon size={12} />}
                           {useUrlInput ? 'Switch to Upload' : 'Enter URL manually'}
                       </button>
                   </div>

                   {useUrlInput ? (
                       <div className="space-y-2">
                            <input 
                                type="url" 
                                className="w-full border rounded-lg p-2"
                                placeholder="https://example.com/photo.jpg"
                                value={formData.photo} 
                                onChange={e => {
                                    setFormData({...formData, photo: e.target.value});
                                    setPreviewUrl(e.target.value);
                                }} 
                            />
                            {uploadError && (
                                <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle size={14} className="flex-shrink-0" /> 
                                        <span className="font-semibold">Upload Failed</span>
                                    </div>
                                    <p className="mb-2">{uploadError}</p>
                                    
                                    {(uploadError.includes('RLS') || uploadError.includes('configured')) && (
                                        <button 
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(STORAGE_FIX_SQL)}
                                            className="text-xs bg-white border border-amber-300 px-2 py-1 rounded shadow-sm hover:bg-amber-50 flex items-center gap-1 text-amber-800"
                                        >
                                            <Copy size={12} /> Copy SQL Fix
                                        </button>
                                    )}
                                </div>
                            )}
                       </div>
                   ) : (
                       <div className="flex items-start gap-4">
                           <div className="relative group w-32 h-32 bg-gray-50 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-indigo-500 transition-colors flex-shrink-0 bg-white">
                               {previewUrl || formData.photo ? (
                                   <img src={previewUrl || formData.photo} alt="Preview" className="w-full h-full object-cover" />
                               ) : (
                                   <div className="flex flex-col items-center text-gray-400">
                                       <ImageIcon size={32} className="mb-2" />
                                       <span className="text-xs">No Photo</span>
                                   </div>
                               )}
                               
                               {uploading && (
                                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-full">
                                       <Loader2 size={24} className="text-white animate-spin" />
                                   </div>
                               )}

                               <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white font-medium rounded-full">
                                   <Upload size={24} className="mb-1" />
                                   <span className="text-xs">{formData.photo || previewUrl ? 'Change' : 'Upload'}</span>
                                   <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                </label>
                           </div>
                           
                           <div className="flex-1 space-y-3 pt-2">
                               <div className="text-xs text-gray-500">
                                   <p className="font-medium text-gray-700 mb-1">Requirements</p>
                                   <p>Professional headshot.</p>
                                   <p>Max size: 1MB.</p>
                               </div>
                               {(previewUrl || formData.photo) && (
                                   <button 
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, photo: '' }));
                                        setPreviewUrl(null);
                                        setUploadError(null);
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 border border-red-200 px-2 py-1 rounded bg-red-50"
                                   >
                                       <X size={14} /> Remove Photo
                                   </button>
                               )}
                           </div>
                       </div>
                   )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                   <input required type="text" className="w-full border rounded-lg p-2"
                     value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Position / Role</label>
                   <input required type="text" className="w-full border rounded-lg p-2"
                     value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                   <input required type="email" className="w-full border rounded-lg p-2"
                     value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                   <input required type="tel" className="w-full border rounded-lg p-2"
                     value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                   <input required type="number" min="0" className="w-full border rounded-lg p-2"
                     value={formData.salary} onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})} />
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                   <select required className="w-full border rounded-lg p-2"
                     value={formData.bankId} onChange={e => setFormData({...formData, bankId: e.target.value})}>
                     <option value="">Select Bank</option>
                     {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </select>
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                   <input required type="text" className="w-full border rounded-lg p-2"
                     value={formData.bankAccountNo} onChange={e => setFormData({...formData, bankAccountNo: e.target.value})} />
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Date Employed</label>
                   <input required type="date" className="w-full border rounded-lg p-2"
                     value={formData.dateEmployed} onChange={e => setFormData({...formData, dateEmployed: e.target.value})} />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Date Disengaged (Optional)</label>
                   <input type="date" className="w-full border rounded-lg p-2"
                     value={formData.dateDisengaged} onChange={e => setFormData({...formData, dateDisengaged: e.target.value})} />
                </div>
              </div>

              <button type="submit" disabled={uploading} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 mt-2 disabled:opacity-50">
                {editingId ? 'Update Employee' : 'Save Employee'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
