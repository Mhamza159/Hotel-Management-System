import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { ROLES } from '../../config/constants';

export const STAFF_ONLY_MESSAGE =
  'This desktop app is for hotel staff only. Guests can book on the Grand Horizon website.';

/**
 * Staff home route per role (desktop and post-login redirects).
 * @param {string} role
 * @returns {string|null} null for guests
 */
export const getStaffHomePath = (role) => {
  switch (role) {
    case ROLES.RECEPTIONIST:
      return '/desk';
    case ROLES.HOUSEKEEPING:
      return '/housekeeping';
    case ROLES.SUPER_ADMIN:
      return '/admin/staff';
    default:
      return null;
  }
};

/**
 * Desktop "/" route: sends staff to their console and everyone else to login.
 * A guest session (e.g. left over in storage) is signed out because the
 * desktop app is staff-only.
 */
export const DesktopHomeRedirect = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const staffHome = isAuthenticated && user ? getStaffHomePath(user.role) : null;
  const isGuestSession = isAuthenticated && user && !staffHome;

  useEffect(() => {
    if (isGuestSession) {
      logout();
    }
  }, [isGuestSession, logout]);

  if (staffHome) {
    return <Navigate to={staffHome} replace />;
  }

  return (
    <Navigate
      to="/login"
      replace
      state={isGuestSession ? { notice: STAFF_ONLY_MESSAGE } : undefined}
    />
  );
};

export default DesktopHomeRedirect;
