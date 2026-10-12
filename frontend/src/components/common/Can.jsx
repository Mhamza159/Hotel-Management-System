import React from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ROLES, PERMISSIONS } from '../../config/constants';

/**
 * Pure PBAC authorization function
 * Returns true if the user is a super-admin or has the specified permission.
 */
export function can(user, permission) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  // Guest kabhi staff nahi (backend bhi purane accounts ki saved staff permissions nahi maanta)
  if (user.role === ROLES.GUEST) return permission === PERMISSIONS.BOOKINGS_CREATE;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

/**
 * Dynamic PBAC Render Guard:
 * Renders children if the authenticated user has the required permission
 * or is a Super-Admin.
 *
 * CRITICAL ANTI-TEMPLATE RULE:
 * If the user lacks permission, it renders null (completely invisible in DOM).
 * It NEVER renders disabled or greyed-out buttons.
 */
export const Can = ({ permission, permissions = [], any = false, children }) => {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  // Super-admin implicitly bypasses all permission checks
  if (user.role === ROLES.SUPER_ADMIN) {
    return <>{children}</>;
  }

  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

  // Check single permission
  if (permission) {
    return userPerms.includes(permission) ? <>{children}</> : null;
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasAccess = any
      ? permissions.some((p) => userPerms.includes(p))
      : permissions.every((p) => userPerms.includes(p));

    return hasAccess ? <>{children}</> : null;
  }

  return <>{children}</>;
};

export default Can;
