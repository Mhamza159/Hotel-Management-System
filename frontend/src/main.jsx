import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getMuiTheme } from './config/muiTheme';
import { useThemeStore } from './stores/useThemeStore';
import App from './App';
import './index.css';

/**
 * ============================================================================
 * ROOT APPLICATION ENTRY POINT & DYNAMIC THEME PROVIDER
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh application ka main entry point hai:
 * 1. QueryClientProvider: Server state caching (TanStack Query) ko host karta hai.
 * 2. RootApp: Zustand ke `useThemeStore` se active theme ('light' ya 'dark') sunta hai
 *    aur dynamically Material UI ko `getMuiTheme(theme)` provide karta hai.
 * 3. CssBaseline: Material UI ka global CSS reset jo active theme ke colors se sync hota hai.
 * 4. BrowserRouter: Single-Page Application client routing ko enable karta hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Main React DOM rendering lifecycle. Synchronizes the root Material UI ThemeProvider
 * dynamically with the active reactive state from `useThemeStore`.
 */

// Initialize TanStack React Query Client with conservative stale timings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 3, // 3 minutes stale cache
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <RootApp />
    </QueryClientProvider>
  </React.StrictMode>
);
