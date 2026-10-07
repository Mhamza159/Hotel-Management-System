import React, { useEffect } from 'react';
import { HousekeepingSidebar } from './HousekeepingSidebar';
import { authService } from '../services/auth.service';

/**
 * ============================================================================
 * HOUSEKEEPING CONSOLE LAYOUT (WARM MINIMAL PLANNER)
 * ============================================================================
 * 
 * - Background: --hk-bg (#F3EFE7 - warm cream)
 * - Sidebar: --hk-sidebar (#2B3A2A - dark forest green)
 * - Typography: Fraunces for headings, Inter for body
 * - Live PBAC Sync: Auto-refreshes GET /auth/me on mount and window focus
 */
export const HousekeepingLayout = ({ children }) => {
  useEffect(() => {
    // Re-evaluate live: refresh permissions from backend
    authService.getMe().catch((err) => {
      // Non-blocking sync error
      console.warn('Housekeeping permission sync:', err?.message);
    });

    const onFocus = () => {
      authService.getMe().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <div className="flex h-screen bg-[#F3EFE7] text-[#2A2A28] font-sans overflow-hidden selection:bg-[#E3B7A8] selection:text-[#2B3A2A]">
      {/* Narrow Dark Green Planner Sidebar */}
      <HousekeepingSidebar />

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto min-w-0 bg-[#F3EFE7]">
        {children}
      </main>
    </div>
  );
};

export default HousekeepingLayout;
