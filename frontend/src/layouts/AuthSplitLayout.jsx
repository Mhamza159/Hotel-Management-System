import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { roomService } from '../services/room.service';

const FALLBACK_SUITE_PHOTO =
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=85';

/**
 * ============================================================================
 * AUTH SPLIT LAYOUT (LOGIN & REGISTER)
 * ============================================================================
 * 
 * Two-panel split-screen layout for authentication:
 * - Left Panel (~45% width, full-bleed, hidden on mobile):
 *     * Real featured/signature suite photo
 *     * Gradient overlay from rgba(43,58,42,0.85) [--forest] to transparent
 *     * Overlay headline (upright + italic) & tracked subtitle
 * - Right Panel (~55% width, warm cream background):
 *     * Vertically centered content with comfortable max-width (~420px)
 *     * Serif heading & subtle description
 *     * Form fields, solid forest-green CTA, secondary links
 */
export const AuthSplitLayout = ({
  children,
  headlinePart1 = 'Welcome back.',
  headlinePart2 = 'to your sanctuary.',
  title,
  subtitle,
  footerContent,
}) => {
  const [photoUrl, setPhotoUrl] = useState(FALLBACK_SUITE_PHOTO);

  useEffect(() => {
    // Attempt to pull a signature room photo from active room inventory
    roomService
      .getAvailableRooms({})
      .then((data) => {
        const rooms = Array.isArray(data) ? data : data?.rooms || [];
        // Prioritize presidential or deluxe suite
        const signatureRoom =
          rooms.find((r) => r.type === 'presidential' && r.images?.length > 0) ||
          rooms.find((r) => r.type === 'deluxe' && r.images?.length > 0) ||
          rooms.find((r) => r.images?.length > 0);

        if (signatureRoom?.images?.[0]?.url) {
          setPhotoUrl(signatureRoom.images[0].url);
        }
      })
      .catch(() => {
        // Fallback photo remains active on network or initial load errors
      });
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#F5F1E8] text-[#2A2A28] flex items-center justify-center md:p-6 lg:p-8 font-sans selection:bg-[#2B3A2A] selection:text-[#F5F1E8]">
      {/* Outer Two-Panel Container */}
      <div className="w-full max-w-6xl min-h-screen md:min-h-[680px] md:max-h-[900px] bg-[#FAF8F2] md:rounded-3xl overflow-hidden border-0 md:border md:border-[#E4DFD0] md:shadow-[0_24px_60px_rgba(43,58,42,0.08)] flex flex-col md:flex-row">
        
        {/* ================================================================ */}
        {/* LEFT PANEL: Signature Hotel Photo + Forest Gradient Overlay     */}
        {/* ================================================================ */}
        <div className="hidden md:block md:w-[45%] relative overflow-hidden bg-[#2B3A2A] select-none">
          <img
            src={photoUrl}
            alt="Grand Horizon Luxury Suite"
            className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-700 hover:scale-100"
          />

          {/* Top Brand Watermark */}
          <div className="absolute top-8 left-8 z-10">
            <Link to="/" className="flex flex-col text-left group">
              <span className="font-playfair text-xl text-[#F5F1E8] tracking-wide transition-opacity group-hover:opacity-90">
                Grand Horizon
              </span>
              <span className="text-[9px] font-sans tracking-[0.24em] uppercase text-[#F5F1E8]/75">
                Boutique Hotel
              </span>
            </Link>
          </div>

          {/* Gradient overlay: linear-gradient from rgba(43,58,42,0.85) to transparent */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(43, 58, 42, 0.92) 0%, rgba(43, 58, 42, 0.5) 45%, rgba(43, 58, 42, 0.1) 75%, transparent 100%)',
            }}
          />

          {/* Overlay Text in --text-cream */}
          <div className="absolute bottom-10 left-8 right-8 z-10 text-[#F5F1E8]">
            <h2 className="font-serif text-3xl lg:text-4xl font-normal leading-tight text-[#F5F1E8] mb-3">
              <span>{headlinePart1}</span>
              <br />
              <span className="italic font-normal">{headlinePart2}</span>
            </h2>
            <p className="text-[10px] font-sans uppercase tracking-[0.22em] text-[#F5F1E8]/85 font-medium">
              GRAND HORIZON &bull; BOUTIQUE COMFORT, MEMORABLE MOMENTS
            </p>
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT PANEL: Form Container with Warm Cream Background           */}
        {/* ================================================================ */}
        <div className="w-full md:w-[55%] bg-[#F5F1E8] flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto">
          
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between pb-4">
            {/* Mobile-only logo */}
            <Link to="/" className="md:hidden flex flex-col text-left">
              <span className="font-playfair text-lg text-[#2B3A2A]">Grand Horizon</span>
              <span className="text-[8px] font-sans tracking-[0.22em] uppercase text-[#2B3A2A]/70">
                Boutique Hotel
              </span>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-sans tracking-wide text-[#2B3A2A] hover:text-[#1F2B20] transition-colors ml-auto font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Hotel</span>
            </Link>
          </div>

          {/* Vertically Centered Form Content Block */}
          <div className="w-full max-w-[420px] mx-auto my-auto py-4 sm:py-6">
            <div className="mb-6">
              {title && (
                <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#2A2A28] mb-2 tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-[#2A2A28]/70 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </div>

          {/* Optional Footer Content (e.g. Terms on Register) */}
          <div className="pt-4 text-center">
            {footerContent || (
              <p className="text-[11px] text-[#2A2A28]/50">
                &copy; {new Date().getFullYear()} Grand Horizon Hotel & Resort.
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default AuthSplitLayout;
