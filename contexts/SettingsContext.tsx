
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db';
import { OrganizationSettings } from '../types';

type Theme = 'light' | 'dark' | 'system';
export type ColorTheme = 'blue' | 'emerald' | 'violet' | 'rose' | 'amber' | 'cyan';

interface SettingsContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  formatCurrency: (amount: number) => string;
  settings: OrganizationSettings | null;
  updateSettings: (settings: OrganizationSettings) => void;
  isConfigured: boolean;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Tailwind RGB values for the primary palette of each theme
const COLOR_PALETTES: Record<ColorTheme, Record<number, string>> = {
  blue: {
    50: '239 246 255',
    100: '219 234 254',
    200: '191 219 254',
    300: '147 197 253',
    400: '96 165 250',
    500: '59 130 246',
    600: '37 99 235',
    700: '29 78 216',
    800: '30 64 175',
    900: '30 58 138',
  },
  emerald: {
    50: '236 253 245',
    100: '209 250 229',
    200: '167 243 208',
    300: '110 231 183',
    400: '52 211 153',
    500: '16 185 129',
    600: '5 150 105',
    700: '4 120 87',
    800: '6 95 70',
    900: '6 78 59',
  },
  violet: {
    50: '245 243 255',
    100: '237 233 254',
    200: '221 214 254',
    300: '196 181 253',
    400: '167 139 250',
    500: '139 92 246',
    600: '124 58 237',
    700: '109 40 217',
    800: '91 33 182',
    900: '76 29 149',
  },
  rose: {
    50: '255 241 242',
    100: '255 228 230',
    200: '254 205 211',
    300: '253 164 175',
    400: '251 113 133',
    500: '244 63 94',
    600: '225 29 72',
    700: '190 18 60',
    800: '159 18 57',
    900: '136 19 55',
  },
  amber: {
    50: '255 251 235',
    100: '254 243 199',
    200: '253 230 138',
    300: '252 211 77',
    400: '251 191 36',
    500: '245 158 11',
    600: '217 119 6',
    700: '180 83 9',
    800: '146 64 14',
    900: '120 53 15',
  },
  cyan: {
    50: '236 254 255',
    100: '207 250 254',
    200: '165 243 252',
    300: '103 232 249',
    400: '34 211 238',
    500: '6 182 212',
    600: '8 145 178',
    700: '14 116 144',
    800: '21 94 117',
    900: '22 78 99',
  }
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [currency, setCurrency] = useState('₦');
  const [theme, setTheme] = useState<Theme>('light');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await db.getOrganizationSettings();
        if (data && data.companyName) {
          setSettings(data);
          setCurrency(data.baseCurrency || '₦');
          setTheme((data.defaultTheme as Theme) || 'light');
          setColorTheme((data.defaultColorTheme as ColorTheme) || 'blue');
          setIsConfigured(true);
        } else {
          // Auto-seed default organization settings to bypass setup wizard
          const defaultSettings: OrganizationSettings = {
            id: 'default-org',
            companyName: 'Factori Industrial',
            companyAddress: '10 Industrial Way, Lagos, Nigeria',
            companyTin: '12345678-0001',
            companyLogo: '',
            taxName: 'VAT',
            taxRate: 7.5,
            baseCurrency: '₦',
            defaultTheme: 'light',
            defaultColorTheme: 'blue',
            dashboardConfig: {
              showProductionOutput: true,
              showInventoryValue: true,
              showLowStockAlert: true,
              showIncidents: true,
              showTotalSales: true,
              showPurchases: true,
              showPayrollCost: true,
              showNetProfit: true
            }
          };
          try {
            const saved = await db.saveOrganizationSettings(defaultSettings);
            setSettings(saved);
            setCurrency(saved.baseCurrency || '₦');
            setTheme((saved.defaultTheme as Theme) || 'light');
            setColorTheme((saved.defaultColorTheme as ColorTheme) || 'blue');
          } catch (err) {
            console.error("Failed to persist default settings, falling back to local memory:", err);
            setSettings(defaultSettings);
            setCurrency('₦');
            setTheme('light');
            setColorTheme('blue');
          }
          setIsConfigured(true);
        }
      } catch (e) {
        console.error("Error loading settings", e);
        setIsConfigured(true); // Ensure user is not locked out
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Update CSS Variables for Theming
  useEffect(() => {
    const root = document.documentElement;
    const palette = COLOR_PALETTES[colorTheme];
    
    // Set CSS variables for primary color
    Object.entries(palette).forEach(([shade, value]) => {
      // Cast value to string to resolve TypeScript error where value is inferred as unknown
      root.style.setProperty(`--color-primary-${shade}`, value as string);
    });

    // Handle Light/Dark Mode
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, colorTheme]);

  const updateSettings = (newSettings: OrganizationSettings) => {
    setSettings(newSettings);
    setCurrency(newSettings.baseCurrency);
    setTheme(newSettings.defaultTheme as Theme);
    if (newSettings.defaultColorTheme) setColorTheme(newSettings.defaultColorTheme as ColorTheme);
    setIsConfigured(!!newSettings.companyName);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN', // Fallback
      currencyDisplay: 'narrowSymbol'
    }).format(amount).replace('₦', currency);
  };

  return (
    <SettingsContext.Provider value={{
      currency, setCurrency,
      theme, setTheme,
      colorTheme, setColorTheme,
      formatCurrency,
      settings, updateSettings,
      isConfigured, loading
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
