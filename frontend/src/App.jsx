import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ROLES, PERMISSIONS } from './config/constants';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { RoomCatalogPage } from './pages/public/RoomCatalogPage';
import { RoomDetailPage } from './pages/public/RoomDetailPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';

// Guest Pages
import { CheckoutPage } from './pages/guest/CheckoutPage';
import { GuestDashboardPage } from './pages/guest/GuestDashboardPage';
import { MyBookingsPage } from './pages/guest/MyBookingsPage';
import { BookingDetailPage } from './pages/guest/BookingDetailPage';
import { WishlistPage } from './pages/guest/WishlistPage';
import { WaitlistPage } from './pages/guest/WaitlistPage';

// Staff Layout & Pages
import { StaffLayout } from './layouts/StaffLayout';
import { HousekeepingLayout } from './layouts/HousekeepingLayout';
import { DeskDashboardPage } from './pages/desk/DeskDashboardPage';
import { DeskCancellationsPage } from './pages/desk/DeskCancellationsPage';
import { WalkInBookingPage } from './pages/desk/WalkInBookingPage';
import { HousekeepingDashboardPage } from './pages/housekeeping/HousekeepingDashboardPage';
import { HousekeepingBoardPage } from './pages/housekeeping/HousekeepingBoardPage';
import { HousekeepingDeskPage } from './pages/housekeeping/HousekeepingDeskPage';
import { HousekeepingBookingsPage } from './pages/housekeeping/HousekeepingBookingsPage';
import { HousekeepingCancellationsPage } from './pages/housekeeping/HousekeepingCancellationsPage';
import { HousekeepingRoomsPage } from './pages/housekeeping/HousekeepingRoomsPage';
import { HousekeepingAnalyticsPage } from './pages/housekeeping/HousekeepingAnalyticsPage';
import { HousekeepingAuditPage } from './pages/housekeeping/HousekeepingAuditPage';
import { HousekeepingStaffPage } from './pages/housekeeping/HousekeepingStaffPage';
import { StaffDirectoryPage } from './pages/admin/StaffDirectoryPage';
import { StaffPbacMatrixPage } from './pages/admin/StaffPbacMatrixPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminRoomsPage } from './pages/admin/AdminRoomsPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { AdminCopilotPage } from './pages/admin/AdminCopilotPage';
import { ConciergePage } from './pages/public/ConciergePage';
import { ChatDrawer } from './components/common/ChatDrawer';
import { CommandPalette } from './components/common/CommandPalette';

/**
 * ============================================================================
 * MAIN APPLICATION ROUTER (PURE PBAC INTEGRATED)
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh router application ki tamam public, guest, aur staff routes ko define karta hai:
 * - Public routes: Sabhi ke liye open hain.
 * - Guest routes: Authenticated guests ke liye gated hain via `allowedRoles`.
 * - Staff & Admin routes: Pure PBAC permissions ke zariye gated hain (`requiredPermission`).
 *   Jab Super Admin kisi bhi role (e.g. Receptionist) ko permission assign karega,
 *   woh user is module ko seamlessly access kar sakega bina kisi rigid RBAC blockage ke.
 * 
 * [ENGLISH EXPLANATION]:
 * Central Client-side Router configuration.
 * Enforces pure PBAC (Permission-Based Access Control) across operational and
 * administrative modules.
 */
