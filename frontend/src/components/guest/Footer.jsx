import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Award, Clock } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#FAF8F2] border-t border-[#E4DFD0] text-[#2A2A28]/70 mt-20">
      {/* Upper Value Pillars */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-[#E4DFD0]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-3 md:space-y-0 md:space-x-4">
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] flex items-center justify-center text-[#2B3A2A] shrink-0 border border-[#E4DFD0]">
              <Shield className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#2B3A2A]">Guaranteed Atomic Booking</h4>
              <p className="text-xs text-[#2A2A28]/70 mt-1 leading-relaxed">
                Zero double-bookings through multi-document transactional isolation.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start space-y-3 md:space-y-0 md:space-x-4">
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] flex items-center justify-center text-[#2B3A2A] shrink-0 border border-[#E4DFD0]">
              <Clock className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#2B3A2A]">Transparent Refund Policy</h4>
              <p className="text-xs text-[#2A2A28]/70 mt-1 leading-relaxed">
                100% full refund up to 48 hours prior to scheduled check-in.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start space-y-3 md:space-y-0 md:space-x-4">
            <div className="w-10 h-10 rounded-full bg-[#F5F1E8] flex items-center justify-center text-[#2B3A2A] shrink-0 border border-[#E4DFD0]">
              <Award className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#2B3A2A]">Verified Stay Reviews</h4>
              <p className="text-xs text-[#2A2A28]/70 mt-1 leading-relaxed">
                Authentic ratings restricted strictly to verified checked-out guests.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex flex-col mb-4">
              <span className="font-playfair text-xl font-normal text-[#2B3A2A]">Grand Horizon</span>
              <span className="text-[9px] font-sans tracking-[0.2em] uppercase text-[#2A2A28]/60">
                Boutique Hotel &bull; Riviera Bay
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#2A2A28]/70">
              A sanctuary of coastal calm and refined hospitality. Designed for discerning travelers seeking serenity.
            </p>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] mb-4">Explore</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/rooms" className="hover:text-[#2B3A2A] transition-colors">
                  All Suites
                </Link>
              </li>
              <li>
                <Link to="/rooms?type=deluxe" className="hover:text-[#2B3A2A] transition-colors">
                  Deluxe Oceanfront
                </Link>
              </li>
              <li>
                <Link to="/rooms?type=presidential" className="hover:text-[#2B3A2A] transition-colors">
                  Presidential Suite
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] mb-4">Concierge</h5>
            <p className="text-xs leading-relaxed text-[#2A2A28]/70">
              100 Coastal Boulevard, Riviera Bay<br />
              Direct: +1 (800) 555-4674<br />
              Desk: concierge@grandhorizon.hotel
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#E4DFD0] flex flex-col md:flex-row items-center justify-between text-xs text-[#2A2A28]/60">
          <p>&copy; {new Date().getFullYear()} Grand Horizon Hotel & Resort. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
