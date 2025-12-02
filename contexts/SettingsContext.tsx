
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
  },
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  
  // Local state for immediate UI feedback (backed by org settings when available)
  const [currency, setCurrency] = useState<string>('$');
  const [theme, setTheme] = useState<Theme>('system');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');

  // Load Organization Settings on Mount
  useEffect(() => {
    const loadSettings = async () => {
      const orgSettings = await db.getOrganizationSettings();
      if (orgSettings) {
        setSettings(orgSettings);
        setCurrency(orgSettings.baseCurrency || '$');
        setTheme((orgSettings.defaultTheme as Theme) || 'system');
        setColorTheme((orgSettings.defaultColorTheme as ColorTheme) || 'blue');
      } else {
        // Fallback to local storage if no org settings yet (e.g. before setup)
        setCurrency(localStorage.getItem('app_currency') || '$');
        setTheme((localStorage.getItem('app_theme') as Theme) || 'system');
        setColorTheme((localStorage.getItem('app_color_theme') as ColorTheme) || 'blue');
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const updateSettings = (newSettings: OrganizationSettings) => {
      if (!newSettings) {
          console.error("updateSettings called with null. Database insertion likely failed.");
          return;
      }
      setSettings(newSettings);
      setCurrency(newSettings.baseCurrency || '$');
      setTheme((newSettings.defaultTheme as Theme) || 'system');
      setColorTheme((newSettings.defaultColorTheme as ColorTheme) || 'blue');
  };

  // Persist local preferences (redundancy) and apply styles
  useEffect(() => {
    localStorage.setItem('app_currency', currency);
  }, [currency]);

  // Handle Light/Dark Theme changes
  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Handle Color Theme changes
  useEffect(() => {
    localStorage.setItem('app_color_theme', colorTheme);
    const root = window.document.documentElement;
    const palette = COLOR_PALETTES[colorTheme];

    if (palette) {
      Object.entries(palette).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value as string);
      });
    }
  }, [colorTheme]);

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <SettingsContext.Provider value={{ 
        currency, setCurrency, 
        theme, setTheme, 
        colorTheme, setColorTheme, 
        formatCurrency,
        settings,
        updateSettings,
        isConfigured: !!settings,
        loading
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
