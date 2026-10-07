# Phase 1 Plan: Design Tokens & Global Styles Architecture

**Phase:** 1 of 7  
**Directory:** `.planning/phases/01-design-tokens-and-global-styles/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Establish the core design token architecture for the modern futuristic hospitality-tech aesthetic. Purge all frosted glassmorphism utilities (`backdrop-blur-*`), define the navy-black/gold/aqua palette in Tailwind and CSS variables, eliminate MUI elevation shadows in favor of crisp 1px borders, and lock icon stroke weights to 1.75px.

---

## 2. Target Files

- `frontend/tailwind.config.js`: Semantic colors (`ink`, `surface`, `surface-2`, `gold`, `aqua`, `success`, `danger`, `warning`) and typography configuration.
- `frontend/src/index.css`: Root CSS custom properties, scrollbar styling, and removal of cream/serif arbitrary overrides.
- `frontend/src/config/muiTheme.js`: Material UI theme overrides (darkTheme as default/primary luxury palette, 1px border lines, 0px elevation shadows).
- `frontend/src/stores/useThemeStore.js`: Default theme preference set to modern dark/ink mode.

---

## 3. Tasks Breakdown

### Task 1.1: Reconfigure `tailwind.config.js`
- Register semantic colors:
  ```javascript
  colors: {
    ink: '#0A0F1A',        // Base canvas
    surface: '#131A26',    // Elevated solid cards
    'surface-2': '#1B2433', // Nested & hover surfaces
    gold: {
      DEFAULT: '#C9A15A',
      hover: '#B88E45',
      light: '#EAD7B2',
    },
    aqua: {
      DEFAULT: '#3FD0C9',
      hover: '#32B5AF',
      light: '#D3F7F5',
    },
    success: '#3ECF8E',
    danger: '#F2545B',
    warning: '#E8A33D',
    border: '#2A3547',
  }
  ```
- Enforce font families: `sans: ['Inter', 'sans-serif']`, `serif: ['Fraunces', 'serif']`.

### Task 1.2: Overhaul `src/index.css`
- Update CSS custom properties for `:root`:
  ```css
  :root {
    --ink: #0A0F1A;
    --surface: #131A26;
    --surface-2: #1B2433;
    --gold: #C9A15A;
    --aqua: #3FD0C9;
    --border: #2A3547;
    --success: #3ECF8E;
    --danger: #F2545B;
    --warning: #E8A33D;
  }
  ```
- Purge any remaining light/cream overrides.
- Custom scrollbar styling using `--surface-2` track and `--border` thumb.

### Task 1.3: Update `src/config/muiTheme.js`
- Set `palette.background.default = '#0A0F1A'` and `palette.background.paper = '#131A26'`.
- Set `primary = '#3FD0C9'` (aqua) and `secondary = '#C9A15A'` (gold).
- Override `MuiCard`: remove all shadows (`boxShadow: 'none'`), apply `border: '1px solid #2A3547'`, `borderRadius: '12px'`.
- Override `MuiButton`: `borderRadius: '8px'`, no uppercase transform unless explicitly specified.

### Task 1.4: Icon Consistency Audit
- Scan for non-Lucide icons and standardize on `lucide-react` with `strokeWidth={1.75}`.

---

## 4. Verification Gates

1. Run `npm run build` in `frontend` — must compile with zero errors.
2. Inspect CSS variables in browser DevTools — verify `--ink: #0A0F1A` and `--surface: #131A26` are active on the root `<html>`.
3. Verify zero `backdrop-blur` classes on core layout wrappers.
