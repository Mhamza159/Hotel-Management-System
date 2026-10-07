import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';

/**
 * ============================================================================
 * UNIVERSAL THEME TOGGLE BUTTON COMPONENT
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh reusable component poore application mein Light aur Dark mode switch karne ke liye use hota hai.
 * - Guests ke Navbar mein
 * - Staff ke Operations Header mein
 * - Auth Pages (Login / Register) ke top bar mein
 * - Framer Motion ke zariye smooth icon rotation animation provide karta hai.
 * - Accessible title aur aria-label provide karta hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Reusable animated Theme Toggle button powered by Zustand and Framer Motion.
 * Adapts seamlessly into all role headers, providing visual feedback and
 * keyboard accessibility.
 * 
 * @param {Object} props
 * @param {boolean} [props.showLabel=false] - Agar true ho toh saath text label show karega
 * @param {string} [props.className=''] - Custom styling classes
 */
export const ThemeToggle = ({ showLabel = false, className = '' }) => {
  // Theme state aur toggle function Zustand store se access karna
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const tooltipText = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={tooltipText}
      aria-label={tooltipText}
      className={`relative p-2 rounded-lg border transition-all duration-200 flex items-center gap-2 select-none group focus:outline-none focus:ring-2 focus:ring-[#3FD0C9]/40 ${
        isDark
          ? 'bg-[#131A26] border-[#2A3547] text-[#8791A3] hover:text-[#ECEFF3] hover:border-[#3FD0C9]/50 shadow-sm'
          : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:border-[#0D9488]/50 shadow-sm'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center text-[#C9A15A] group-hover:text-amber-400"
            >
              <Sun className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center text-[#0D9488] group-hover:text-teal-700"
            >
              <Moon className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <span className="text-xs font-medium capitalize">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
