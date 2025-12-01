import React from 'react';
import { useSettings, ColorTheme } from '../contexts/SettingsContext';
import { Settings, Moon, Sun, Monitor, Palette } from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const { currency, setCurrency, theme, setTheme, colorTheme, setColorTheme } = useSettings();

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
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      
      {/* Theme Settings (Light/Dark) */}
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
            <span className="text-sm text-gray-500 text-center">Clean and bright look for daylight.</span>
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
            <span className="text-sm text-gray-500 text-center">Easy on the eyes for low light.</span>
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
            <span className="text-sm text-gray-500 text-center">Adapts to your device settings.</span>
          </button>
        </div>
      </div>

      {/* Color Theme Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Palette className="text-primary-600" size={24} /> Color Theme
        </h3>
        <p className="text-gray-500 mb-6 dark:text-gray-400">Choose a primary accent color for the interface.</p>
        
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
        <p className="text-gray-500 mb-6 dark:text-gray-400">Select the currency symbol to be used throughout the application.</p>
        
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
  );
};