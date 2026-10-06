import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AccentPreset {
  id: string;
  name: string;
  color: string;
  secondary: string;
  gradientEnd: string;
  glow: string;
  subtle: string;
  border: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'blue',
    name: 'Electric Blue',
    color: '#1677FF',
    secondary: '#38A7FF',
    gradientEnd: '#5B5CFF',
    glow: 'rgba(22, 119, 255, 0.45)',
    subtle: 'rgba(22, 119, 255, 0.18)',
    border: 'rgba(55, 140, 255, 0.45)',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    color: '#8B5CF6',
    secondary: '#A78BFA',
    gradientEnd: '#6D28D9',
    glow: 'rgba(139, 92, 246, 0.45)',
    subtle: 'rgba(139, 92, 246, 0.18)',
    border: 'rgba(139, 92, 246, 0.45)',
  },
  {
    id: 'orange',
    name: 'Bright Orange',
    color: '#FF6A21',
    secondary: '#FF9A50',
    gradientEnd: '#EA580C',
    glow: 'rgba(255, 106, 33, 0.45)',
    subtle: 'rgba(255, 106, 33, 0.18)',
    border: 'rgba(255, 106, 33, 0.45)',
  },
  {
    id: 'cyan',
    name: 'Cyan Glow',
    color: '#06B6D4',
    secondary: '#22D3EE',
    gradientEnd: '#0284C7',
    glow: 'rgba(6, 182, 212, 0.45)',
    subtle: 'rgba(6, 182, 212, 0.18)',
    border: 'rgba(6, 182, 212, 0.45)',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    color: '#10B981',
    secondary: '#34D399',
    gradientEnd: '#059669',
    glow: 'rgba(16, 185, 129, 0.45)',
    subtle: 'rgba(16, 185, 129, 0.18)',
    border: 'rgba(16, 185, 129, 0.45)',
  },
  {
    id: 'crimson',
    name: 'Crimson Rose',
    color: '#F43F5E',
    secondary: '#FB7185',
    gradientEnd: '#BE123C',
    glow: 'rgba(244, 63, 94, 0.45)',
    subtle: 'rgba(244, 63, 94, 0.18)',
    border: 'rgba(244, 63, 94, 0.45)',
  },
];

interface ThemeContextType {
  darkMode: boolean;
  accentColor: string;
  currentPreset: AccentPreset;
  presets: AccentPreset[];
  setDarkMode: (dark: boolean) => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: true,
  accentColor: '#1677FF',
  currentPreset: ACCENT_PRESETS[0],
  presets: ACCENT_PRESETS,
  setDarkMode: () => {},
  setAccentColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '22, 119, 255';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('gasc_theme');
      return stored !== 'light'; // default dark
    } catch {
      return true;
    }
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('gasc_accent_color');
      if (stored) {
        // match either hex or preset id or default
        const match = ACCENT_PRESETS.find(p => p.color.toLowerCase() === stored.toLowerCase() || p.id === stored);
        if (match) return match.color;
        // handle legacy #6C4CFF
        if (stored.toLowerCase() === '#6c4cff') return '#8B5CF6';
        return stored;
      }
    } catch {
      /* ignore */
    }
    return '#1677FF';
  });

  const currentPreset = ACCENT_PRESETS.find(
    p => p.color.toLowerCase() === accentColor.toLowerCase()
  ) || {
    id: 'custom',
    name: 'Custom Accent',
    color: accentColor,
    secondary: accentColor,
    gradientEnd: accentColor,
    glow: `rgba(${hexToRgb(accentColor)}, 0.45)`,
    subtle: `rgba(${hexToRgb(accentColor)}, 0.18)`,
    border: `rgba(${hexToRgb(accentColor)}, 0.45)`,
  };

  const applyThemeToDOM = (isDark: boolean, preset: AccentPreset) => {
    const root = document.documentElement;
    const body = document.body;

    // 1. Data-theme attribute
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      body.classList.remove('theme-light');
      body.classList.add('theme-dark');
    } else {
      body.classList.remove('theme-dark');
      body.classList.add('theme-light');
    }

    // 2. Set dynamic CSS variables for Accent
    root.style.setProperty('--accent-primary', preset.color);
    root.style.setProperty('--accent-secondary', preset.secondary);
    root.style.setProperty('--accent-gradient-end', preset.gradientEnd);
    root.style.setProperty('--accent-glow', preset.glow);
    root.style.setProperty('--accent-subtle', preset.subtle);
    root.style.setProperty('--accent-border', preset.border);
    root.style.setProperty(
      '--accent-gradient',
      `linear-gradient(135deg, ${preset.color} 0%, ${preset.gradientEnd} 100%)`
    );
    root.style.setProperty('--accent-text', preset.secondary);
    root.style.setProperty('--accent-rgb', hexToRgb(preset.color));
  };

  useEffect(() => {
    applyThemeToDOM(darkMode, currentPreset);
  }, [darkMode, accentColor]);

  const setDarkMode = (dark: boolean) => {
    setDarkModeState(dark);
    try {
      localStorage.setItem('gasc_theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    applyThemeToDOM(dark, currentPreset);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    try {
      localStorage.setItem('gasc_accent_color', color);
    } catch {
      /* ignore */
    }
    const matched = ACCENT_PRESETS.find(
      p => p.color.toLowerCase() === color.toLowerCase()
    ) || {
      id: 'custom',
      name: 'Custom',
      color,
      secondary: color,
      gradientEnd: color,
      glow: `rgba(${hexToRgb(color)}, 0.45)`,
      subtle: `rgba(${hexToRgb(color)}, 0.18)`,
      border: `rgba(${hexToRgb(color)}, 0.45)`,
    };
    applyThemeToDOM(darkMode, matched);
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        accentColor,
        currentPreset,
        presets: ACCENT_PRESETS,
        setDarkMode,
        setAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
