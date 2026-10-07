import React from 'react';

/**
 * AmbientSkyline SVG Component
 * Abstracted architectural hotel-at-night skyline silhouette.
 * Built with geometric lines, warm gold windows, and soft aqua system beacon pulses.
 * Zero stock photos or gradient blobs.
 */
export const AmbientSkyline = ({ className = '' }) => {
  return (
    <div className={`relative w-full overflow-hidden select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1440 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="nightSky" x1="720" y1="0" x2="720" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0A0F1A" />
            <stop offset="60%" stopColor="#0D1524" />
            <stop offset="100%" stopColor="#131A26" />
          </linearGradient>

          <linearGradient id="towerGradFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B2433" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0A0F1A" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="towerGradMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E2B3D" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#131A26" />
          </linearGradient>

          <linearGradient id="towerGradFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#25354C" />
            <stop offset="100%" stopColor="#131A26" />
          </linearGradient>

          <linearGradient id="goldBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C9A15A" stopOpacity="0" />
            <stop offset="50%" stopColor="#C9A15A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#C9A15A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Deep Night Atmosphere */}
        <rect width="1440" height="480" fill="url(#nightSky)" />

        {/* Ambient Horizontal Horizon Grid Lines */}
        <line x1="0" y1="360" x2="1440" y2="360" stroke="#2A3547" strokeWidth="1" strokeDasharray="4 8" opacity="0.4" />
        <line x1="0" y1="420" x2="1440" y2="420" stroke="#2A3547" strokeWidth="1" opacity="0.6" />

        {/* Background Distant Towers (Low-opacity silhouette) */}
        <path d="M120 480V240H220V480H120Z" fill="url(#towerGradFar)" />
        <path d="M260 480V200H380V480H260Z" fill="url(#towerGradFar)" />
        <path d="M520 480V180H640V480H520Z" fill="url(#towerGradFar)" />
        <path d="M780 480V160H860V480H780Z" fill="url(#towerGradFar)" />
        <path d="M980 480V220H1100V480H980Z" fill="url(#towerGradFar)" />
        <path d="M1200 480V260H1320V480H1200Z" fill="url(#towerGradFar)" />

        {/* Midground Hotel Complex Towers */}
        <path d="M180 480V280L230 250H310V480H180Z" fill="url(#towerGradMid)" stroke="#2A3547" strokeWidth="1" />
        <path d="M420 480V190H560V480H420Z" fill="url(#towerGradMid)" stroke="#2A3547" strokeWidth="1" />
        <path d="M680 480V140H820V480H680Z" fill="url(#towerGradMid)" stroke="#2A3547" strokeWidth="1" />
        <path d="M900 480V210H1020V480H900Z" fill="url(#towerGradMid)" stroke="#2A3547" strokeWidth="1" />
        <path d="M1120 480V250H1240V480H1120Z" fill="url(#towerGradMid)" stroke="#2A3547" strokeWidth="1" />

        {/* Foreground Grand Horizon Main Hotel Spire & Pavilion */}
        <path d="M640 480V120H760V480H640Z" fill="url(#towerGradFront)" stroke="#3FD0C9" strokeWidth="1" strokeOpacity="0.4" />
        <path d="M700 120V70L701 50L702 70V120H700Z" fill="#C9A15A" />
        
        {/* Antenna Spire Aqua Beacon Light */}
        <circle cx="701" cy="46" r="3" fill="#3FD0C9" />
        <circle cx="701" cy="46" r="8" stroke="#3FD0C9" strokeWidth="0.75" strokeOpacity="0.4" />

        {/* Illuminated Architectural Windows in Gold (#C9A15A) and Aqua (#3FD0C9) */}
        {/* Spire tower windows */}
        <rect x="660" y="140" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.85" />
        <rect x="675" y="140" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.6" />
        <rect x="715" y="140" width="8" height="6" rx="1" fill="#3FD0C9" opacity="0.8" />
        <rect x="730" y="140" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.7" />

        <rect x="660" y="160" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.7" />
        <rect x="690" y="160" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.9" />
        <rect x="730" y="160" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.85" />

        <rect x="660" y="180" width="8" height="6" rx="1" fill="#3FD0C9" opacity="0.75" />
        <rect x="675" y="180" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.8" />
        <rect x="715" y="180" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.9" />
        <rect x="730" y="180" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.6" />

        <rect x="660" y="200" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.8" />
        <rect x="690" y="200" width="8" height="6" rx="1" fill="#3FD0C9" opacity="0.85" />
        <rect x="715" y="200" width="8" height="6" rx="1" fill="#C9A15A" opacity="0.75" />

        {/* East Wing Windows */}
        <rect x="450" y="220" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.8" />
        <rect x="470" y="220" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.6" />
        <rect x="510" y="220" width="10" height="7" rx="1" fill="#3FD0C9" opacity="0.75" />
        <rect x="450" y="240" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.9" />
        <rect x="490" y="240" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.7" />
        <rect x="520" y="240" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.85" />

        {/* West Wing Windows */}
        <rect x="930" y="240" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.75" />
        <rect x="960" y="240" width="10" height="7" rx="1" fill="#3FD0C9" opacity="0.85" />
        <rect x="980" y="240" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.65" />
        <rect x="940" y="260" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.9" />
        <rect x="970" y="260" width="10" height="7" rx="1" fill="#C9A15A" opacity="0.7" />

        {/* Ambient Ground Horizon Wash */}
        <rect y="440" width="1440" height="40" fill="#0A0F1A" />
      </svg>
      {/* Soft gradient blend into main page content */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0F1A]" />
    </div>
  );
};

export default AmbientSkyline;
