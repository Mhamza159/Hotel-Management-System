# Phase 6 Plan: High-Density Staff Operations Console

**Phase:** 6 of 7  
**Directory:** `.planning/phases/06-high-density-staff-operations-console/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Upgrade the entire Staff Operations Cockpit (Front Desk, Housekeeping, Cancellation Review Queue) into a high-density, high-velocity operational workspace using Material UI DataGrid. Enforce strict design rules: 8px border radius, Inter typography throughout, near-instant 150ms row transitions with zero decorative motion, and verbatim display of backend tier/refund numbers in cancellation review dialogs.

---

## 2. Target Files

- `frontend/src/components/staff/StaffSidebar.jsx`: Solid `#131A26` navigation panel, aqua active indicators, clean Inter labels.
- `frontend/src/components/staff/StaffHeader.jsx`: Solid `#131A26` bar, operational date/time, rapid search.
- `frontend/src/pages/desk/DeskDashboardPage.jsx`: Arrivals, departures, and occupancy metrics.
- `frontend/src/pages/desk/ArrivalsPage.jsx` & `DeparturesPage.jsx`: High-density DataGrid.
- `frontend/src/pages/desk/CancellationReviewPage.jsx`: Cancellation queue DataGrid.
- `frontend/src/components/staff/CancellationReviewDialog.jsx`: Policy review dialog displaying API numbers verbatim.
- `frontend/src/pages/housekeeping/HousekeepingBoardPage.jsx`: Dense room status board with quick clean/dirty toggle.

---

## 3. Tasks Breakdown

### Task 6.1: Staff Chrome & Navigation Styling
- `StaffSidebar.jsx`:
  - Background: solid `--surface` (`#131A26`), border-r `1px solid #2A3547`.
  - Active item: `bg-[#3FD0C9]/15 text-[#3FD0C9] border-l-2 border-[#3FD0C9]`.
  - Inactive item: text `#8791A3`, hover text `#ECEFF3`.
  - Typography: `Inter` only.
  - PBAC gating strictly preserved.
- `StaffHeader.jsx`:
  - Solid `#131A26`, border-b `#2A3547`.
  - Live clock chip in `#1B2433` with aqua status dot.

### Task 6.2: Configure High-Density MUI DataGrid
- Standard DataGrid props across all staff views:
  ```javascript
  density="compact"
  rowHeight={48}
  headerHeight={44}
  sx={{
    border: '1px solid #2A3547',
    borderRadius: '8px',
    backgroundColor: '#131A26',
    color: '#ECEFF3',
    fontFamily: 'Inter, sans-serif',
    '& .MuiDataGrid-cell': {
      borderBottom: '1px solid #1B2433',
      transition: 'background-color 150ms ease',
    },
    '& .MuiDataGrid-row:hover': {
      backgroundColor: '#1B2433',
    },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: '#1B2433',
      borderBottom: '1px solid #2A3547',
      color: '#8791A3',
      textTransform: 'uppercase',
      fontSize: '11px',
      letterSpacing: '0.05em',
    }
  }}
  ```
- Absolutely zero decorative spring animations — speed is paramount for front-desk staff.

### Task 6.3: Cancellation Review Dialog (`CancellationReviewDialog.jsx`)
- Render modal dialog on `--surface` (`#131A26`) with 1px border.
- Display backend response data verbatim:
  - Total Paid: `$XXX.XX`
  - Hours to Check-In: `XX hours`
  - Applicable Tier: `>48h (Full Refund)` or `<24h (1-Night Penalty)`
  - Exact Penalty Fee: `$XX.XX`
  - Net Refund Dispatched: `$XXX.XX`
- Actions: *"Approve & Process Refund"* button dispatches to `cancellationService.reviewCancellation`.

---

## 4. Verification Gates

1. Navigate to staff views: `/desk`, `/desk/arrivals`, `/desk/cancellations`.
2. Verify DataGrid rows render in compact density with 8px radius and Inter font.
3. Test hovering rows to ensure near-instantaneous (150ms) highlight response.
4. Open Cancellation Review Dialog — verify fee and refund calculations match backend payload exactly.
