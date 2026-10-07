import React, { useEffect } from 'react';
import { StaffSidebar } from '../components/staff/StaffSidebar';
import { StaffHeader } from '../components/staff/StaffHeader';
import { authService } from '../services/auth.service';

/**
 * ============================================================================
 * STAFF OPERATIONS COCKPIT LAYOUT
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh layout tamaam staff roles (Receptionist, Housekeeping, Super Admin) ke pages
 * (e.g. Front Desk, Housekeeping Board, Admin Console) ko wrap karta hai.
 * - Root ThemeProvider se dynamic light/dark theme inherit karta hai.
 * - Sidebar aur Top Header ko fix position mein rakhta hai aur main content area scrollable hota hai.
 * - Page mount hone par silently backend se user ke authoritative permissions sync karta hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Staff Operations Cockpit Layout.
 * Inherits dynamic theme from the root ThemeProvider.
 * Provides fixed operational sidebar, top action header, and responsive work area.
 */
export const StaffLayout = ({ title = 'Operations Console', subtitle, children }) => {
  useEffect(() => {
    // Silently synchronize staff permissions with authoritative backend DB state
    authService.getMe().catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-[#F4F6F4] dark:bg-[#0A140F] text-[#1A2421] dark:text-[#E8EFEA] overflow-hidden transition-colors duration-200">
      {/* Fixed Operations Sidebar */}
      <StaffSidebar />

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StaffHeader title={title} subtitle={subtitle} />

        <main className="flex-1 overflow-y-auto p-6 bg-[#F4F6F4] dark:bg-[#0A140F] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;
