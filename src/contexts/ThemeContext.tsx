import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

interface Colors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  placeholder: string;
  border: string;
  inputBackground: string;
  inputBorder: string;
  success: string;
  warning: string;
  error: string;
  card: string;
  notification: string;
  gradient: string[];
  shadowColor: string;
}

interface Theme {
  dark: boolean;
  colors: Colors;
}

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#059669',        // Emerald 600 - Main green
    primaryLight: '#10b981',   // Emerald 500 - Lighter green
    primaryDark: '#047857',    // Emerald 700 - Darker green
    secondary: '#0d9488',      // Teal 600 - Complementary green
    accent: '#84cc16',         // Lime 500 - Accent green
    background: '#f0fdf4',     // Green 50 - Very light green background
    surface: '#ffffff',        // Pure white for cards
    text: '#064e3b',          // Green 900 - Dark green text
    textSecondary: '#065f46',  // Green 800 - Secondary text
    placeholder: '#9ca3af',    // Gray 400 - Placeholder text
    border: '#bbf7d0',        // Green 200 - Light green borders
    inputBackground: '#f7fee7', // Lime 50 - Input background
    inputBorder: '#bbf7d0',   // Green 200 - Input borders
    success: '#16a34a',       // Green 600 - Success
    warning: '#ca8a04',       // Yellow 600 - Warning
    error: '#dc2626',         // Red 600 - Error
    card: '#ffffff',          // Pure white for elevated cards
    notification: '#dc2626',   // Red 600 - Error/notification
    gradient: ['#059669', '#0d9488'], // Green gradient
    shadowColor: '#059669',    // Green shadow
  }
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#10b981',        // Emerald 500 - Bright green for dark mode
    primaryLight: '#34d399',   // Emerald 400 - Lighter green
    primaryDark: '#059669',    // Emerald 600 - Darker green
    secondary: '#14b8a6',      // Teal 500 - Complementary green
    accent: '#a3e635',         // Lime 400 - Accent green
    background: '#0f172a',     // Slate 900 - Very dark background
    surface: '#1e293b',        // Slate 800 - Card surface
    text: '#f0fdf4',          // Green 50 - Light green text
    textSecondary: '#bbf7d0',  // Green 200 - Secondary text
    placeholder: '#6b7280',    // Gray 500 - Placeholder text
    border: '#374151',        // Gray 700 - Borders
    inputBackground: '#1e293b', // Slate 800 - Input background
    inputBorder: '#374151',   // Gray 700 - Input borders
    success: '#22c55e',       // Green 500 - Success
    warning: '#eab308',       // Yellow 500 - Warning
    error: '#ef4444',         // Red 500 - Error
    card: '#334155',          // Slate 700 - Elevated cards
    notification: '#ef4444',   // Red 500 - Error/notification
    gradient: ['#10b981', '#14b8a6'], // Green gradient
    shadowColor: '#10b981',    // Green shadow
  }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Get initial color scheme from system
    const colorScheme = Appearance.getColorScheme();
    setIsDark(colorScheme === 'dark');

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }: { colorScheme: ColorSchemeName }) => {
      setIsDark(colorScheme === 'dark');
    });

    return () => subscription?.remove();
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const setTheme = (dark: boolean) => {
    setIsDark(dark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  const contextValue: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};