import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, Search, ShieldCheck, Plus, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { CommandPalette } from '../common/CommandPalette';
import { ThemeToggle } from '../common/ThemeToggle';

export const StaffHeader = ({ title = 'Overview', subtitle = 'Rooms, arrivals, reservations, and balances at a glance' }) => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Formatted operational date and time (e.g. Aug 5, 2026, 8:43 AM)
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now);
      setCurrentDateTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Listen for Ctrl+K / ⌘K globally and sync with local state
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 600);
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-[#14241C] border-b border-[#E3EAE5] dark:border-[#264334] px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
        {/* Title & Section */}
        <div>
          <h2 className="text-base font-bold text-[#143D2B] dark:text-white leading-tight font-sans">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[#7C8B84] dark:text-[#A9BCB2] font-normal">{subtitle}</p>
          )}
        </div>

        {/* System Status, Date & Action Center */}
        <div className="flex items-center gap-3">
          {/* ⌘K Command Palette Trigger */}
          <button
            onClick={openPalette}
            title="Open Command Palette (Ctrl+K)"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F6F4] dark:bg-[#0A140F] border border-[#E3EAE5] dark:border-[#264334] hover:border-[#143D2B]/40 text-xs text-[#7C8B84] hover:text-[#143D2B] dark:hover:text-white transition-all group"
          >
            <Search className="w-3.5 h-3.5 text-[#143D2B] dark:text-[#3ECF8E]" />
            <span className="text-[11px]">Search...</span>
            <div className="flex items-center gap-0.5 ml-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1B3025] border border-[#E3EAE5] dark:border-[#264334] rounded text-[10px] font-mono">
                ⌘K
              </kbd>
            </div>
          </button>

          {/* Operational Date/Time Badge (Harborlight Style) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F6F4] dark:bg-[#0A140F] border border-[#E3EAE5] dark:border-[#264334] text-xs text-[#4A5550] dark:text-[#E8EFEA]">
            <Calendar className="w-3.5 h-3.5 text-[#143D2B] dark:text-[#3ECF8E]" />
            <span className="text-[11px] font-medium">{currentDateTime || 'Aug 5, 2026, 8:43 AM'}</span>
          </div>

          {/* Sync Refresh Button */}
          <button
            onClick={handleRefresh}
            title="Sync / Refresh Data"
            className="p-2 rounded-lg bg-[#F4F6F4] dark:bg-[#0A140F] border border-[#E3EAE5] dark:border-[#264334] text-[#7C8B84] hover:text-[#143D2B] dark:hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#143D2B]' : ''}`} />
          </button>

          {/* Primary Action Button: + New Reservation (Harborlight Style) */}
          <button
            onClick={() => navigate('/desk/walk-in')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#143D2B] hover:bg-[#1C523B] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Reservation</span>
          </button>

          {/* Universal Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Command Palette Modal */}
      <CommandPalette isOpen={paletteOpen} onClose={closePalette} />
    </>
  );
};

export default StaffHeader;
