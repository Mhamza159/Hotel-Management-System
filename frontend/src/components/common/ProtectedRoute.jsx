import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { ROLES } from '../../config/constants';

/**
 * ============================================================================
 * PBAC-FIRST PROTECTED ROUTE GUARD
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh component client-side route access control ko enforce karta hai:
 * 1. Unauthenticated Check: Agar user logged in nahi hai, toh login page par bhejta hai.
 * 2. Super Admin Bypass: Super Admin ke paas tamam modules ka unconditional access hota hai.
 * 3. PBAC First (Permission Check): Agar route par `requiredPermission` define hai (e.g. 'rooms:view',
 *    'staff:manage', 'analytics:view'), toh check karta hai ke kya user ke paas yeh permission hai.
 *    - Agar user ke paas permission hai, toh access GRANT hoti hai, chahe uska role koi bhi ho!
 *    - Agar Super Admin ne Receptionist ko permission assign ki hai, toh woh module open ho jayega.
 * 4. Fallback Role Check: Agar route par koi specific permission required nahi hai (jaise /dashboard
 *    ya /checkout), tab `allowedRoles` check hota hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Enterprise PBAC-First Route Protection Guard.
 * Grants immediate access if the user possesses the required granular operational permission,
 * allowing Super Admin delegation across all staff roles without RBAC blockage.
 */
export const ProtectedRoute = ({
  children,
  allowedRoles = [],
  requiredPermission = null,
  requiredPermissions = [],
  any = false,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  // 1. Agar user authenticated nahi hai toh login par redirect karein
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Super-admin implicitly bypasses all permission and role restrictions
  if (user.role === ROLES.SUPER_ADMIN) {
    return <>{children}</>;
  }

  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];

  // 3. PBAC MULTI-PERMISSION CHECK
  if (requiredPermissions.length > 0) {
    const hasAccess = any
      ? requiredPermissions.some((p) => userPerms.includes(p))
      : requiredPermissions.every((p) => userPerms.includes(p));

    if (hasAccess) {
      return <>{children}</>;
    }

    return (
      <div className="min-h-screen bg-[#F3EFE7] text-[#2A2A28] flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md p-8 bg-white border border-[#E4DFD0] rounded-3xl shadow-xl">
          <h2 className="text-xl font-serif font-bold text-rose-800 mb-2">Restricted Action</h2>
          <p className="text-sm text-[#2A2A28]/70 mb-6">
            You lack the required operational permission: <code className="text-[#2B3A2A] font-mono px-2 py-0.5 bg-[#FAF8F2] rounded-lg border border-[#E4DFD0]">{requiredPermissions.join(', ')}</code>.
          </p>
          <a
            href="/housekeeping"
            className="inline-block px-5 py-2.5 bg-[#2B3A2A] hover:bg-[#1F2B20] text-white text-xs font-mono font-bold uppercase rounded-xl transition-colors shadow-xs"
          >
            Return to Planner
          </a>
        </div>
      </div>
    );
  }

  // 3b. PBAC SINGLE PERMISSION CHECK
  if (requiredPermission) {
    // Agar user ke paas yeh permission mojood hai, access grant karein!
    if (userPerms.includes(requiredPermission)) {
      return <>{children}</>;
    }

    // Agar permission nahi hai, toh restricted action screen dikhayein
    return (
      <div className="min-h-screen bg-[#F3EFE7] text-[#2A2A28] flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md p-8 bg-white border border-[#E4DFD0] rounded-3xl shadow-xl">
          <h2 className="text-xl font-serif font-bold text-rose-800 mb-2">Restricted Action</h2>
          <p className="text-sm text-[#2A2A28]/70 mb-6">
            You lack the required operational permission: <code className="text-[#2B3A2A] font-mono px-2 py-0.5 bg-[#FAF8F2] rounded-lg border border-[#E4DFD0]">{requiredPermission}</code>.
          </p>
          <a
            href="/housekeeping"
            className="inline-block px-5 py-2.5 bg-[#2B3A2A] hover:bg-[#1F2B20] text-white text-xs font-mono font-bold uppercase rounded-xl transition-colors shadow-xs"
          >
            Return to Planner
          </a>
        </div>
      </div>
    );
  }

  // 4. ROLE FALLBACK CHECK: Sirf tab chale jab route par koi requiredPermission na ho
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-ink text-text flex items-center justify-center p-6 text-center transition-colors duration-200">
        <div className="max-w-md p-8 bg-surface border border-border rounded-xl shadow-2xl transition-colors duration-200">
          <h2 className="text-xl font-bold text-danger mb-2">Access Denied</h2>
          <p className="text-sm text-text-muted mb-6">
            Your account ({user.role}) does not have permission to view this section.
          </p>
          <a
            href={user.role === ROLES.GUEST ? '/dashboard' : '/desk'}
            className="inline-block px-4 py-2 bg-surface-2 hover:bg-border text-text text-sm font-medium rounded-lg border border-border transition-colors"
          >
            {user.role === ROLES.GUEST ? 'Return to Dashboard' : 'Return to Console'}
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
