import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Terminal,
  ArrowRight,
  BarChart3,
  BedDouble,
  Users,
  ShieldAlert,
  CalendarCheck,
  ConciergeBell,
  Sparkles,
  Clock,
  Command,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { ROLES, PERMISSIONS } from '../../config/constants';

/**
 * ============================================================================
 * COMMAND PALETTE (CTRL+K / ⌘K) COMPONENT
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh fast command terminal hai jisme user keyboard se kisi bhi page ya action par ja sakta hai:
 * - Arrivals & Departures, Cancellations, Housekeeping, Rooms, Staff waghera.
 * - Dynamic Theme Switcher action: "Toggle Theme (Light / Dark Mode)" jo sabhi roles ke liye available hai.
 * - Fuzzy search filtering aur Arrow Key navigation (↑, ↓, Enter, ESC).
 * 
 * [ENGLISH EXPLANATION]:
 * Staff & Guest ⌘K / Ctrl+K Global Command Palette.
 * Fuzzy-searches all flight-ops routes, administrative portals, and quick actions
 * including immediate Light/Dark theme switching.
 */

const ALL_COMMANDS = [
  // Quick Universal Theme Toggle Action for all roles
  {
    id: 'toggle-theme',
    label: 'Toggle Theme (Light / Dark Mode)',
    description: 'Switch between Obsidian Dark and Slate Light luxury color systems',
    icon: Sun,
    color: '#E8A33D',
    roles: [ROLES.GUEST, ROLES.RECEPTIONIST, ROLES.HOUSEKEEPING, ROLES.SUPER_ADMIN],
    action: 'toggleTheme',
  },
  // Front Desk
  { id: 'desk', label: 'Arrivals & Departures', description: 'Front desk live operations', path: '/desk', icon: ConciergeBell, color: '#3FD0C9', permission: PERMISSIONS.BOOKINGS_VIEW },
  { id: 'walk-in', label: 'Walk-In Booking', description: 'Counter reservation and instant lobby check-in', path: '/desk/walk-in', icon: ConciergeBell, color: '#3FD0C9', permission: PERMISSIONS.BOOKINGS_CREATE },
  { id: 'cancellations', label: 'Cancellations Queue', description: 'Authoritative refund policy queue', path: '/desk/cancellations', icon: Clock, color: '#C9A15A', permission: PERMISSIONS.BOOKINGS_CANCEL },
  { id: 'housekeeping', label: 'Housekeeping Board', description: 'Real-time room cleanliness statuses', path: '/housekeeping', icon: Sparkles, color: '#3ECF8E', permission: PERMISSIONS.HOUSEKEEPING_UPDATE },
  // Administration
  { id: 'bookings', label: 'Master Reservations Directory', description: 'Global reservation search & management', path: '/admin/bookings', icon: CalendarCheck, color: '#3FD0C9', permission: PERMISSIONS.BOOKINGS_VIEW },
  { id: 'rooms', label: 'Room Inventory', description: 'Physical suite configuration & pricing', path: '/admin/rooms', icon: BedDouble, color: '#8791A3', permission: PERMISSIONS.ROOMS_VIEW },
  { id: 'reviews', label: 'Guest Reviews Moderation', description: 'Moderate verified stay reviews per room', path: '/admin/reviews', icon: BedDouble, color: '#C9A15A', permission: PERMISSIONS.ROOMS_VIEW },
  { id: 'staff', label: 'Staff Directory & Access', description: 'Manage hotel staff and permissions', path: '/admin/staff', icon: Users, color: '#3FD0C9', permission: PERMISSIONS.STAFF_MANAGE },
  { id: 'pbac', label: 'PBAC Permission Matrix', description: 'Fine-grained category-wise permission management', path: '/admin/staff/pbac', icon: ShieldAlert, color: '#C9A15A', permission: PERMISSIONS.STAFF_MANAGE },
  // Analytics & Security
  { id: 'analytics', label: 'Manager Analytics & KPIs', description: 'Revenue, ADR, RevPAR, and occupancy', path: '/admin/analytics', icon: BarChart3, color: '#3ECF8E', permission: PERMISSIONS.ANALYTICS_VIEW },
  { id: 'audit', label: 'Security Audit Trail', description: 'Immutable security logs inspector', path: '/admin/audit-log', icon: ShieldAlert, color: '#F87171', permission: PERMISSIONS.AUDIT_VIEW },
  { id: 'copilot', label: 'AI Ops Copilot', description: 'AI administrative command terminal', path: '/admin/copilot', icon: Terminal, color: '#3FD0C9', permission: PERMISSIONS.STAFF_MANAGE },
];

