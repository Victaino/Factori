
import React, { useState } from 'react';
import { db, STORAGE_FIX_SQL } from '../services/db';
import { useSettings, ColorTheme } from '../contexts/SettingsContext';
import { Settings, CheckCircle, ArrowRight, Building, Palette, Wallet, Loader2, Monitor, AlertTriangle, Copy, Terminal, User, Lock, Shield, Upload, Image as ImageIcon, Link as LinkIcon, X, AlertCircle } from 'lucide-react';

export const SetupScreen: React.FC = () => {
  const { updateSettings, setTheme, setColorTheme } = useSettings();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; sql?: string } | null>(null);
  
  // Upload State
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useUrlInput, setUseUrlInput] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyTin: '',
    companyLogo: '',
    taxName: 'VAT',
    taxRate: 7.5,
    baseCurrency: '₦',
    defaultTheme: 'light',
    defaultColorTheme: 'blue'
  });

  const [adminForm, setAdminForm] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Immediate local preview
      setPreviewUrl(URL.createObjectURL(file));
      setUploadingLogo(true);
      setUploadError(null);
      
      try {
          const url = await db.uploadLogo(file);
          setFormData(prev => ({ ...prev, companyLogo: url }));
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
          
          setPreviewUrl(null); // Revert preview if failed
          setUseUrlInput(true); // Auto-switch to URL input on failure
      } finally {
          setUploadingLogo(false);
      }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
        // 1. Save Organization Settings
        const saved = await db.saveOrganizationSettings(formData);
        
        // 2. Ensure Admin Role exists
        await db.seedAdminRole();

        // 3. Create Administrator Account
        if (adminForm.username && adminForm.password) {
            await db.addAppUser({
                name: adminForm.fullName || 'Administrator',
                username: adminForm.username,
                password: adminForm.password,
                role: 'admin'
            });
        }

        // 4. Update Context to trigger App render
        updateSettings(saved);
        
        // Note: The App component will verify 'isConfigured' is true and switch to LoginScreen.
        // The user will then log in with the account they just created.

    } catch (err: any) {
        console.error("Setup Error:", err);
        
        let errorMessage = err.message || "An unknown error occurred.";
        let sqlFix = "";

        // Detect missing column error (PostgREST code PGRST204 or text match)
        if (errorMessage.includes("Could not find the") && errorMessage.includes("column")) {
            const match = errorMessage.match(/Could not find the '(.+?)' column/);
            const missingCol = match ? match[1] : 'unknown';
            
            errorMessage = `Database Schema Mismatch: The column '${missingCol}' is missing from the 'organization_settings' table.`;
            sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "${missingCol}" text;`;
            
            // Specific defaults based on known columns
            if (missingCol === 'defaultColorTheme') sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "defaultColorTheme" text DEFAULT 'blue';`;
            if (missingCol === 'taxName') sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "taxName" text DEFAULT 'VAT';`;
            if (missingCol === 'taxRate') sqlFix = `ALTER TABLE "organization_settings" ADD COLUMN "taxRate" numeric DEFAULT 0;`;
        }

        setError({ message: errorMessage, sql: sqlFix });
    } finally {
        setLoading(false);
    }
  };

  const handleNext = () => {
      // Validation for Admin Step
      if (step === 2) {
          if (!adminForm.username || !adminForm.password) {
              alert("Username and Password are required.");
              return;
          }
          if (adminForm.password !== adminForm.confirmPassword) {
              alert("Passwords do not match.");
              return;
          }
      }
      setStep(step + 1);
  };
  
  const handleBack = () => setStep(step - 1);

  const currencies = [
    { symbol: '₦', name: 'Naira (NGN)' },
    { symbol: '$', name: 'Dollar (USD)' },
    { symbol: '€', name: 'Euro (EUR)' },
    { symbol: '£', name: 'Pound (GBP)' },
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary-600 p-8 text-white text-center flex-shrink-0">
          <div className="inline-flex p-3 bg-white/20 rounded-full mb-4">
            <Settings size={32} />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Factori</h1>
          <p className="text-blue-100">Let's set up your organization profile</p>
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-center gap-2 p-6 border-b flex-shrink-0">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full transition-colors ${step >= i ? 'bg-primary-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                          <h3 className="font-bold text-red-800">Setup Failed</h3>
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
                          <p className="text-xs text-red-600 mt-2">Run this SQL in your Supabase Query Editor to fix the database schema.</p>
                      </div>
                  </div>
              </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Building className="text-primary-600" /> Company Details
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Acme Manufacturing Ltd."
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                />
              </div>

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
                                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="https://example.com/logo.png"
                                value={formData.companyLogo} 
                                onChange={e => {
                                    setFormData({...formData, companyLogo: e.target.value});
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
                           <div className="relative group w-32 h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-primary-400 transition-colors bg-white">
                               {previewUrl || formData.companyLogo ? (
                                   <img src={previewUrl || formData.companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
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
                                   <span className="text-xs">{formData.companyLogo || previewUrl ? 'Change' : 'Upload'}</span>
                                   <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                               </label>
                           </div>
                           <div className="flex-1 space-y-2 py-1">
                               <div className="text-sm text-gray-500">
                                   <p>Upload your organization logo to appear on invoices and the dashboard.</p>
                                   <p className="text-xs mt-1">Recommended size: Square (e.g., 512x512px). Max size: 1MB.</p>
                               </div>
                                {(previewUrl || formData.companyLogo) && (
                                   <button 
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, companyLogo: '' }));
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea 
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                  rows={2}
                  placeholder="Headquarters address..."
                  value={formData.companyAddress}
                  onChange={e => setFormData({...formData, companyAddress: e.target.value})}
                />
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIN / Tax ID</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Tax Identification Number"
                    value={formData.companyTin}
                    onChange={e => setFormData({...formData, companyTin: e.target.value})}
                  />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="text-primary-600" /> Administrator Account
              </h2>
              <p className="text-sm text-gray-500">Create the primary account for managing the system.</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. John Doe"
                  value={adminForm.fullName}
                  onChange={e => setAdminForm({...adminForm, fullName: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        className="w-full border rounded-lg pl-10 pr-3 py-3 focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="admin_user"
                        value={adminForm.username}
                        onChange={e => setAdminForm({...adminForm, username: e.target.value})}
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            className="w-full border rounded-lg pl-10 pr-3 py-3 focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="••••••"
                            value={adminForm.password}
                            onChange={e => setAdminForm({...adminForm, password: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input 
                        type="password" 
                        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="••••••"
                        value={adminForm.confirmPassword}
                        onChange={e => setAdminForm({...adminForm, confirmPassword: e.target.value})}
                    />
                </div>
              </div>
              {adminForm.password && adminForm.confirmPassword && adminForm.password !== adminForm.confirmPassword && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="text-primary-600" /> Financial Settings
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Base Currency</label>
                <div className="grid grid-cols-4 gap-4">
                  {currencies.map(c => (
                    <button
                      key={c.symbol}
                      onClick={() => setFormData({...formData, baseCurrency: c.symbol})}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                        formData.baseCurrency === c.symbol
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl font-bold">{c.symbol}</span>
                      <span className="text-xs">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Name</label>
                  <input 
                    type="text" 
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. VAT"
                    value={formData.taxName}
                    onChange={e => setFormData({...formData, taxName: e.target.value})}
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Rate (%)</label>
                   <input 
                    type="number" 
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={isNaN(formData.taxRate) ? '' : formData.taxRate}
                    onChange={e => setFormData({...formData, taxRate: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Palette className="text-primary-600" /> App Appearance
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Theme Color</label>
                <div className="grid grid-cols-3 gap-3">
                  {colorThemes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setFormData({...formData, defaultColorTheme: c.id});
                        setColorTheme(c.id); // Preview immediately
                      }}
                      className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all ${
                        formData.defaultColorTheme === c.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full ${c.color}`}></div>
                      <span className="text-sm font-medium text-gray-700">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-3">Display Mode</label>
                 <div className="grid grid-cols-3 gap-4">
                    <button 
                      onClick={() => { setFormData({...formData, defaultTheme: 'light'}); setTheme('light'); }}
                      className={`p-4 border-2 rounded-xl font-medium transition-all ${formData.defaultTheme === 'light' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      Light Mode
                    </button>
                    <button 
                      onClick={() => { setFormData({...formData, defaultTheme: 'dark'}); setTheme('dark'); }}
                      className={`p-4 border-2 rounded-xl font-medium transition-all ${formData.defaultTheme === 'dark' ? 'border-primary-600 bg-slate-800 text-white' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      Dark Mode
                    </button>
                    <button 
                      onClick={() => { setFormData({...formData, defaultTheme: 'system'}); setTheme('system'); }}
                      className={`p-4 border-2 rounded-xl font-medium transition-all flex flex-col items-center justify-center gap-1 ${formData.defaultTheme === 'system' ? 'border-primary-600 bg-gray-100 text-gray-900' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <span>System</span>
                      <span className="text-xs font-normal text-gray-500">Default</span>
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-between flex-shrink-0">
          {step > 1 ? (
            <button onClick={handleBack} className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium">
              Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button 
              onClick={handleNext} 
              disabled={!formData.companyName && step === 1}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight size={18} />
            </button>
          ) : (
             <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center gap-2 shadow-lg shadow-green-200"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> Finish Setup</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
