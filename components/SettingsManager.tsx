
import React, { useState, useEffect } from 'react';
import { useSettings, ColorTheme } from '../contexts/SettingsContext';
import { db, STORAGE_FIX_SQL } from '../services/db';
import { Moon, Sun, Monitor, Palette, Building, Save, CheckCircle, Upload, Image as ImageIcon, Loader2, Link as LinkIcon, X, AlertCircle, Copy, LayoutDashboard, Terminal, AlertTriangle } from 'lucide-react';
import { DashboardConfig } from '../types';

export const SettingsManager: React.FC = () => {
  const { 
    settings, updateSettings, 
    currency, setCurrency, 
    theme, setTheme, 
    colorTheme, setColorTheme 
  } = useSettings();

  const [activeTab, setActiveTab] = useState<'APPEARANCE' | 'ORGANIZATION' | 'DASHBOARD' | 'DATABASE'>('ORGANIZATION');
  const [dbStatus, setDbStatus] = useState<{ connected: boolean, type: string, error: string | null, host: string } | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  const checkDbStatus = async () => {
    setCheckingDb(true);
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn("Could not fetch DB status:", err);
    } finally {
      setCheckingDb(false);
    }
  };

  useEffect(() => {
    checkDbStatus();
  }, []);
  
  // Local state for org form
  const [orgForm, setOrgForm] = useState({
    companyName: '',
    companyAddress: '',
    companyTin: '',
    companyLogo: '',
    taxName: '',
    taxRate: 0
  });

  // Local state for dashboard config
  const [dashConfig, setDashConfig] = useState<DashboardConfig>({
    showProductionOutput: true,
    showInventoryValue: true,
    showLowStockAlert: true,
    showIncidents: true,
    showTotalSales: true,
    showPurchases: true,
    showPayrollCost: true,
    showNetProfit: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState<{message: string, sql?: string} | null>(null);
  
  // Upload State
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useUrlInput, setUseUrlInput] = useState(false);

  // Initialize local state from context
  useEffect(() => {
    if (settings) {
      setOrgForm({
        companyName: settings.companyName || '',
        companyAddress: settings.companyAddress || '',
        companyTin: settings.companyTin || '',
        companyLogo: settings.companyLogo || '',
        taxName: settings.taxName || 'VAT',
        taxRate: settings.taxRate || 0
      });
      setPreviewUrl(settings.companyLogo || null);
      setUseUrlInput(!!settings.companyLogo && !settings.companyLogo.includes('supabase'));

      if (settings.dashboardConfig) {
          setDashConfig(settings.dashboardConfig);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    setSaveError(null);

    try {
      const updatedSettings = {
        ...orgForm,
        baseCurrency: currency,
        defaultTheme: theme,
        defaultColorTheme: colorTheme,
        dashboardConfig: dashConfig
      };

      const saved = await db.saveOrganizationSettings(updatedSettings);
      updateSettings(saved);
      setSaveMessage('Settings saved successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      let errorMessage = err.message || "An unknown error occurred.";
      let sqlFix = "";

      // Detect missing column error logic
      if (errorMessage.includes("Could not find the") && errorMessage.includes("column")) {
          const match = errorMessage.match(/Could not find the '(.+?)' column/);
          const missingCol = match ? match[1] : 'unknown';
          
          errorMessage = `Database Schema Update Required: The column '${missingCol}' is missing.`;
          sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "${missingCol}" text;`;
          
          if (missingCol === 'dashboardConfig') sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "dashboardConfig" jsonb;`;
          if (missingCol === 'defaultColorTheme') sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "defaultColorTheme" text DEFAULT 'blue';`;
          if (missingCol === 'taxName') sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "taxName" text DEFAULT 'VAT';`;
          if (missingCol === 'taxRate') sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "taxRate" numeric DEFAULT 0;`;
      }

      setSaveError({ message: errorMessage, sql: sqlFix });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

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
              setUploadError(err.message);
          }
          
          setUseUrlInput(true);
      } finally {
          setUploadingLogo(false);
      }
  };

  const colorThemes: { id: ColorTheme; name: string; color: string }[] = [
    { id: 'blue', name: 'Ocean Blue', color: 'bg-blue-600' },
    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-600' },
    { id: 'violet', name: 'Violet', color: 'bg-violet-600' },
    { id: 'rose', name: 'Rose', color: 'bg-rose-600' },
    { id: 'amber', name: 'Amber', color: 'bg-amber-600' },
    { id: 'cyan', name: 'Cyan', color: 'bg-cyan-600' },
  ];

  const currencies = [
    { symbol: '₦', name: 'Naira (NGN)' },
    { symbol: '$', name: 'Dollar (USD)' },
    { symbol: '€', name: 'Euro (EUR)' },
    { symbol: '£', name: 'Pound (GBP)' },
    { symbol: '¥', name: 'Yen (JPY)' },
    { symbol: '₹', name: 'Rupee (INR)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Palette className="text-primary-600" /> System Settings
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('ORGANIZATION')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'ORGANIZATION' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Organization Profile
          </button>
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'DASHBOARD' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard Config
          </button>
          <button
            onClick={() => setActiveTab('APPEARANCE')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'APPEARANCE' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'DATABASE' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Database Connectivity
          </button>
        </div>

        <div className="p-6 md:p-8">
          {/* Organization Tab */}
          {activeTab === 'ORGANIZATION' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-500"
                  value={orgForm.companyName}
                  onChange={e => setOrgForm({ ...orgForm, companyName: e.target.value })}
                />
              </div>

              {/* Logo Upload */}
              <div>
                   <div className="flex justify-between items-center mb-2">
                       <label className="block text-sm font-medium text-gray-700">Company Logo</label>
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
                                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="https://example.com/logo.png"
                                value={orgForm.companyLogo} 
                                onChange={e => {
                                    setOrgForm({...orgForm, companyLogo: e.target.value});
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
                           <div className="relative group w-32 h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary-400 transition-colors bg-white">
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
                                   <span className="text-xs">{orgForm.companyLogo || previewUrl ? 'Change' : 'Upload'}</span>
                                   <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                               </label>
                           </div>
                           <div className="flex-1 space-y-2 py-1">
                               <div className="text-sm text-gray-500">
                                   <p>This logo will appear on the sidebar and invoice headers.</p>
                                   <p className="text-xs mt-1">Recommended: Square, max 1MB.</p>
                               </div>
                                {(previewUrl || orgForm.companyLogo) && (
                                   <button 
                                    type="button"
                                    onClick={() => {
                                        setOrgForm(prev => ({ ...prev, companyLogo: '' }));
                                        setPreviewUrl(null);
                                        setUploadError(null);
                                    }}
                                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 border border-red-200 px-2 py-1 rounded bg-red-50"
                                   >
                                       <X size={14} /> Remove Logo
                                   </button>
                               )}
                           </div>
                       </div>
                   )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                  <textarea
                    rows={3}
                    className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-500"
                    value={orgForm.companyAddress}
                    onChange={e => setOrgForm({ ...orgForm, companyAddress: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIN / Tax ID</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-500"
                    value={orgForm.companyTin}
                    onChange={e => setOrgForm({ ...orgForm, companyTin: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                  <h3 className="font-bold text-gray-800 mb-4">Financial Defaults</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
                          <select 
                            className="w-full border rounded-lg p-3 bg-white"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                          >
                              {currencies.map(c => (
                                  <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name}</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Name</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg p-3"
                            placeholder="e.g. VAT"
                            value={orgForm.taxName}
                            onChange={e => setOrgForm({ ...orgForm, taxName: e.target.value })}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Rate (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            className="w-full border rounded-lg p-3"
                            value={isNaN(orgForm.taxRate) ? '' : orgForm.taxRate}
                            onChange={e => setOrgForm({ ...orgForm, taxRate: parseFloat(e.target.value) })}
                          />
                      </div>
                  </div>
              </div>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-6 bg-blue-50 p-4 rounded-lg text-blue-800">
                  <LayoutDashboard />
                  <div>
                      <h3 className="font-bold">Customize Dashboard</h3>
                      <p className="text-sm">Toggle visibility of widgets on the main dashboard.</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(dashConfig).map(([key, value]) => (
                      <label key={key} className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <span className="font-medium text-gray-700 capitalize">
                              {key.replace('show', '').replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${value ? 'bg-green-500' : 'bg-gray-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${value ? 'translate-x-6' : 'translate-x-0'}`} />
                          </div>
                          <input 
                              type="checkbox" 
                              className="hidden"
                              checked={value}
                              onChange={() => setDashConfig(prev => ({ ...prev, [key]: !prev[key as keyof DashboardConfig] }))}
                          />
                      </label>
                  ))}
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'APPEARANCE' && (
            <div className="space-y-8 animate-fade-in">
              
              <section>
                <label className="block text-sm font-medium text-gray-700 mb-4">Color Theme</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {colorThemes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setColorTheme(c.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        colorTheme === c.id 
                          ? 'border-primary-600 bg-primary-50' 
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${c.color} shadow-sm ring-2 ring-white`}></div>
                      <span className="text-xs font-medium text-gray-600">{c.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="block text-sm font-medium text-gray-700 mb-4">Display Mode</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      theme === 'light' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Sun size={20} />
                    <span className="font-medium">Light Mode</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      theme === 'dark' ? 'border-primary-600 bg-slate-800 text-white' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Moon size={20} />
                    <span className="font-medium">Dark Mode</span>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      theme === 'system' ? 'border-primary-600 bg-gray-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Monitor size={20} />
                    <span className="font-medium">System Default</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'DATABASE' && (
            <div className="space-y-6 animate-fade-in text-gray-700">
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Terminal size={20} className="text-primary-600" /> Relational Database Diagnostics & Status
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Monitor and verify the active connection status of your relational PostgreSQL engine and the Firebase SQL Connect identity provider.
                </p>
              </div>

              {dbStatus ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PostgreSQL Storage Status Card */}
                    <div className={`border rounded-xl p-6 transition-all shadow-sm ${dbStatus.connected ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/30 border-amber-200'}`}>
                      <div className="flex items-center gap-3 border-b pb-3 mb-4">
                        <div className={`p-2 rounded-lg text-white ${dbStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          {dbStatus.connected ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">PostgreSQL (Cloud SQL)</h4>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block ${dbStatus.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {dbStatus.connected ? 'Active Connection' : 'Unreachable - Standby Fallback'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 font-semibold text-gray-500"><span>Target Host:</span><span className="col-span-2 font-mono text-gray-900 truncate">{dbStatus.host || 'N/A'}</span></div>
                        <div className="grid grid-cols-3 font-semibold text-gray-500"><span>Database Port:</span><span className="col-span-2 text-gray-900 font-mono">5432</span></div>
                        {dbStatus.error && (
                          <div className="mt-3 bg-red-50 text-red-700 p-2 rounded text-xxs font-mono overflow-auto max-h-16 border border-red-100">
                            Error: {dbStatus.error}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Firebase SQL Connect Instance Card */}
                    <div className={`border rounded-xl p-6 transition-all shadow-sm ${dbStatus.firebaseConfig ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/30 border-amber-200'}`}>
                      <div className="flex items-center gap-3 border-b pb-3 mb-4">
                        <div className={`p-2 rounded-lg text-white ${dbStatus.firebaseConfig ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                          {dbStatus.firebaseConfig ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">Firebase SQL Connect</h4>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block ${dbStatus.firebaseConfig ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                            {dbStatus.firebaseConfig ? 'Ready & Verified' : 'Standby Mode'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 font-semibold text-gray-500"><span>Project ID:</span><span className="col-span-2 font-mono text-gray-900 truncate">{dbStatus.firebaseConfig?.projectId || 'Not Configured'}</span></div>
                        <div className="grid grid-cols-3 font-semibold text-gray-500"><span>Auth Domain:</span><span className="col-span-2 text-gray-900 font-mono truncate">{dbStatus.firebaseConfig?.authDomain || 'N/A'}</span></div>
                        <div className="grid grid-cols-3 font-semibold text-gray-500"><span>Database core:</span><span className="col-span-2 text-gray-900 truncate">{dbStatus.firebaseConfig?.firestoreDatabaseId || 'N/A'}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Resilient Local Sync Notification */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-blue-800 flex items-start gap-3">
                    <Terminal size={20} className="text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-blue-900 text-sm">Resilient Embedded Storage Strategy</p>
                      <p className="text-xs leading-relaxed mt-1">
                        Your application operates an **offline-first developer storage engine**. Reads and writes will interact with your high-speed, secure **PostgreSQL Cloud SQL instance** whenever connected, but will automatically direct data writes to your isolated **local JSON sandbox** whenever database sockets are timed out or unreachable, guarding database speed and preventing loss of data.
                      </p>
                    </div>
                  </div>

                  {!dbStatus.connected && (
                    <div className="bg-white border rounded-xl p-6 space-y-4 shadow-sm">
                      <h4 className="font-bold text-gray-900 text-sm">How to authorize a public socket on your PostgreSQL DB:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600">
                        <li>Open the <strong>Google Cloud Console</strong> and find your SQL instances.</li>
                        <li>Select database instance <code className="bg-gray-100 px-1 py-0.5 rounded text-primary-700">factori</code>.</li>
                        <li>Go to <strong>Connections</strong> &rarr; under <strong>Authorized Networks</strong>, add <code className="bg-gray-100 px-1 py-0.5 rounded text-indigo-700">0.0.0.0/0</code> temporarily to authorize public preview socket access.</li>
                        <li>Click <strong>Save</strong> and wait a few moments for the setting changes to deploy on Google Cloud.</li>
                      </ol>
                    </div>
                  )}

                  {/* Test Connection Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={checkDbStatus}
                      disabled={checkingDb}
                      className="px-4 py-2 border rounded-lg text-sm font-semibold bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
                    >
                      {checkingDb ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-primary-600" /> Refreshing Status...
                        </>
                      ) : (
                        <>
                          <Terminal size={16} className="text-gray-500" /> Refresh Diagnostics
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-12">
                  <Loader2 size={32} className="animate-spin text-primary-600" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm">
            {saveMessage && (
              <span className="text-green-600 flex items-center gap-2 animate-fade-in">
                <CheckCircle size={16} /> {saveMessage}
              </span>
            )}
            {saveError && (
                <div className="text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 text-sm max-w-lg">
                    <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertTriangle size={14}/> Save Failed
                    </div>
                    <p className="mb-2">{saveError.message}</p>
                    {saveError.sql && (
                        <div className="flex items-center gap-2">
                            <code className="text-xs bg-red-100 px-2 py-1 rounded flex-1 truncate">{saveError.sql}</code>
                            <button 
                                onClick={() => navigator.clipboard.writeText(saveError.sql!)} 
                                className="text-xs bg-white border border-red-300 px-2 py-1 rounded hover:bg-red-50 flex items-center gap-1"
                            >
                                <Copy size={10} /> Fix
                            </button>
                        </div>
                    )}
                </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
