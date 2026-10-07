import { createTheme } from '@mui/material/styles';

/**
 * ============================================================================
 * MATERIAL UI THEME CONFIGURATION (LIGHT & DARK MODES)
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh file Material UI v5 components (Tables, Dialogs, Cards, Buttons waghera)
 * ke visual styling aur color system ko define karti hai.
 * - darkTheme: Luxury hotel obsidian dark palette (#0A0F1A background, #131A26 paper, #3FD0C9 aqua)
 * - lightTheme: Ultra-clean, luminous light palette (#F8FAFC background, #FFFFFF paper, #0D9488 teal/aqua, #B8860B gold)
 * - getMuiTheme(mode): Helper function jo active mode ('light' ya 'dark') ke mutabiq sahi theme return karta hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Custom Luxury Theme definitions for Material UI v5.
 * Strictly avoids default generic Material blue.
 * Uses Inter font, consistent 8px/12px border radius, and calibrated surfaces matching
 * the Grand Horizon Hotel brand guidelines.
 */

// 1. LUXURY DARK THEME
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0A0F1A',
      paper: '#131A26',
    },
    primary: {
      main: '#3FD0C9', // Live Aqua
      light: '#6FE0DA',
      dark: '#2DB9B2',
      contrastText: '#0A0F1A',
    },
    secondary: {
      main: '#C9A15A', // Gold
      light: '#E3C287',
      dark: '#B88E45',
      contrastText: '#0A0F1A',
    },
    divider: '#2A3547',
    text: {
      primary: '#ECEFF3',
      secondary: '#8791A3',
    },
    success: {
      main: '#3ECF8E',
    },
    error: {
      main: '#F2545B',
    },
    warning: {
      main: '#E8A33D',
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h5: {
      fontWeight: 600,
      color: '#ECEFF3',
    },
    h6: {
      fontWeight: 600,
      color: '#ECEFF3',
    },
    subtitle1: {
      color: '#8791A3',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#3FD0C9',
          color: '#0A0F1A',
          fontWeight: 600,
          '&:hover': {
            backgroundColor: '#2DB9B2',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#131A26',
          borderRadius: 8,
          border: '1px solid #2A3547',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#131A26',
          borderRadius: 12,
          border: '1px solid #2A3547',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #2A3547',
          color: '#ECEFF3',
        },
        head: {
          backgroundColor: '#1B2433',
          color: '#8791A3',
          fontWeight: 600,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#1B2433 !important',
          },
        },
      },
    },
  },
});

// 2. LUXURY LIGHT THEME
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#F4F6F4', // Harborlight soft sage/white canvas
      paper: '#FFFFFF',   // Pure crisp white card surface
    },
    primary: {
      main: '#143D2B', // Deep Forest Pine
      light: '#1C523B',
      dark: '#0E281C',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C19A5B', // Warm Camel / Luxury Gold
      light: '#D4B07B',
      dark: '#AF8849',
      contrastText: '#FFFFFF',
    },
    divider: '#E3EAE5', // Soft Sage border
    text: {
      primary: '#1A2421', // High-contrast forest charcoal
      secondary: '#4A5550', // Readable body neutral
    },
    success: {
      main: '#1B7A4E',
    },
    error: {
      main: '#D9383A',
    },
    warning: {
      main: '#D9822B',
    },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h5: {
      fontWeight: 600,
      color: '#0F172A',
    },
    h6: {
      fontWeight: 600,
      color: '#0F172A',
    },
    subtitle1: {
      color: '#64748B',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#0D9488',
          color: '#FFFFFF',
          fontWeight: 600,
          '&:hover': {
            backgroundColor: '#0F766E',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E2E8F0',
          color: '#0F172A',
        },
        head: {
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          fontWeight: 600,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F8FAFC !important',
          },
        },
      },
    },
  },
});

/**
 * Helper selector function to obtain active MUI theme
 * Mode parameter ke hisaab se sahi theme object return karta hai
 */
export const getMuiTheme = (mode = 'dark') => {
  return mode === 'light' ? lightTheme : darkTheme;
};

export default darkTheme;
