# Technical Architecture Plan: Human-Readable Audit Trail Payload Inspector & Generic Target Entity Attribution

**Feature Name:** `audit-log-human-readable-payload-inspector`  
**Related Spec:** [.specify/specs/audit-log-human-readable-payload-inspector/spec.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.specify/specs/audit-log-human-readable-payload-inspector/spec.md)  
**Status:** Architecture Blueprint (Draft / Ready for Tasks)  
**Priority:** High (P1)  
**Target Subsystems:**
- `frontend` (React + Material UI: `AuditPayloadModal.jsx`, `AdminAuditLogsPage.jsx`)
- `backend` (Express / MongoDB: `auth.controller.js`, `audit.service.js`)

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    subgraph AuditLogRetrieval [Audit Trail Data Retrieval]
        FETCH[Admin queries audit trail] --> SRV[AuditService.getAuditLogs]
        SRV --> POP_ACTOR[Populate actorId: name, email, role]
        POP_ACTOR --> DB_QUERY[Fetch AuditLog Documents with beforeState & afterState]
        DB_QUERY --> UI_LIST[AdminAuditLogsPage renders table]
    end

    subgraph ModalInspection [AuditPayloadModal Human-Readable Inspection]
        CLICK_INSPECT[Admin clicks Inspect on Log Row] --> OPEN_MODAL[Mount AuditPayloadModal]
        
        OPEN_MODAL --> PARSE_TARGET[Target Attribution Engine]
        PARSE_TARGET --> DETECT_ROLE{Is Target a User?}
        DETECT_ROLE -- Yes --> EXTRACT_ROLE[Extract role from afterState/beforeState/targetId]
        EXTRACT_ROLE --> RENDER_ROLE_BADGE[Render Role Badge: Receptionist / Housekeeping / Super-Admin]
        DETECT_ROLE -- No --> RENDER_ENTITY[Render Entity Details: Room / Booking / Payment]
        
        OPEN_MODAL --> VIEW_MODE{Selected View Mode Tab}
        
        VIEW_MODE -- Tab 1: Friendly Summary (Default) --> RENDER_SUMMARY[Human-Readable Visual Summary]
        RENDER_SUMMARY --> DIFF_PERMS{Action == 'staff:permission-update'?}
        DIFF_PERMS -- Yes --> CALC_DIFF[Diff beforeState vs afterState permissions]
        CALC_DIFF --> GREEN_BADGES[Render Granted Permissions (+)]
        CALC_DIFF --> RED_BADGES[Render Revoked Permissions (-)]
        DIFF_PERMS -- No --> FORMAT_FIELDS[Render formatted Key-Value Attribute Cards]
        
        VIEW_MODE -- Tab 2: Developer JSON --> RENDER_JSON[Render formatted JSON with Copy Button]
    end
