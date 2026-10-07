import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/common/ThemeToggle';

/**
 * ============================================================================
 * AUTHENTICATION PAGES LAYOUT (LOGIN, REGISTER, RECOVERY)
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh layout tamaam authentication pages (Login, Register, Forgot Password, Reset Password)
 * ko encapsulate karta hai:
 * - Hotel branding logo aur home return link.
 * - Universal ThemeToggle taake user login screen par hi apni pasand ka theme chun sake.
 * - Centered responsive card container with subtle architectural background silhouettes.
 * 
 * [ENGLISH EXPLANATION]:
 * Shared layout wrapper for authentication and password recovery views.
 * Displays brand identity, theme switcher, and centered form container.
 */
export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[#0A0F1A] text-[#ECEFF3] flex flex-col justify-between relative overflow-hidden selection:bg-[#C9A15A] selection:text-[#0A0F1A] transition-colors duration-200">
      {/* Ambient Skyline / Architecture Silhouette SVG Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden flex items-end justify-center">
        <svg
          viewBox="0 0 1440 320"
          className="w-full h-80 text-[#2A3547]"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0,224L48,208C96,192,192,160,288,165.3C384,171,480,213,576,218.7C672,224,768,192,864,165.3C960,139,1056,117,1152,128C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      {/* Subtle Ambient Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C9A15A]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar Header */}
      <header className="px-6 py-6 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C9A15A] to-[#131A26] border border-[#C9A15A]/40 flex items-center justify-center font-display font-bold text-[#0A0F1A] transition-transform group-hover:scale-105">
            G
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-wide text-[#ECEFF3] block leading-none">
              Grand Horizon
            </span>
            <span className="text-[10px] tracking-widest uppercase text-[#8791A3] font-semibold">
              Hotel & Resort
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-3">
          {/* Theme Switcher on Auth Views */}
          <ThemeToggle />

          <Link
            to="/"
            className="text-xs font-medium text-[#3FD0C9] hover:underline transition-colors"
          >
            &larr; Back to Explore
          </Link>
        </div>
      </header>

      {/* Centered Auth Box */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md bg-[#131A26] border border-[#2A3547] rounded-2xl p-8 shadow-2xl relative transition-colors duration-200">
          <div className="mb-6 text-center">
            {title && (
              <h1 className="font-serif text-2xl sm:text-3xl font-normal text-white mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#8791A3] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {children}
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-4 text-center text-xs text-[#8791A3] relative z-10">
        &copy; {new Date().getFullYear()} Grand Horizon Hotel. All rights reserved.
      </footer>
    </div>
  );
};

export default AuthLayout;
