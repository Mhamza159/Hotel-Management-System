import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  CalendarCheck,
  Calendar,
  Heart,
  Clock,
  ArrowRight,
  FileDown,
  BedDouble,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { engagementService } from '../../services/engagement.service';
import { bookingService } from '../../services/booking.service';
import { Navbar } from '../../components/guest/Navbar';
import { Footer } from '../../components/guest/Footer';
import { BookingStatusBadge } from '../../components/common/BookingStatusBadge';

/**
 * ============================================================================
 * GUEST PORTAL DASHBOARD (/dashboard)
 * ============================================================================
 */
export const GuestDashboardPage = () => {
  const { user } = useAuthStore();
  const [loyalty, setLoyalty] = useState({ loyaltyPoints: 0, discountValue: 0 });
  const [bookings, setBookings] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [loyaltyRes, bookingsRes, wishlistRes, waitlistRes] = await Promise.allSettled([
          engagementService.getLoyaltyBalance(),
          bookingService.getMyBookings({ limit: 5 }),
          engagementService.getWishlist(),
          engagementService.getWaitlists(),
        ]);

        if (loyaltyRes.status === 'fulfilled') {
          setLoyalty(loyaltyRes.value || { loyaltyPoints: 0, discountValue: 0 });
        }
        if (bookingsRes.status === 'fulfilled') {
          setBookings(bookingsRes.value?.bookings || []);
        }
        if (wishlistRes.status === 'fulfilled') {
          const list = wishlistRes.value?.wishlist || [];
          setWishlistCount(list.length);
        }
        if (waitlistRes.status === 'fulfilled') {
          const list = waitlistRes.value?.waitlists || [];
          setWaitlistCount(list.length);
        }
      } catch (err) {
        console.error('Failed to load guest dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Outlined Pill Badge for Loyalty Tier
  const getTier = (points) => {
    if (points >= 1500) {
      return {
        name: 'Platinum Tier',
        badge: 'border-[#2B3A2A] text-[#2B3A2A]',
      };
    }
    if (points >= 500) {
      return {
        name: 'Gold Tier',
        badge: 'border-[#C9A15A] text-[#C9A15A]',
      };
    }
    return {
      name: 'Silver Tier',
      badge: 'border-[#8C8578] text-[#8C8578]',
    };
  };

  const tier = getTier(loyalty.loyaltyPoints);

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* ===================================================================
            1. WELCOME BANNER
           =================================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4DFD0] pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#FAF8F2] text-[#2B3A2A] border border-[#E4DFD0]">
                Guest Experience Portal
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#2B3A2A]">
                <span className="w-2 h-2 rounded-full bg-[#2B3A2A] animate-pulse" />
                <span>Verified Stay Telemetry</span>
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
              Welcome back, {user?.name || 'Valued Guest'}
            </h1>
            <p className="text-xs text-[#2A2A28]/70 mt-1.5">
              Grand Horizon Resident &bull; {user?.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/rooms"
              className="px-4 py-2.5 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold uppercase tracking-wider transition-all shadow-sm active:scale-98"
            >
              Book Another Suite &rarr;
            </Link>
          </div>
        </div>

        {/* ===================================================================
            2. METRIC & LOYALTY OVERVIEW (3-Panel Grid)
           =================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Loyalty Points */}
          <div className="p-6 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider text-[#2A2A28]/70 font-semibold">
                  Loyalty Points Balance
                </span>
                <div className="w-9 h-9 rounded-lg bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A]">
                  <Award className="w-4 h-4" />
                </div>
              </div>

              {/* Large Gold Number for Points Balance */}
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-serif text-4xl sm:text-5xl font-bold text-[#C9A15A]">
                  {loyalty.loyaltyPoints}
                </span>
                <span className="text-xs text-[#2A2A28]/70 font-medium">points</span>
              </div>

              {/* Outlined-Pill Badge for Tier + Dollar-Equivalent in Text-Muted */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#F5F1E8] border uppercase tracking-wider ${tier.badge}`}
                >
                  {tier.name}
                </span>
                <span className="text-xs text-[#2A2A28]/70">
                  ${(loyalty.discountValue || 0).toFixed(2)} in Stay Credits
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#2A2A28]/60 mt-5 pt-3 border-t border-[#E4DFD0]">
              Earn 1 point per $10 spent on completed stays. Redeemable directly at checkout.
            </p>
          </div>

          {/* Card 2: Reservations Record */}
          <div className="p-6 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider text-[#2A2A28]/70 font-semibold">
                  Reservations & Stays
                </span>
                <div className="w-9 h-9 rounded-lg bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A]">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-serif text-4xl sm:text-5xl font-bold text-[#2A2A28]">
                  {bookings.length}
                </span>
                <span className="text-xs text-[#2A2A28]/70 font-medium">recorded stays</span>
              </div>

              <div className="mt-3">
                <Link
                  to="/my-bookings"
                  className="text-xs font-semibold text-[#2B3A2A] hover:underline flex items-center gap-1.5"
                >
                  <span>Manage All Bookings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <p className="text-[11px] text-[#2A2A28]/60 mt-5 pt-3 border-t border-[#E4DFD0]">
              Download tax invoices, audit requests, or view stay telemetry.
            </p>
          </div>

          {/* Card 3: Saved & Alerts */}
          <div className="p-6 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider text-[#2A2A28]/70 font-semibold">
                  Saved & Alerts
                </span>
                <div className="w-9 h-9 rounded-lg bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#B5533C]">
                  <Heart className="w-4 h-4" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-serif text-3xl font-bold text-[#2A2A28] block mb-0.5">
                    {wishlistCount}
                  </span>
                  <Link
                    to="/wishlist"
                    className="text-xs text-[#2B3A2A] hover:underline flex items-center gap-1"
                  >
                    <span>Wishlist</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div>
                  <span className="font-serif text-3xl font-bold text-[#2A2A28] block mb-0.5">
                    {waitlistCount}
                  </span>
                  <Link
                    to="/waitlist"
                    className="text-xs text-[#2B3A2A] hover:underline flex items-center gap-1"
                  >
                    <span>Date Alerts</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#2A2A28]/60 mt-5 pt-3 border-t border-[#E4DFD0]">
              Get notified immediately when sold-out dates or premium suites become available.
            </p>
          </div>
        </div>

        {/* ===================================================================
            3. RECENT / UPCOMING BOOKINGS LIST (Cards with Outlined Status Pills)
           =================================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2A2A28]">
                Recent & Upcoming Stays
              </h2>
              <p className="text-xs text-[#2A2A28]/70 mt-0.5">
                Active room allocations and past residency records
              </p>
            </div>
            <Link
              to="/my-bookings"
              className="text-xs text-[#2B3A2A] hover:underline font-semibold"
            >
              View All Reservations &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] animate-pulse"
                />
              ))}
            </div>
          ) : bookings.length > 0 ? (
            <div className="space-y-3.5">
              {bookings.slice(0, 3).map((b) => {
                const thumb =
                  b.room?.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=400&q=80';

                return (
                  <div
                    key={b._id}
                    className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] shadow-sm hover:border-[#2B3A2A]/40 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#F5F1E8] shrink-0 border border-[#E4DFD0]">
                          <img
                            src={thumb}
                            alt="Suite preview"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2A2A28] capitalize">
                              {b.room?.type ? `${b.room.type} Suite` : 'Grand Horizon Suite'}
                            </h3>
                            {/* Unified Outlined Status Pill Badge */}
                            <BookingStatusBadge status={b.status} />
                          </div>

                          <p className="font-mono text-xs text-[#2B3A2A] font-semibold">
                            Ref: #{b.bookingReference}
                          </p>

                          <p className="text-xs text-[#2A2A28]/70 flex items-center gap-1.5 pt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-[#2B3A2A]" />
                            <span>
                              {new Date(b.checkInDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                              {' \u2192 '}
                              {new Date(b.checkOutDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Price & Actions */}
                      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#E4DFD0]">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] font-mono uppercase text-[#2A2A28]/60 block">
                            Total Reservation
                          </span>
                          <span className="font-serif text-xl font-bold text-[#C9A15A]">
                            ${(b.totalPrice || b.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/my-bookings/${b._id}`}
                            className="px-3.5 py-1.5 rounded-xl bg-[#FAF8F2] hover:bg-[#F5F1E8] border border-[#E4DFD0] text-xs font-semibold text-[#2A2A28] transition-colors"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() =>
                              bookingService.downloadInvoice(b._id, b.bookingReference)
                            }
                            title="Download Tax Invoice"
                            className="p-2 rounded-xl bg-[#FAF8F2] hover:bg-[#F5F1E8] border border-[#E4DFD0] text-[#2B3A2A] hover:text-[#1F2B20] transition-colors cursor-pointer"
                          >
                            <FileDown className="w-4 h-4 text-[#2B3A2A]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] text-center shadow-sm space-y-3">
              <CalendarCheck className="w-8 h-8 text-[#2B3A2A] mx-auto opacity-40" />
              <p className="text-sm text-[#2A2A28]/70">
                You have no active or upcoming stays recorded yet.
              </p>
              <Link
                to="/rooms"
                className="inline-block text-xs font-semibold text-[#2B3A2A] hover:underline"
              >
                Explore Available Suites &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* ===================================================================
            4. QUICK SHORTCUTS GRID
           =================================================================== */}
        <div>
          <h2 className="text-xs uppercase tracking-wider text-[#2A2A28]/70 font-bold font-mono mb-4">
            Guest Navigation & Shortcuts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/my-bookings"
              className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] hover:border-[#2B3A2A] transition-all shadow-sm group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mb-3 group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-[#2A2A28] block">Stay History</span>
              <span className="text-xs text-[#2A2A28]/70">Manage reservations & receipts</span>
            </Link>

            <Link
              to="/wishlist"
              className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] hover:border-[#B5533C] transition-all shadow-sm group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#B5533C] mb-3 group-hover:scale-105 transition-transform">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-[#2A2A28] block">
                Saved Suites ({wishlistCount})
              </span>
              <span className="text-xs text-[#2A2A28]/70">Your curated wishlist</span>
            </Link>

            <Link
              to="/waitlist"
              className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] hover:border-[#2B3A2A] transition-all shadow-sm group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mb-3 group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-[#2A2A28] block">
                Availability Alerts ({waitlistCount})
              </span>
              <span className="text-xs text-[#2A2A28]/70">Sold-out date subscriptions</span>
            </Link>

            <Link
              to="/rooms"
              className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] hover:border-[#2B3A2A] transition-all shadow-sm group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mb-3 group-hover:scale-105 transition-transform">
                <BedDouble className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-[#2A2A28] block">Resort Collection</span>
              <span className="text-xs text-[#2A2A28]/70">Browse all luxury suites</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuestDashboardPage;
