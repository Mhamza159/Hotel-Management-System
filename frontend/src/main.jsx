import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getMuiTheme } from './config/muiTheme';
import { useThemeStore } from './stores/useThemeStore';
// Fonts app ke saath bundle hain (Google Fonts nahi) — desktop app internet ke baghair bhi sahi dikhe
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces/standard.css';
import '@fontsource-variable/fraunces/standard-italic.css';
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/playfair-display/wght-italic.css';
import App from './App';
import './index.css';

/**
 * ============================================================================
 * ROOT APPLICATION ENTRY POINT & DYNAMIC THEME PROVIDER
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh application ka main entry point hai:
 * 1. RootApp: Zustand ke `useThemeStore` se active theme ('light' ya 'dark') sunta hai
 *    aur dynamically Material UI ko `getMuiTheme(theme)` provide karta hai.
 * 2. CssBaseline: Material UI ka global CSS reset jo active theme ke colors se sync hota hai.
 * 3. BrowserRouter: Single-Page Application client routing ko enable karta hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Main React DOM rendering lifecycle. Synchronizes the root Material UI ThemeProvider
 * dynamically with the active reactive state from `useThemeStore`.
 */

// Dynamic Root Component to bind Zustand theme with MUI ThemeProvider
function RootApp() {
  const theme = useThemeStore((state) => state.theme);
  // Memoize MUI theme instance based on active mode
  const activeMuiTheme = useMemo(() => getMuiTheme(theme), [theme]);

  return (
    <ThemeProvider theme={activeMuiTheme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
