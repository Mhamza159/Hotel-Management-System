import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { ROLES } from '../../config/constants';
import { LogOut } from 'lucide-react';

/**
 * ============================================================================
 * UNIFIED GUEST & PUBLIC NAVBAR COMPONENT
 * ============================================================================
 * 
 * Shared across ALL guest-facing routes:
 * - Landing (transparent prop = true over the full-bleed hero photo)
 * - Interior pages (Rooms, Room Detail, Checkout, Dashboard, My Bookings)
 * 
 * Features:
 * - Text-only serif logo: "Grand Horizon / BOUTIQUE HOTEL"
 * - Consistent link set: ROOMS · AMENITIES · EXPERIENCES
 * - Real dynamic authentication awareness (User pill + logout vs Sign In + Book Now)
 */
export const Navbar = ({ transparent = false }) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true, state: {} });
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case ROLES.RECEPTIONIST:
        return '/desk';
      case ROLES.HOUSEKEEPING:
        return '/housekeeping';
      case ROLES.SUPER_ADMIN:
        return '/admin/staff';
      default:
        return '/dashboard';
    }
  };

  return (
    <header
      className={`transition-colors duration-200 ${
        transparent
          ? 'relative z-20 w-full px-6 sm:px-10 lg:px-16 pt-8 pb-4 flex items-center justify-between'
          : 'sticky top-0 z-40 bg-[#FAF8F2] border-b border-[#E4DFD0] shadow-sm'
      }`}
    >
      <div
        className={
          transparent
            ? 'w-full flex items-center justify-between'
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between'
        }
      >
        {/* Brand Logo - Text-Only Serif Wordmark + Tracked Subtitle */}
        <Link to="/" className="flex flex-col text-left group">
          <span
            className={`font-playfair text-xl sm:text-2xl font-normal tracking-wide transition-opacity ${
              transparent ? 'text-[#F5F1E8] group-hover:opacity-90' : 'text-[#2B3A2A] group-hover:opacity-90'
            }`}
          >
            Grand Horizon
          </span>
          <span
            className={`text-[9px] font-sans tracking-[0.24em] uppercase font-normal ${
              transparent ? 'text-[#F5F1E8]/70' : 'text-[#2B3A2A]/70'
            }`}
          >
            Boutique Hotel
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav
          className={`hidden md:flex items-center space-x-10 text-xs font-normal tracking-[0.12em] uppercase ${
            transparent ? 'text-[#F5F1E8]/85' : 'text-[#2A2A28]/80'
          }`}
        >
          <Link
            to="/rooms"
            className={transparent ? 'hover:text-[#F5F1E8] transition-colors' : 'hover:text-[#2B3A2A] transition-colors'}
          >
            Rooms
          </Link>
          <Link
            to="/rooms?type=deluxe"
            className={transparent ? 'hover:text-[#F5F1E8] transition-colors' : 'hover:text-[#2B3A2A] transition-colors'}
          >
            Amenities
          </Link>
          <Link
            to="/concierge"
            className={transparent ? 'hover:text-[#F5F1E8] transition-colors' : 'hover:text-[#2B3A2A] transition-colors'}
          >
            Experiences
          </Link>

          {user?.role === ROLES.SUPER_ADMIN && (
            <Link
              to="/admin/staff"
              className="text-[#C9A15A] hover:underline transition-colors font-medium"
            >
              Admin Console
            </Link>
          )}
          {user?.role === ROLES.RECEPTIONIST && (
            <Link
              to="/desk"
              className="text-[#3FD0C9] hover:underline transition-colors font-medium"
            >
              Front Desk
            </Link>
          )}
        </nav>

        {/* Right CTA / Auth Status */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <Link
                to={getDashboardLink()}
                className={`text-xs font-sans tracking-[0.12em] uppercase px-4 py-2 rounded-full border transition-colors ${
                  transparent
                    ? 'border-[#F5F1E8]/40 hover:border-[#F5F1E8] text-[#F5F1E8]'
                    : 'border-[#2B3A2A]/40 hover:border-[#2B3A2A] text-[#2B3A2A] bg-[#F5F1E8]'
                }`}
              >
                {user.name || 'Dashboard'}
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className={`p-2 transition-colors cursor-pointer ${
                  transparent ? 'text-[#F5F1E8]/70 hover:text-rose-400' : 'text-[#2A2A28]/70 hover:text-rose-600'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className={`text-xs font-sans tracking-[0.12em] uppercase transition-colors px-2 py-1 ${
                  transparent ? 'text-[#F5F1E8]/80 hover:text-[#F5F1E8]' : 'text-[#2A2A28]/80 hover:text-[#2B3A2A]'
                }`}
              >
                Sign In
              </Link>
              <Link
                to="/rooms"
                className="px-6 py-2.5 rounded-full bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-sans font-semibold tracking-[0.12em] uppercase transition-all duration-200 shadow-sm active:scale-95"
              >
                Book Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
