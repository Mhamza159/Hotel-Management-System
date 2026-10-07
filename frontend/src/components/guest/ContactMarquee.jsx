import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

/**
 * Single unit of the marquee contact and guarantee content string.
 * Order:
 * 📞 +1 (800) 555-0199 • ✉ concierge@grandhorizon.com • 📍 Grand Horizon Boulevard, Coastal Sanctuary • Guaranteed Best Rate • Instant Confirmation
 */
const MarqueeSegment = () => (
  <div className="flex items-center shrink-0 space-x-6 text-[11px] sm:text-xs pr-6">
    <a
      href="tel:+18005550199"
      className="inline-flex items-center gap-1.5 hover:text-[#1F2B20] transition-colors"
      title="Call Concierge"
    >
      <Phone className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0" />
      <span className="font-mono text-[#2A2A28]">+1 (800) 555-0199</span>
    </a>

    <span className="text-[#2B3A2A]/40 select-none">&bull;</span>

    <a
      href="mailto:concierge@grandhorizon.com"
      className="inline-flex items-center gap-1.5 hover:text-[#1F2B20] transition-colors"
      title="Email Concierge"
    >
      <Mail className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0" />
      <span className="text-[#2A2A28]">concierge@grandhorizon.com</span>
    </a>

    <span className="text-[#2B3A2A]/40 select-none">&bull;</span>

    <span className="inline-flex items-center gap-1.5">
      <MapPin className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0" />
      <span className="text-[#2A2A28]">Grand Horizon Boulevard, Coastal Sanctuary</span>
    </span>

    <span className="text-[#2B3A2A]/40 select-none">&bull;</span>

    <span className="text-[#2B3A2A] font-mono font-medium">
      Guaranteed Best Rate
    </span>

    <span className="text-[#2B3A2A]/40 select-none">&bull;</span>

    <span className="text-[#2B3A2A] font-mono font-medium">
      Instant Confirmation
    </span>

    <span className="text-[#2B3A2A]/40 select-none">&bull;</span>
  </div>
);

/**
 * Continuous infinite marquee utility bar directly beneath the navbar.
 * Features:
 * - Seamless loop (Group A & Group B mirrored, translating -50%)
 * - Comfortable reading speed (24s cycle)
 * - Pause on hover for interactive links (tel, mail)
 * - Unbroken continuous scroll across mobile and desktop
 */
export const ContactMarquee = () => {
  return (
    <div
      role="region"
      aria-label="Hotel announcements and contact information"
      className="w-full bg-[#FAF8F2] text-[#2B3A2A] text-xs py-2 border-b border-[#E4DFD0] overflow-hidden select-none"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {/* Primary Set */}
        <div className="flex shrink-0">
          <MarqueeSegment />
          <MarqueeSegment />
        </div>
        {/* Mirrored Clone for 100% seamless transition */}
        <div className="flex shrink-0" aria-hidden="true">
          <MarqueeSegment />
          <MarqueeSegment />
        </div>
      </div>
    </div>
  );
};

export default ContactMarquee;