export const CommandPalette = ({ isOpen: externalIsOpen, onClose: externalOnClose } = {}) => {
  const { user } = useAuthStore();
  const { toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Support both controlled (StaffHeader) and uncontrolled (standalone) mode
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const closePalette = useCallback(() => {
    if (externalOnClose) externalOnClose();
    else setInternalIsOpen(false);
    setQuery('');
  }, [externalOnClose]);

  const openPalette = useCallback(() => {
    if (externalOnClose === undefined) {
      setInternalIsOpen(true);
    }
    setQuery('');
    setSelectedIndex(0);
  }, [externalOnClose]);

  const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  // Filter commands strictly by dynamic PBAC permissions
  const filteredCommands = ALL_COMMANDS.filter((cmd) => {
    if (!cmd.permission && cmd.roles?.includes(ROLES.GUEST)) return true;
    if (!user) return false;
    if (!isSuperAdmin && cmd.permission && !userPerms.includes(cmd.permission)) {
      return false;
    }
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.path?.toLowerCase().includes(q)
    );
  });

  const handleSelect = useCallback(
    (command) => {
      // Agar direct theme toggle action hai
      if (command.action === 'toggleTheme') {
        toggleTheme();
        closePalette();
        return;
      }

      // Agar navigation route hai
      if (command.path) {
        navigate(command.path);
        closePalette();
      }
    },
    [navigate, closePalette, toggleTheme]
  );

  // Global keyboard listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? closePalette() : openPalette();
      }
      if (e.key === 'Escape' && isOpen) {
        closePalette();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closePalette, openPalette]);

  // Keyboard navigation within list
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex]);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, filteredCommands, selectedIndex, handleSelect]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePalette}
              className="fixed inset-0 z-[60] bg-[#0A0F1A]/80 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed top-28 left-1/2 -translate-x-1/2 z-[70] w-full max-w-xl bg-[#131A26] border border-[#2A3547] rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2A3547]">
                <Search className="w-5 h-5 text-[#3FD0C9] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands, portals, and theme..."
                  className="flex-1 bg-transparent text-sm text-[#ECEFF3] placeholder-[#8791A3] outline-none font-sans"
                />
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-[#0A0F1A] border border-[#2A3547] rounded text-[10px] text-[#8791A3] font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results List */}
              <div className="max-h-80 overflow-y-auto py-1">
                {filteredCommands.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-[#8791A3]">No commands found for "{query}"</p>
                  </div>
                ) : (
                  filteredCommands.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect(cmd)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected ? 'bg-[#1B2433]' : 'hover:bg-[#1B2433]'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cmd.color}18`, border: `1px solid ${cmd.color}30` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: cmd.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#ECEFF3] truncate">{cmd.label}</p>
                          <p className="text-[11px] text-[#8791A3] truncate">{cmd.description}</p>
                        </div>
                        {isSelected && (
                          <ArrowRight className="w-4 h-4 text-[#3FD0C9] ml-auto shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer Hint */}
              <div className="px-4 py-2 border-t border-[#2A3547] flex items-center gap-4 text-[10px] text-[#8791A3] font-mono">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#0A0F1A] border border-[#2A3547] rounded">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#0A0F1A] border border-[#2A3547] rounded">↵</kbd> Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#0A0F1A] border border-[#2A3547] rounded">ESC</kbd> Dismiss
                </span>
                <span className="ml-auto">{filteredCommands.length} result{filteredCommands.length !== 1 ? 's' : ''}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Exported hook so StaffHeader can trigger palette open
 */
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
};

export default CommandPalette;
