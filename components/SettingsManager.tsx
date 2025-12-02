
import React, { useState, useEffect } from 'react';
import { useSettings, ColorTheme } from '../contexts/SettingsContext';
import { db, STORAGE_FIX_SQL } from '../services/db';
import { Settings, Moon, Sun, Monitor, Palette, Building, Save, CheckCircle, Upload, Image as ImageIcon, Loader2, Link as LinkIcon, X, AlertCircle, Copy } from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const { 
    settings, updateSettings, 
    currency, setCurrency, 
    theme, setTheme, 
    colorTheme, setColorTheme 
  } = useSettings();

  const [activeTab, setActiveTab] = useState<'APPEARANCE' | 'ORGANIZATION'>('ORGANIZATION');
  
  // Local state for org form
  const [orgForm, setOrgForm] = useState({
    companyName: '',
    companyAddress: '',
    companyTin: '',
    companyLogo: '',
    taxName: '',
    taxRate: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useUrlInput, setUseUrlInput] = useState(false);

  useEffect(() => {
    if (settings) {
      setOrgForm({
        companyName: settings.companyName,
        companyAddress: settings.companyAddress,
        companyTin: settings.companyTin,
        companyLogo: settings.companyLogo || '',
        taxName: settings.taxName || 'VAT',
        taxRate: settings.taxRate || 0
      });
      // Detect if current logo is likely an external URL (not from supabase storage) to flip toggle
      if (settings.companyLogo && !settings.companyLogo.includes('supabase')) {
          setUseUrlInput(true);
      }
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Immediate local preview
      setPreviewUrl(URL.createObjectURL(file));
      setUploadingLogo(true);
      setUploadError(null);

      try {
          const url = await db.uploadLogo(file);
          setOrgForm(prev => ({ ...prev, companyLogo: url }));
      } catch (err: any) {
          const isBucketError = err.message.includes('bucket not found') || err.message.includes('storage bucket');
          const isRlsError = err.message.includes('Permission Denied') || err.message.includes('RLS') || err.message.includes('security policy');
          
          if (isBucketError) {
              setUploadError('Upload storage not configured. Switched to manual URL mode.');
          } else if (isRlsError) {
              setUploadError('Storage permission denied (RLS). Switched to manual URL mode.');
          } else {
              console.error("Upload failed", err); // Only log unexpected
              setUploadError(err.message);
          }
          setPreviewUrl(null);
          setUseUrlInput(true); // Auto-switch to URL input
      } finally {
          setUploadingLogo(false);
      }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    
    const updated = {
        ...settings,
        ...orgForm,
        baseCurrency: currency,
        defaultTheme: theme,
        defaultColorTheme: colorTheme
    };

    const saved = await db.saveOrganizationSettings(updated);
    updateSettings(saved);
    
    setIsSaving(false);
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const currencies = [
    { symbol: '₦', name: 'Naira (NGN)' },
    { symbol: '$', name: 'Dollar (USD)' },
    { symbol: '€', name: 'Euro (EUR)' },
    { symbol: '£', name: 'Pound (GBP)' },
    { symbol: '¥', name: 'Yen (JPY)' },
    { symbol: '₹', name: 'Rupee (INR)' },
    { symbol: 'R', name: 'Rand (ZAR)' },
    { symbol: 'C$', name: 'CAD (CAD)' },
  ];

  const colorThemes: { id: ColorTheme; name: string; color: string }[] = [
    { id: 'blue', name: 'Ocean Blue', color: 'bg-blue-600' },
    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-600' },
    { id: 'violet', name: 'Violet', color: 'bg-violet-600' },
    { id: 'rose', name: 'Rose', color: 'bg-rose-600' },
    { id: 'amber', name: 'Amber', color: 'bg-amber-600' },
    { id: 'cyan', name: 'Cyan', color: 'bg-cyan-600' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
            onClick={() => setActiveTab('ORGANIZATION')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'ORGANIZATION' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
            Organization Profile
        </button>
        <button
            onClick={() => setActiveTab('APPEARANCE')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'APPEARANCE' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
        >
            Appearance & Currency
        </button>
      </div>

      {activeTab === 'ORGANIZATION' && (
          <form onSubmit={handleSaveOrg} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-6">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                    <Building size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Company Information</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Details used on invoices and reports</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Company Name */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                    <input type="text" className="w-full border rounded-lg p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white h-12"
                        value={orgForm.companyName} onChange={e => setOrgForm({...orgForm, companyName: e.target.value})} />
                </div>

                {/* Logo Upload */}
                <div className="col-span-2">
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Logo</label>
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
                                className="w-full border rounded-lg p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="https://example.com/logo.png"
                                value={orgForm.companyLogo} 
                                onChange={e => {
                                    setOrgForm({...orgForm, companyLogo: e.target.value});
                                    setPreviewUrl(e.target.value);
                                }} 
                            />
                            {uploadError && (
                                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle size={14} />
                                        <span>{uploadError}</span>
                                    </div>
                                    {(uploadError.includes('RLS') || uploadError.includes('configured')) && (
                                        <button 
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(STORAGE_FIX_SQL)}
                                            className="mt-1 text-xs bg-white border border-amber-300 px-2 py-1 rounded shadow-sm hover:bg-amber-50 flex items-center gap-1 text-amber-800 w-fit"
                                        >
                                            <Copy size={12} /> Copy SQL Fix
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                   ) : (
                        <div className="flex items-start gap-4">
                            <div className="relative group w-32 h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden dark:bg-slate-700 dark:border-slate-600 hover:border-primary-400 transition-colors bg-white">
                                {previewUrl || orgForm.companyLogo ? (
                                    <img src={previewUrl || orgForm.companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <ImageIcon size={32} className="mb-2" />
                                        <span className="text-xs">No Image</span>
                                    </div>
                                )}
                                {uploadingLogo && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                        <Loader2 size={24} className="text-white animate-spin" />
                                    </div>
                                )}
                                <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white font-medium rounded-xl">
                                    <Upload size={24} className="mb-1" />
                                    <span className="text-xs">Upload</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                </label>
                            </div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    <p>Upload your organization logo to appear on invoices and the dashboard.</p>
                                    <p className="text-xs mt-1">Recommended size: Square. Max size: 1MB.</p>
                                </div>
                                {(previewUrl || orgForm.companyLogo) && (
                                   <button 
                                    type="button"
                                    onClick={() => {
                                        setOrgForm(prev => ({ ...prev, companyLogo: '' }));
                                        setPreviewUrl(null);
                                        setUploadError(null);
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 border border-red-200 px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                                   >
                                       <X size={14} /> Remove Logo
                                   </button>
                               )}
                            </div>
                        </div>
                   )}
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <textarea rows={3} className="w-full border rounded-lg p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        value={orgForm.companyAddress} onChange={e => setOrgForm({...orgForm, companyAddress: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TIN / Tax ID</label>
                    <input type="text" className="w-full border rounded-lg p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        value={orgForm.companyTin} onChange={e => setOrgForm({...orgForm, companyTin: e.target.value})} />
                </div>
                 
                 <div className="col-span-2 border-t pt-6 dark:border-slate-700">
                    <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Default Tax Settings</h4>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Name (e.g. VAT)</label>
                            <input type="text" className="w-full border rounded-lg p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={orgForm.taxName} onChange={e => setOrgForm({...orgForm, taxName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Rate (%)</label>
                            <input type="number" step="0.01" className="w-full border rounded-lg p-3 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={orgForm.taxRate} onChange={e => setOrgForm({...orgForm, taxRate: parseFloat(e.target.value)})} />
                        </div>
                    </div>
                 </div>
             </div>

             <div className="flex items-center gap-4 pt-4">
                 <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2"
                 >
                    <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
                 </button>
                 {saveMessage && (
                     <span className="text-green-600 flex items-center gap-1 font-medium animate-fade-in">
                         <CheckCircle size={18} /> {saveMessage}
                     </span>
                 )}
             </div>
          </form>
      )}

      {activeTab === 'APPEARANCE' && (
        <div className="space-y-8">
            {/* Theme Settings */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <Monitor className="text-primary-600" size={24} /> Application Appearance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => setTheme('light')}
                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-4 transition-all ${
                    theme === 'light' 
                        ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                        : 'border-gray-100 hover:border-primary-300 dark:border-slate-700 dark:text-gray-400'
                    }`}
                >
                    <div className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm">
                    <Sun size={32} />
                    </div>
                    <span className="font-semibold text-lg">Light Mode</span>
                </button>
                
                <button
                    onClick={() => setTheme('dark')}
                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-4 transition-all ${
                    theme === 'dark' 
                        ? 'border-primary-600 bg-slate-800 text-primary-400 dark:bg-primary-900/30' 
                        : 'border-gray-100 hover:border-primary-300 dark:border-slate-700 dark:text-gray-400'
                    }`}
                >
                    <div className="p-3 bg-slate-900 text-white rounded-full shadow-sm">
                    <Moon size={32} />
                    </div>
                    <span className="font-semibold text-lg">Dark Mode</span>
                </button>

                <button
                    onClick={() => setTheme('system')}
                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-4 transition-all ${
                    theme === 'system' 
                        ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                        : 'border-gray-100 hover:border-primary-300 dark:border-slate-700 dark:text-gray-400'
                    }`}
                >
                    <div className="p-3 bg-gray-200 dark:bg-slate-700 rounded-full shadow-sm">
                    <Monitor size={32} className="text-gray-700 dark:text-gray-200" />
                    </div>
                    <span className="font-semibold text-lg">System Default</span>
                </button>
                </div>
            </div>

            {/* Color Theme Settings */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <Palette className="text-primary-600" size={24} /> Color Theme
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {colorThemes.map((c) => (
                    <button
                    key={c.id}
                    onClick={() => setColorTheme(c.id)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                        colorTheme === c.id
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-100 hover:border-gray-300 dark:border-slate-700'
                    }`}
                    >
                    <div className={`w-12 h-12 rounded-full ${c.color} shadow-sm ring-4 ${colorTheme === c.id ? 'ring-primary-200 dark:ring-primary-800' : 'ring-transparent'}`}></div>
                    <span className={`font-semibold ${colorTheme === c.id ? 'text-primary-700 dark:text-primary-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        {c.name}
                    </span>
                    </button>
                ))}
                </div>
            </div>

            {/* Currency Settings */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-2xl text-green-600 font-serif font-bold">$</span> Currency Preference
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {currencies.map((c) => (
                    <button
                    key={c.symbol}
                    onClick={() => setCurrency(c.symbol)}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                        currency === c.symbol
                        ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'border-gray-100 hover:border-green-300 dark:border-slate-700 dark:text-gray-400'
                    }`}
                    >
                    <span className="text-3xl font-bold">{c.symbol}</span>
                    <span className="text-sm font-medium">{c.name}</span>
                    </button>
                ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
