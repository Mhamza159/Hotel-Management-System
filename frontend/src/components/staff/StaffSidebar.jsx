import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ConciergeBell,
  CalendarCheck,
  CalendarPlus,
  Sparkles,
  BedDouble,
  Users,
  BarChart3,
  ShieldAlert,
  FileText,
  Clock,
  LogOut,
  Star,
} from 'lucide-react';
import { Can } from '../common/Can';
import { useAuthStore } from '../../stores/useAuthStore';
import { ROLES, PERMISSIONS } from '../../config/constants';

/**
 * ============================================================================
 * NAVIGATION SECTIONS CONFIGURATION (PURE PBAC GATED)
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Har tab ek specific PBAC permission (e.g. BOOKINGS_VIEW, ROOMS_VIEW, STAFF_MANAGE)
 * se linked hai. Super Admin jab bhi kisi staff user ko permission assign karega,
 * yeh tab automatically us staff user ke sidebar mein display ho jayegi.
 * 
 * [ENGLISH EXPLANATION]:
 * Navigation manifest gated strictly by granular PBAC permissions.
 * Tabs dynamically mount in the sidebar whenever an authenticated user possesses
 * the assigned permission or is a Super-Admin.
 */
const NAVIGATION_SECTIONS = [
  {
    id: 'front-desk',
    title: 'Front Desk',
    items: [
      {
        to: '/desk',
        label: 'Arrivals & Departures',
        icon: ConciergeBell,
        end: true,
        permission: PERMISSIONS.BOOKINGS_VIEW,
      },
      {
        to: '/desk/walk-in',
        label: 'Walk-In Booking',
        icon: CalendarPlus,
        permission: PERMISSIONS.CHECKIN_MANAGE,
      },
      {
        to: '/desk/cancellations',
        label: 'Cancellations Queue',
        icon: Clock,
        permission: PERMISSIONS.BOOKINGS_CANCEL,
      },
      {
        to: '/housekeeping',
        label: 'Housekeeping Board',
        icon: Sparkles,
        permission: PERMISSIONS.HOUSEKEEPING_UPDATE,
      },
    ],
  },
  {
    id: 'administration',
    title: 'Hotel Administration',
    items: [
      {
        to: '/admin/bookings',
        label: 'All Reservations',
        icon: CalendarCheck,
        permission: PERMISSIONS.BOOKINGS_VIEW,
      },
      {
        to: '/admin/rooms',
        label: 'Room Inventory',
        icon: BedDouble,
        permission: PERMISSIONS.ROOMS_VIEW,
      },
      {
        to: '/admin/reviews',
        label: 'Guest Reviews',
        icon: Star,
        permission: PERMISSIONS.ROOMS_VIEW,
      },
      {
        to: '/admin/staff',
        label: 'Staff & Roles',
        icon: Users,
        permission: PERMISSIONS.STAFF_MANAGE,
      },
      {
        to: '/admin/staff/pbac',
        label: 'PBAC Matrix',
        icon: ShieldAlert,
        permission: PERMISSIONS.STAFF_MANAGE,
      },
    ],
  },
  {
    id: 'intelligence',
    title: 'Analytics & Security',
    items: [
      {
        to: '/admin/analytics',
        label: 'Manager Analytics',
        icon: BarChart3,
        permission: PERMISSIONS.ANALYTICS_VIEW,
      },
      {
        to: '/admin/audit-log',
        label: 'Security Audit Log',
        icon: ShieldAlert,
        permission: PERMISSIONS.AUDIT_VIEW,
      },
      {
        to: '/admin/copilot',
        label: 'AI Ops Copilot',
        icon: Sparkles,
        permission: PERMISSIONS.STAFF_MANAGE,
      },
    ],
  },
];

/**
 * Dense Flight-Ops Staff Navigation Sidebar
 * Enforces dynamic PBAC: unpermitted links and empty category headers are completely absent from DOM.
 */
export const StaffSidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: {} });
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs transition-all ${
      isActive
        ? 'bg-white/12 text-white border-l-2 border-[#C19A5B] shadow-sm font-semibold'
        : 'text-[#94B5A5] hover:text-white hover:bg-white/5 font-medium'
    }`;

  const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  // Filter sections and tabs strictly by PBAC permissions
  // Agar kisi section ke tamam tabs unpermitted hon, toh poora section header bhi DOM se remove ho jata hai
  const visibleSections = NAVIGATION_SECTIONS.map((section) => {
    const visibleItems = section.items.filter((item) => {
      // Super Admin bypasses all checks
      if (isSuperAdmin) return true;
      // PBAC: Check if user holds the permission
      return userPerms.includes(item.permission);
    });

    return {
      ...section,
      items: visibleItems,
    };
  }).filter((section) => section.items.length > 0);

  return (
    <aside className="w-64 bg-[#143D2B] border-r border-[#1B4A35] flex flex-col h-screen sticky top-0 select-none z-30 transition-colors duration-200">
      {/* Brand & Console Header - Harborlight Style */}
      <div className="p-4 border-b border-[#1B4A35] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C19A5B]/20 border border-[#C19A5B]/40 flex items-center justify-center text-[#E5C287]">
            <ConciergeBell className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide font-sans">
              Grand Horizon Hotel
            </h1>
            <span className="text-[10px] text-[#94B5A5] font-sans tracking-wide block font-medium">
              Reservation Management
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {visibleSections.map((section) => (
          <div key={section.id}>
            <span className="text-[10px] uppercase font-sans tracking-wider text-[#7E9E91] px-3 font-semibold">
              {section.title}
            </span>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={navItemClass}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Attribution Footer - Harborlight Style */}
      <div className="p-3 border-t border-[#1B4A35] bg-[#0E281C]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#C19A5B] text-[#143D2B] flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SA'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'System Administrator'}</p>
              <p className="text-[10px] font-sans text-[#C19A5B] uppercase font-bold tracking-wider truncate">
                {user?.role?.replace('_', ' ') || 'ADMIN'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-[#94B5A5] hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default StaffSidebar;