export function App() {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/rooms" element={<RoomCatalogPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />
        <Route path="/concierge" element={<ConciergePage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Guest Protected Checkout Flow */}
        <Route
          path="/checkout"
          element={
            <ProtectedRoute allowedRoles={[ROLES.GUEST, ROLES.SUPER_ADMIN]}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        {/* Guest Portals */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.GUEST, ROLES.SUPER_ADMIN]}>
              <GuestDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute allowedRoles={[ROLES.GUEST, ROLES.SUPER_ADMIN]}>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.GUEST, ROLES.SUPER_ADMIN]}>
              <BookingDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute allowedRoles={[ROLES.GUEST, ROLES.SUPER_ADMIN]}>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/waitlist"
          element={
            <ProtectedRoute allowedRoles={[ROLES.GUEST, ROLES.SUPER_ADMIN]}>
              <WaitlistPage />
            </ProtectedRoute>
          }
        />

        {/* Staff Operations: Arrivals & Departures */}
        <Route
          path="/desk"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.BOOKINGS_VIEW}>
              <StaffLayout
                title="Front Desk Flight-Ops"
                subtitle="Live guest arrivals, departures, room assignments, and payments"
              >
                <DeskDashboardPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Staff Operations: Walk-In Booking & Lobby Settlement */}
        <Route
          path="/desk/walk-in"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.CHECKIN_MANAGE}>
              <StaffLayout
                title="Walk-In Guest Registration"
                subtitle="Book rooms on behalf of walk-in guests with in-person settlement & instant check-in"
              >
                <WalkInBookingPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Staff Operations: Cancellations & Refund Audit */}
        <Route
          path="/desk/cancellations"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.BOOKINGS_CANCEL}>
              <StaffLayout
                title="Cancellation Audit & Refunds"
                subtitle="Authoritative refund policy evaluation and cancellation approval queue"
              >
                <DeskCancellationsPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Staff Operations: Housekeeping Hub (Warm Minimal Planner Style) */}
        <Route
          path="/housekeeping"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.HOUSEKEEPING_UPDATE}>
              <HousekeepingLayout
                title="Housekeeping Hub"
                subtitle="Shift turnover, live metrics, and real-time room readiness"
              >
                <HousekeepingDashboardPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/housekeeping/board"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.HOUSEKEEPING_UPDATE}>
              <HousekeepingLayout
                title="Room Status Board"
                subtitle="Live turnover board, floor filters, and quick cleanliness controls"
              >
                <HousekeepingBoardPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/housekeeping/desk"
          element={
            <ProtectedRoute
              requiredPermissions={[PERMISSIONS.CHECKIN_MANAGE, PERMISSIONS.CHECKOUT_MANAGE]}
              any={true}
            >
              <HousekeepingLayout
                title="Front Desk Operations"
                subtitle="Live arrivals, departures, check-in turnover, and in-person settlements"
              >
                <HousekeepingDeskPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/housekeeping/bookings"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.BOOKINGS_VIEW}>
              <HousekeepingLayout
                title="Bookings Directory"
                subtitle="Full overview of guest reservations, room dates, and payment states"
              >
                <HousekeepingBookingsPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/housekeeping/cancellations"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.BOOKINGS_CANCEL}>
              <HousekeepingLayout
                title="Cancellation Requests"
                subtitle="Authoritative refund policy evaluation and cancellation approval queue"
              >
                <HousekeepingCancellationsPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/housekeeping/rooms"
          element={
            <ProtectedRoute
              requiredPermissions={[
                PERMISSIONS.ROOMS_VIEW,
                PERMISSIONS.ROOMS_CREATE,
                PERMISSIONS.ROOMS_UPDATE,
                PERMISSIONS.ROOMS_DELETE,
                PERMISSIONS.ROOMS_PRICE_UPDATE,
              ]}
              any={true}
            >
              <HousekeepingLayout
                title="Room Inventory Management"
                subtitle="Configure hotel suites, rates, guest capacity, and cleanliness readiness"
              >
                <HousekeepingRoomsPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/housekeeping/analytics"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ANALYTICS_VIEW}>
              <HousekeepingLayout
                title="Performance & Analytics"
                subtitle="Hotel yield metrics, occupancy trends, RevPAR, and shift velocity"
              >
                <HousekeepingAnalyticsPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/housekeeping/audit"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.AUDIT_VIEW}>
              <HousekeepingLayout
                title="Audit Activity Trail"
                subtitle="Immutable record of staff operations, status transitions, and PBAC adjustments"
              >
                <HousekeepingAuditPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/housekeeping/staff"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.STAFF_MANAGE}>
              <HousekeepingLayout
                title="Staff & Permissions Matrix"
                subtitle="Fine-grained access rights management across operational domains"
              >
                <HousekeepingStaffPage />
              </HousekeepingLayout>
            </ProtectedRoute>
          }
        />

        {/* Hotel Administration: Staff Directory */}
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.STAFF_MANAGE}>
              <StaffLayout
                title="Staff Directory & Access"
                subtitle="Manage hotel staff members and configure access permissions"
              >
                <StaffDirectoryPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Hotel Administration: PBAC Permission Matrix */}
        <Route
          path="/admin/staff/pbac"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.STAFF_MANAGE}>
              <StaffLayout
                title="PBAC Permission Matrix"
                subtitle="Fine-grained category-wise permission management"
              >
                <StaffPbacMatrixPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Hotel Administration: Individual Staff PBAC Matrix */}
        <Route
          path="/admin/staff/:id/pbac"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.STAFF_MANAGE}>
              <StaffLayout
                title="PBAC Permission Matrix"
                subtitle="Fine-grained category-wise permission management"
              >
                <StaffPbacMatrixPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Hotel Intelligence: Managerial Analytics & KPIs */}
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ANALYTICS_VIEW}>
              <StaffLayout
                title="Managerial Analytics & KPIs"
                subtitle="Authoritative revenue yields, ADR, RevPAR, and physical occupancy tracking"
              >
                <AdminAnalyticsPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Hotel Administration: Master Reservations Directory */}
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.BOOKINGS_VIEW}>
              <StaffLayout
                title="Master Reservations Directory"
                subtitle="Global reservation search, guest attribution, and invoice management"
              >
                <AdminBookingsPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Security & Oversight: Immutable Security Audit Trail */}
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.AUDIT_VIEW}>
              <StaffLayout
                title="Security Audit Trail"
                subtitle="Append-only immutable record of administrative actions and compliance logs"
              >
                <AdminAuditLogsPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Hotel Administration: Physical Room Inventory */}
        <Route
          path="/admin/rooms"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ROOMS_VIEW}>
              <StaffLayout
                title="Physical Room Inventory"
                subtitle="Physical suite configuration, capacity, pricing, and photo gallery"
              >
                <AdminRoomsPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Hotel Administration: Guest Reviews Moderation */}
        <Route
          path="/admin/reviews"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ROOMS_VIEW}>
              <StaffLayout
                title="Guest Reviews Moderation"
                subtitle="Inspect verified room reviews and moderate public catalog feedback"
              >
                <AdminReviewsPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />

        {/* Hotel Administration: Administrative AI Copilot */}
        <Route
          path="/admin/copilot"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.STAFF_MANAGE}>
              <StaffLayout
                title="Administrative AI Copilot"
                subtitle="Autonomous flight-ops commands with two-phase signed mutation safeguards"
              >
                <AdminCopilotPage />
              </StaffLayout>
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* Global Overlays */}
      <ChatDrawer />
      <CommandPalette />
    </>
  );
}

export default App;
