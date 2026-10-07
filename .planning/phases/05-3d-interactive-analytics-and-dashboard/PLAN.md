# Phase 5 Plan: 3D Interactive Analytics & Guest Dashboard

**Phase:** 5 of 7  
**Directory:** `.planning/phases/05-3d-interactive-analytics-and-dashboard/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Integrate Apache ECharts (`echarts`, `echarts-for-react`, `echarts-gl`) to rebuild Revenue and Occupancy visualizations into genuine 3D bar/surface charts styled in `--gold` (`#C9A15A`) and `--aqua` (`#3FD0C9`). Re-skin all KPI cards to solid `--surface` containers with 1px borders and zero elevation shadows. Implement the interactive Guest Loyalty Points widget with dynamic counter micro-motion.

---

## 2. Target Files

- `frontend/package.json`: Install `echarts` and `echarts-for-react`.
- `frontend/src/components/admin/Analytics3DChart.jsx`: New component rendering 3D bar/surface occupancy and revenue charts.
- `frontend/src/pages/admin/AdminAnalyticsPage.jsx`: Rebuild analytics view, mount 3D charts, re-skin KPI cards.
- `frontend/src/pages/guest/GuestDashboardPage.jsx`: Mount guest dashboard analytics, re-skin cards, build Loyalty Points widget.
- `frontend/src/components/guest/LoyaltyPointsWidget.jsx`: Dedicated tier + point counter widget.

---

## 3. Tasks Breakdown

### Task 5.1: Install ECharts Dependencies
- Run `npm install echarts echarts-for-react` in `frontend/`.
- Ensure clean bundle trees and lazy loading to keep bundle size optimized.

### Task 5.2: Build 3D Analytics Visualizer (`Analytics3DChart.jsx`)
- Render 3D Bar Grid:
  - X-Axis: Days of week / Months (`Inter` font).
  - Y-Axis: Room Tier (Single, Double, Deluxe, Suite, Presidential).
  - Z-Axis: Revenue ($) / Occupancy Rate (%).
  - Palette: Gradient from `--aqua` (`#3FD0C9`) to `--gold` (`#C9A15A`).
  - Shading: Realistic or lambert lighting with smooth interactive orbit controls (rotate, zoom, pan).
- Tooltip: Custom dark tooltip in `#131A26` with 1px `#2A3547` border.

### Task 5.3: Re-Skin KPI Metric Cards
- Container: MUI `Card` with `sx={{ backgroundColor: '#131A26', border: '1px solid #2A3547', boxShadow: 'none', borderRadius: '12px' }}`.
- Metrics: Large numerical display in `#3FD0C9` or `#C9A15A`.
- Trend Badges: Small pill indicators in `#3ECF8E` (+12.4% vs last cycle) or `#F2545B`.

### Task 5.4: Guest Loyalty Points Widget (`LoyaltyPointsWidget.jsx`)
- Visual structure:
  - Solid `#131A26` card with gold border highlight.
  - Active Tier Badge (Silver, Gold, Platinum).
  - Live Points Balance with animated numerical spring counter on value changes.
  - Dollar Equivalent: *"Redeemable for $XX off your next stay"*.
  - Clean progress bar towards next tier unlock.

---

## 4. Verification Gates

1. Navigate to `/admin/analytics` and `/dashboard`.
2. Verify genuine 3D chart renders with interactive orbit controls (drag to rotate) without WebGL crashes.
3. Confirm all KPI cards display zero elevation shadow and have exact 1px border lines.
4. Verify loyalty points counter transitions smoothly when values change.
