import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BedDouble,
  LogOut,
  Sparkles,
  ArrowLeft,
  ConciergeBell,
  CalendarCheck,
  Clock,
  Building2,
  BarChart3,
  ScrollText,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { PERMISSIONS } from '../config/constants';
import { can } from '../components/common/Can';

/**
 * ============================================================================
 * HOUSEKEEPING NARROW PLANNER SIDEBAR (PERMISSION-DRIVEN)
 * ============================================================================
 * 
 * - STATE A (Minimal): Only Dashboard & Room Board (housekeeping:update floor).
 * - STATE B (Expanded): Dynamically adds one nav item per permission in fixed order:
 *     1. Front Desk (checkin:manage OR checkout:manage)
 *     2. Bookings (bookings:view)
 *     3. Cancellations (bookings:cancel)
 *     4. Rooms (rooms:view / create / update / delete / priceUpdate)
 *     5. Analytics (analytics:view)
 *     6. Audit Log (audit:view)
 *     7. Staff & Permissions (staff:manage)
 *   (coupons:manage & waitlist:manage omitted as per spec).
 * - Anti-template rule: sections without permission are never rendered (completely absent).
 */
export const HousekeepingSidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Base floor navigation items (always visible to housekeeping staff)
  const baseItems = [
    {
      to: '/housekeeping',
      label: 'OVERVIEW',
      icon: LayoutDashboard,
      end: true,
      allowed: true,
    },
    {
      to: '/housekeeping/board',
      label: 'ROOM BOARD',
      icon: BedDouble,
      end: false,
      allowed: true,
    },
  ];

  // Dynamic permission-gated navigation items in STRICT FIXED ORDER
  const dynamicItems = [
    {
      to: '/housekeeping/desk',
      label: 'FRONT DESK',
      icon: ConciergeBell,
      end: false,
      allowed: can(user, PERMISSIONS.CHECKIN_MANAGE) || can(user, PERMISSIONS.CHECKOUT_MANAGE),
    },
    {
      to: '/housekeeping/bookings',
      label: 'BOOKINGS',
      icon: CalendarCheck,
      end: false,
      allowed: can(user, PERMISSIONS.BOOKINGS_VIEW),
    },
    {
      to: '/housekeeping/cancellations',
      label: 'CANCELLATIONS',
      icon: Clock,
      end: false,
      allowed: can(user, PERMISSIONS.BOOKINGS_CANCEL),
    },
    {
      to: '/housekeeping/rooms',
      label: 'ROOMS',
      icon: Building2,
      end: false,
      allowed:
        can(user, PERMISSIONS.ROOMS_VIEW) ||
        can(user, PERMISSIONS.ROOMS_CREATE) ||
        can(user, PERMISSIONS.ROOMS_UPDATE) ||
        can(user, PERMISSIONS.ROOMS_DELETE) ||
        can(user, PERMISSIONS.ROOMS_PRICE_UPDATE),
    },
    {
      to: '/housekeeping/analytics',
      label: 'ANALYTICS',
      icon: BarChart3,
      end: false,
      allowed: can(user, PERMISSIONS.ANALYTICS_VIEW),
    },
    {
      to: '/housekeeping/audit',
      label: 'AUDIT LOG',
      icon: ScrollText,
      end: false,
      allowed: can(user, PERMISSIONS.AUDIT_VIEW),
    },
    {
      to: '/housekeeping/staff',
      label: 'STAFF',
      icon: Users,
      end: false,
      allowed: can(user, PERMISSIONS.STAFF_MANAGE),
    },
  ];

  // Filter to only permitted items (Anti-template: absent from DOM if not permitted)
  const navItems = [...baseItems, ...dynamicItems.filter((item) => item.allowed)];

  return (
    <aside className="w-20 sm:w-24 bg-[#2B3A2A] text-[#F3EFE7] flex flex-col items-center justify-between py-5 px-2 shrink-0 select-none z-30 shadow-md">
      {/* Top Section: Logo & Monogram Badge */}
      <div className="flex flex-col items-center space-y-4 w-full">
        <NavLink
          to="/housekeeping"
          className="group relative flex flex-col items-center"
          title="Grand Horizon Housekeeping Planner"
        >
          {/* Rounded Monogram Badge */}
          <div className="w-11 h-11 rounded-2xl bg-[#F3EFE7] text-[#2B3A2A] flex items-center justify-center font-serif font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            <span>GH</span>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E3B7A8] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E3B7A8]" />
          </span>
          <span className="text-[8px] font-mono tracking-widest text-[#F3EFE7]/60 mt-1 uppercase">
            PLANNER
          </span>
        </NavLink>

        {/* Divider */}
        <div className="w-8 h-px bg-[#F3EFE7]/15" />

        {/* Scrollable Navigation Items */}
        <nav className="flex flex-col items-center space-y-2.5 w-full overflow-y-auto max-h-[calc(100vh-210px)] pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `w-16 sm:w-18 py-2.5 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? 'bg-[#E3B7A8] text-[#2B3A2A] font-bold shadow-sm scale-102'
                      : 'text-[#F3EFE7]/70 hover:text-[#F3EFE7] hover:bg-[#F3EFE7]/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-[#2B3A2A] stroke-[2.2]' : 'text-[#F3EFE7]/80'
                      }`}
                    />
                    <span
                      className={`text-[8px] font-mono tracking-widest uppercase mt-1 leading-tight text-center px-1 truncate max-w-full ${
                        isActive ? 'text-[#2B3A2A] font-bold' : 'text-[#F3EFE7]/70'
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: User Avatar & Logout */}
      <div className="flex flex-col items-center space-y-2.5 w-full pt-3 border-t border-[#F3EFE7]/15">
        <NavLink
          to="/"
          title="Back to Hotel Portal"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#F3EFE7]/70 hover:text-[#F3EFE7] hover:bg-[#F3EFE7]/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </NavLink>

        <div
          className="w-8 h-8 rounded-full bg-[#FAF8F2]/15 border border-[#F3EFE7]/30 flex items-center justify-center text-xs font-bold text-[#F3EFE7]"
          title={user?.name || 'Housekeeping Staff'}
        >
          {user?.name ? user.name.slice(0, 2).toUpperCase() : 'HK'}
        </div>

        <button
          onClick={handleSignOut}
          title="Sign Out"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#F3EFE7]/70 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export default HousekeepingSidebar;