```

---

## 2. Target Entity Attribution Engine Blueprint

### 2.1 Role & Entity Parsing Strategy

In `AuditPayloadModal.jsx`, target attribution will be dynamically resolved:

```javascript
// Resolve human-readable target details from log payload
const resolveTargetDetails = (log) => {
  const isUser = log.targetType === 'User';
  
  if (isUser) {
    // 1. Check afterState / beforeState / populated target
    const targetRole = log.afterState?.role || log.beforeState?.role || log.targetId?.role || 'user';
    const targetName = log.afterState?.name || log.beforeState?.name || log.targetId?.name || null;
    const targetEmail = log.afterState?.email || log.beforeState?.email || log.targetId?.email || null;
    
    return {
      type: 'Staff / User Account',
      role: targetRole,
      title: targetName || `Staff Member (${targetRole})`,
      subtitle: targetEmail || `ID: ${log.targetId}`,
      id: log.targetId,
      badgeColor: getRoleBadgeColor(targetRole),
    };
  }

  if (log.targetType === 'Room') {
    const roomNumber = log.afterState?.roomNumber || log.beforeState?.roomNumber || null;
    const roomType = log.afterState?.type || log.beforeState?.type || null;
    return {
      type: 'Physical Suite Room',
      role: null,
      title: roomNumber ? `Suite #${roomNumber}` : 'Hotel Room',
      subtitle: roomType ? `Category: ${roomType.toUpperCase()}` : `ID: ${log.targetId}`,
      id: log.targetId,
      badgeColor: '#C9A15A',
    };
  }

  // Generic fallback for Booking, Payment, or System entities
  return {
    type: log.targetType || 'System Entity',
    role: null,
    title: `${log.targetType} Record`,
    subtitle: `ID: ${log.targetId}`,
    id: log.targetId,
    badgeColor: '#8791A3',
  };
};
```

---

## 3. Human-Readable Visual Diff Engine

### 3.1 Permission Diff Calculator

```javascript
// Calculate added vs removed permissions with human-friendly labels
const getPermissionDiff = (beforeState, afterState) => {
  const before = new Set(beforeState?.permissions || []);
  const after = new Set(afterState?.permissions || []);

  const added = [...after].filter((p) => !before.has(p));
  const removed = [...before].filter((p) => !after.has(p));
  const unchangedCount = [...after].filter((p) => before.has(p)).length;

  return { added, removed, unchangedCount };
};
```

### 3.2 Human-Friendly Permission Label Taxonomy

Map technical keys like `bookings:cancel` or `rooms:create` to clean English descriptions:
- `bookings:view` $\rightarrow$ *"View All Bookings"*
- `bookings:create` $\rightarrow$ *"Create Guest Reservations"*
- `bookings:confirm` $\rightarrow$ *"Confirm Reservations"*
- `bookings:cancel` $\rightarrow$ *"Process Cancellations & Refunds"*
- `checkin:manage` $\rightarrow$ *"Guest Physical Check-In"*
- `checkout:manage` $\rightarrow$ *"Guest Departure Check-Out"*
- `housekeeping:update` $\rightarrow$ *"Housekeeping Cleanliness Board"*
- `rooms:view` $\rightarrow$ *"View Room Inventory"*
- `rooms:create` $\rightarrow$ *"Define Physical Suites"*
- `rooms:update` $\rightarrow$ *"Modify Room Specifications"*
- `rooms:delete` $\rightarrow$ *"Deactivate Hotel Rooms"*
- `rooms:priceUpdate` $\rightarrow$ *"Adjust Nightly Rates"*
- `payments:recordCash` $\rightarrow$ *"Record Cash Payments"*
- `payments:recordCard` $\rightarrow$ *"Record POS Card Slips"*
- `payments:refund` $\rightarrow$ *"Execute Authoritative Refunds"*
- `staff:manage` $\rightarrow$ *"Manage Staff & PBAC Matrix"*
- `analytics:view` $\rightarrow$ *"Managerial Revenue Analytics"*
- `audit:view` $\rightarrow$ *"Security Audit Trail"*

---

## 4. Dual View Mode Tabs Component

A clean segmented toggle at the top of the content area:
```jsx
<div className="flex items-center gap-1 p-1 bg-surface-2 border border-border rounded-xl">
  <button
    onClick={() => setActiveTab('summary')}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
      activeTab === 'summary'
        ? 'bg-surface text-aqua shadow-sm'
        : 'text-text-muted hover:text-text'
    }`}
  >
    <Eye className="w-3.5 h-3.5" />
    <span>Friendly Summary</span>
  </button>
  <button
    onClick={() => setActiveTab('json')}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
      activeTab === 'json'
        ? 'bg-surface text-aqua shadow-sm'
        : 'text-text-muted hover:text-text'
    }`}
  >
    <Code2 className="w-3.5 h-3.5" />
    <span>Developer JSON</span>
  </button>
</div>
```

---

## 5. Backend Payload Enrichment (`auth.controller.js`)

In `backend/src/controllers/auth.controller.js` (`updateUserPermissions`):
Enrich snapshots to include `name` and `email` alongside `role` and `permissions`:
```javascript
const beforeState = {
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: [...user.permissions],
  isActive: user.isActive,
};
...
const afterState = {
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: [...user.permissions],
  isActive: user.isActive,
};
```

---

## 6. Work Packages & Implementation Tasks

| Work Package | Target Files | Key Responsibilities |
| :--- | :--- | :--- |
| **WP1: Target Entity Attribution Engine** | `frontend/src/components/admin/AuditPayloadModal.jsx` | Update Target Entity card with parsed role badges, name, email, and entity category. |
| **WP2: Human-Readable Summary Engine** | `frontend/src/components/admin/AuditPayloadModal.jsx` | Build visual diff engine with green (+) and red (-) pill badges for permission mutations. |
| **WP3: Segmented Dual-Tab Interface** | `frontend/src/components/admin/AuditPayloadModal.jsx` | Implement "Friendly Summary" (default) and "Developer JSON" tabs with Light/Dark styling. |
| **WP4: Backend Payload Enrichment** | `backend/src/controllers/auth.controller.js` | Include `name` and `email` in audit snapshot states. |
| **WP5: Verification & Quality Gate** | Frontend & Backend | Verify legacy logs, verify new permission update logs, run `npm run build`. |
