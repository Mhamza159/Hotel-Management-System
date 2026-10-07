import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  Compass,
  Award,
  ChevronLeft,
  ChevronRight,
  Heart,
  Calendar,
  Users,
  ArrowRight,
  Loader2,
  LogOut,
} from 'lucide-react';
import { roomService } from '../../services/room.service';
import { engagementService } from '../../services/engagement.service';
import { useBookingDraftStore } from '../../stores/useBookingDraftStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { ROLES } from '../../config/constants';
import Navbar from '../../components/guest/Navbar';

/**
 * ============================================================================
 * BOUTIQUE HOTEL PUBLIC MARKETING LANDING PAGE
 * ============================================================================
 * 
 * Warm boutique-hotel palette applied exclusively to the public landing page:
 * - --bg-cream:    #F5F1E8 (page canvas - warm ivory)
 * - --bg-card:     #FAF8F2 (search card, room cards)
 * - --forest:      #2B3A2A (primary dark accent)
 * - --forest-deep: #1F2B20 (hover / pressed state)
 * - --text-dark:   #2A2A28 (body text)
 * - --text-cream:  #F5F1E8 (hero contrast text)
 * - --gold-star:   #C9A15A (review star ratings)
 * - --border-soft: #E4DFD0 (hairline borders & dividers)
 * 
 * Typography:
 * - Headline serif: Playfair Display / Fraunces (upright "Stay," + italic "differently")
 * - Nav & labels: thin, letter-spaced uppercase sans-serif (Inter tracking 0.12em)
 * - Eyebrows: tracked caps in --forest (#2B3A2A)
 * - Room prices: tracked caps sans-serif "FROM $X / NIGHT"
 */
export const LandingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const setDraftDates = useBookingDraftStore((state) => state.setDates);
  const setDraftGuests = useBookingDraftStore((state) => state.setGuests);

  const [featuredRooms, setFeaturedRooms] = useState([]);
  const [dbReviews, setDbReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState(new Set());

  // Carousel ref for room catalog
  const carouselRef = useRef(null);

  // Compute default booking dates (Tomorrow -> +3 days)
  const today = new Date();
  const defaultCheckIn = new Date(today.setDate(today.getDate() + 1))
    .toISOString()
    .split('T')[0];
  const defaultCheckOut = new Date(today.setDate(today.getDate() + 3))
    .toISOString()
    .split('T')[0];

  const [checkInDate, setCheckInDate] = useState(defaultCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(2);
  const [dateError, setDateError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 1. Fetch available rooms and reviews on mount
  useEffect(() => {
    const checkIn = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const checkOut = new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0];

    roomService
      .getAvailableRooms({
        checkInDate: checkIn,
        checkOutDate: checkOut,
      })
      .then(async (data) => {
        const list = Array.isArray(data) ? data : data?.rooms || [];
        setFeaturedRooms(list);

        // Aggregate real reviews if available from first rooms
        if (list.length > 0) {
          try {
            const reviewPromises = list.slice(0, 3).map((r) =>
              roomService.getRoomReviews(r._id, { limit: 2 }).catch(() => null)
            );
            const reviewResults = await Promise.all(reviewPromises);
            const aggregated = [];
            reviewResults.forEach((res) => {
              const revs = res?.reviews || (Array.isArray(res) ? res : []);
              aggregated.push(...revs);
            });
            if (aggregated.length > 0) {
              setDbReviews(aggregated.slice(0, 3));
            }
          } catch (e) {
            console.warn('Reviews aggregation notice:', e);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load available suites:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 2. Carousel horizontal scroll control
  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 400;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // 3. Floating search card submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (!checkInDate || !checkOutDate) {
      setDateError('Please select both check-in and check-out dates.');
      return;
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setDateError('Check-out date must be after check-in date.');
      return;
    }

    setDateError('');
    setIsSearching(true);

    setDraftDates(checkInDate, checkOutDate);
    setDraftGuests(Number(guests));

    const params = new URLSearchParams({
      checkInDate,
      checkOutDate,
      capacity: String(guests),
    });

    navigate(`/rooms?${params.toString()}`);
    setTimeout(() => setIsSearching(false), 700);
  };

  // 4. Wishlist heart toggle handler
  const handleWishlistToggle = async (e, roomId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    const isSaved = wishlistIds.has(roomId);
    try {
      if (isSaved) {
        await engagementService.removeFromWishlist(roomId);
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
      } else {
        await engagementService.addToWishlist(roomId);
        setWishlistIds((prev) => new Set(prev).add(roomId));
      }
    } catch (err) {
      console.error('Wishlist error:', err);
    }
  };

  // 5. Auth sign out handler
  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true, state: {} });
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case ROLES.RECEPTIONIST:
        return '/desk';
      case ROLES.HOUSEKEEPING:
        return '/housekeeping';
      case ROLES.SUPER_ADMIN:
        return '/admin/staff';
      default:
        return '/dashboard';
    }
  };

  // Pull real room photo for hero background (fallback to luxury boutique shot)
  const heroImage =
    featuredRooms.find((r) => r.images?.[0]?.url)?.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2000&q=85';

  // Curated boutique fallback reviews
  const fallbackReviews = [
    {
      rating: 5,
      comment:
        'A sanctuary in every sense. The acoustic calm, bespoke organic linens, and discreet keyless arrival set an entirely new standard for boutique hospitality.',
      guestName: 'Sophia Montgomery',
      location: 'New York, USA',
      avatar: 'SM',
    },
    {
      rating: 5,
      comment:
        'The architectural harmony and ocean vistas are remarkable. The digital concierge anticipated every dining reservation with flawless attention to detail.',
      guestName: 'Julian Vance',
      location: 'London, UK',
      avatar: 'JV',
    },
    {
      rating: 5,
      comment:
        'Deep, restorative quiet. The natural light, morning coastal breeze, and warm materials make it impossible not to exhale the moment you step through the doors.',
      guestName: 'Elena Rostova',
      location: 'Geneva, Switzerland',
      avatar: 'ER',
    },
  ];

  const displayReviews =
    dbReviews.length >= 3
      ? dbReviews.map((r, i) => ({
          rating: r.rating || 5,
          comment: r.comment || fallbackReviews[i % 3].comment,
          guestName: r.guest?.name || r.guestName || fallbackReviews[i % 3].guestName,
          location: fallbackReviews[i % 3].location,
          avatar: (r.guest?.name || fallbackReviews[i % 3].guestName).charAt(0),
        }))
      : fallbackReviews;

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] antialiased selection:bg-[#2B3A2A] selection:text-[#F5F1E8]">
      {/* =====================================================================
          1. HERO SECTION WITH FULL-BLEED REAL ROOM PHOTO & TRANSPARENT NAVBAR
         ===================================================================== */}
      <section className="relative min-h-[90vh] flex flex-col justify-between overflow-hidden bg-[#2B3A2A]">
        {/* Full-bleed real room photo as background */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Grand Horizon Suite"
            className="w-full h-full object-cover object-center scale-105"
          />
          {/* Subtle warm boutique gradient overlay ensuring contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1F2B20]/80 via-[#2B3A2A]/50 to-[#2B3A2A]/85" />
        </div>

        {/* 1. Transparent Nav Bar Overlaid on Hero */}
        <Navbar transparent />

        {/* 2. Hero Headline & Subheading */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full pt-12 pb-28">
          <div className="max-w-3xl text-left">
            {/* Signature Headline: Upright "Stay," + Italic "differently" */}
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-playfair text-6xl sm:text-7xl lg:text-9xl text-[#F5F1E8] tracking-tight leading-[0.98] mb-6 drop-shadow-sm"
            >
              <span className="block font-normal">Stay,</span>
              <span className="block italic font-light">differently</span>
            </motion.h1>

            {/* Small Tracked Subheading Beneath (2 lines) */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-[#F5F1E8]/90 text-xs sm:text-sm font-sans tracking-[0.15em] uppercase font-normal max-w-xl leading-relaxed"
            >
              Autonomous Key Issuance &bull; Intelligent Concierge
              <br />
              Guaranteed Coastal Serenity
            </motion.p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. FLOATING SEARCH CARD (Overlaps bottom edge of Hero)
         ===================================================================== */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20">
        <form
          onSubmit={handleSearch}
          className="bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-5 sm:p-7 shadow-[0_16px_40px_rgba(43,58,42,0.10)]"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            {/* Check-In Date */}
            <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#E4DFD0] hover:border-[#2B3A2A] transition-colors">
              <label className="text-[10px] font-sans font-medium text-[#2B3A2A] uppercase tracking-[0.14em] block mb-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2B3A2A]" />
                <span>Check-In</span>
              </label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-[#2A2A28] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Check-Out Date */}
            <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#E4DFD0] hover:border-[#2B3A2A] transition-colors">
              <label className="text-[10px] font-sans font-medium text-[#2B3A2A] uppercase tracking-[0.14em] block mb-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2B3A2A]" />
                <span>Check-Out</span>
              </label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-[#2A2A28] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Guests Counter */}
            <div className="p-3 bg-[#FAF8F2] rounded-xl border border-[#E4DFD0] hover:border-[#2B3A2A] transition-colors">
              <label className="text-[10px] font-sans font-medium text-[#2B3A2A] uppercase tracking-[0.14em] block mb-1 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-[#2B3A2A]" />
                <span>Guests</span>
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full bg-transparent text-sm font-medium text-[#2A2A28] focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-[#FAF8F2] text-[#2A2A28]">
                  1 Guest
                </option>
                <option value={2} className="bg-[#FAF8F2] text-[#2A2A28]">
                  2 Guests
                </option>
                <option value={3} className="bg-[#FAF8F2] text-[#2A2A28]">
                  3 Guests
                </option>
                <option value={4} className="bg-[#FAF8F2] text-[#2A2A28]">
                  4+ Guests
                </option>
              </select>
            </div>

            {/* Solid --forest Pill Button */}
            <div className="flex flex-col justify-end">
              <button
                type="submit"
                disabled={isSearching}
                className="w-full h-[52px] bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] font-sans text-xs font-semibold tracking-[0.14em] uppercase rounded-full shadow-sm transition-all duration-200 flex items-center justify-center space-x-2 active:scale-95 cursor-pointer disabled:opacity-75"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#F5F1E8]" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Check Availability</span>
                )}
              </button>
            </div>
          </div>

          {dateError && (
            <div className="mt-3 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {dateError}
            </div>
          )}

          {/* Quiet Luxury Reassurance */}
          <div className="mt-4 pt-3 border-t border-[#E4DFD0] flex items-center justify-center sm:justify-start gap-4 text-[11px] text-[#2A2A28]/70 font-sans tracking-wide">
            <span className="flex items-center gap-1.5">
              <span className="text-[#2B3A2A] font-bold">✓</span> Best Rate Guarantee
            </span>
            <span className="text-[#E4DFD0]">&bull;</span>
            <span>Autonomous Key Issuance</span>
            <span className="text-[#E4DFD0] hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline">Guaranteed Peaceful Stay</span>
          </div>
        </form>
      </div>

      {/* =====================================================================
          3. ROOM CATALOG ("OUR ROOMS") — HORIZONTAL CAROUSEL
         ===================================================================== */}
      <section className="py-24 sm:py-32 bg-[#F5F1E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Eyebrow & Header with Outside Circular Arrow Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
            <div>
              <span className="text-xs font-sans font-semibold uppercase tracking-[0.16em] text-[#2B3A2A] block mb-3">
                Our Rooms
              </span>
              <h2 className="font-playfair text-3xl sm:text-5xl font-normal text-[#2A2A28] tracking-tight">
                Curated for rest. Designed for living.
              </h2>
            </div>

            {/* Dark --forest circle, white icon controls outside card row */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                aria-label="Previous suites"
                className="w-12 h-12 rounded-full bg-[#2B3A2A] hover:bg-[#1F2B20] text-white flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel('right')}
                aria-label="Next suites"
                className="w-12 h-12 rounded-full bg-[#2B3A2A] hover:bg-[#1F2B20] text-white flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Horizontal Carousel Row */}
          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto scroll-smooth pb-6 pt-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading ? (
              [1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="w-[320px] sm:w-[380px] h-[460px] shrink-0 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] animate-pulse"
                />
              ))
            ) : featuredRooms.length > 0 ? (
              featuredRooms.map((room) => {
                const photo =
                  room.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';
                const isSaved = wishlistIds.has(room._id);

                return (
                  <motion.div
                    key={room._id}
                    layoutId={`room-card-${room._id}`}
                    className="w-[320px] sm:w-[380px] shrink-0 snap-start bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[#2B3A2A]/40 shadow-[0_4px_20px_rgba(43,58,42,0.04)] group"
                  >
                    <div>
                      {/* Photo Container with Preserved Framer Motion Shared Element Transition */}
                      <div className="relative h-64 overflow-hidden bg-[#FAF8F2]">
                        <motion.img
                          layoutId={`room-img-${room._id}`}
                          src={photo}
                          alt={`${room.type} Suite`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                        {/* Room Type Pill */}
                        <div className="absolute top-3.5 left-3.5 bg-[#FAF8F2]/95 border border-[#E4DFD0] px-3 py-1 rounded-full text-[10px] font-sans font-medium uppercase tracking-[0.14em] text-[#2B3A2A]">
                          {room.type}
                        </div>

                        {/* Wishlist Heart */}
                        <div className="absolute top-3.5 right-3.5">
                          <button
                            type="button"
                            onClick={(e) => handleWishlistToggle(e, room._id)}
                            title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                              isSaved
                                ? 'bg-rose-500 border-rose-500 text-white'
                                : 'bg-[#FAF8F2]/90 border-[#E4DFD0] text-[#2A2A28] hover:text-rose-500'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6">
                        <h3 className="font-playfair text-2xl font-normal text-[#2A2A28] capitalize mb-2">
                          {room.type} Suite
                        </h3>
                        <p className="text-xs text-[#2A2A28]/70 leading-relaxed line-clamp-1 mb-4">
                          {room.description ||
                            'Acoustic isolation, climate zoning, and bespoke organic linens.'}
                        </p>

                        <div className="flex items-center space-x-4 text-[11px] font-sans text-[#2A2A28]/60 uppercase tracking-[0.12em]">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-[#2B3A2A]" />
                            <span>{room.capacity} Guests</span>
                          </span>
                          <span>&bull;</span>
                          <span>King Bed</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 pb-6 pt-3 border-t border-[#E4DFD0] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-sans tracking-[0.14em] uppercase font-semibold text-[#2B3A2A] block">
                          FROM ${room.pricePerNight} / NIGHT
                        </span>
                      </div>

                      <Link
                        to={`/rooms/${room._id}`}
                        className="px-4 py-2 rounded-full border border-[#2B3A2A] hover:bg-[#2B3A2A] hover:text-[#F5F1E8] text-[#2B3A2A] text-xs font-sans font-medium tracking-[0.12em] uppercase transition-all duration-200"
                      >
                        Explore
                      </Link>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="w-full text-center py-16 bg-[#FAF8F2] rounded-2xl border border-[#E4DFD0]">
                <p className="text-sm text-[#2A2A28]/70 font-sans">
                  Our suites are currently updating availability.
                </p>
                <Link
                  to="/rooms"
                  className="mt-4 inline-block text-xs font-semibold tracking-wider uppercase text-[#2B3A2A] underline"
                >
                  Browse Full Room Catalog
                </Link>
              </div>
            )}
          </div>

          {/* View All Suites Discovery Link */}
          <div className="mt-12 text-center">
            <Link
              to="/rooms"
              className="inline-flex items-center space-x-2 text-xs font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] hover:text-[#1F2B20] transition-colors"
            >
              <span>Discover All Accommodations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. GUEST REVIEWS SECTION (Three-column card row)
         ===================================================================== */}
      <section className="py-24 sm:py-32 bg-[#F5F1E8] border-t border-[#E4DFD0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-sans font-semibold uppercase tracking-[0.16em] text-[#2B3A2A] block mb-3">
              Guest Reviews
            </span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-normal text-[#2A2A28] tracking-tight">
              Quiet impressions from verified stays.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {displayReviews.map((rev, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] flex flex-col justify-between shadow-[0_4px_20px_rgba(43,58,42,0.03)]"
              >
                <div>
                  {/* Star Rating in Gold Star token (#C9A15A) */}
                  <div className="flex text-[#C9A15A] text-sm tracking-widest mb-5">
                    {'★'.repeat(rev.rating || 5)}
                  </div>
                  {/* Quote in serif italic */}
                  <p className="font-playfair italic text-[#2A2A28] text-base sm:text-lg leading-relaxed mb-6 font-normal">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[#E4DFD0]">
                  <div className="w-10 h-10 rounded-full bg-[#2B3A2A] text-[#F5F1E8] font-sans font-semibold flex items-center justify-center text-xs">
                    {rev.avatar || rev.guestName?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#2A2A28]">
                      {rev.guestName}
                    </h4>
                    <p className="text-[11px] text-[#2A2A28]/60 tracking-wide">
                      {rev.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. FEATURE STRIP (Four-Column Value Pillars)
         ===================================================================== */}
      <section className="py-16 sm:py-20 bg-[#FAF8F2] border-t border-[#E4DFD0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Col 1 */}
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mb-4">
                <Sparkles className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] mb-1.5">
                Boutique Comfort
              </h4>
              <p className="text-xs text-[#2A2A28]/70 leading-relaxed font-sans">
                Acoustic isolation, climate zoning, and bespoke organic linens for unbroken rest.
              </p>
            </div>

            {/* Col 2 */}
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mb-4">
                <Compass className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] mb-1.5">
                Prime Locations
              </h4>
              <p className="text-xs text-[#2A2A28]/70 leading-relaxed font-sans">
                Direct access to coastal promenades, cultural enclaves, and tranquil horizons.
              </p>
            </div>

            {/* Col 3 */}
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mb-4">
                <Award className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] mb-1.5">
                Local Experiences
              </h4>
              <p className="text-xs text-[#2A2A28]/70 leading-relaxed font-sans">
                Artisan culinary pairings, private sea crossings, and bespoke concierge journeys.
              </p>
            </div>

            {/* Col 4 */}
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mb-4">
                <ShieldCheck className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] mb-1.5">
                Safe & Secure
              </h4>
              <p className="text-xs text-[#2A2A28]/70 leading-relaxed font-sans">
                Contactless digital credentials, verified guest privacy, and 24/7 dedicated support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. BOUTIQUE LANDING FOOTER STRIP
         ===================================================================== */}
      <footer className="py-12 bg-[#F5F1E8] border-t border-[#E4DFD0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex flex-col text-center md:text-left">
              <span className="font-playfair text-lg font-normal text-[#2B3A2A]">
                Grand Horizon
              </span>
              <span className="text-[9px] font-sans tracking-[0.2em] uppercase text-[#2A2A28]/60">
                Boutique Hotel &bull; Riviera Bay
              </span>
            </div>

            {/* Nav */}
            <div className="flex items-center space-x-6 text-xs font-sans tracking-[0.12em] uppercase text-[#2A2A28]/70">
              <Link to="/rooms" className="hover:text-[#2B3A2A] transition-colors">
                Rooms
              </Link>
              <Link to="/concierge" className="hover:text-[#2B3A2A] transition-colors">
                Concierge
              </Link>
              <Link to="/login" className="hover:text-[#2B3A2A] transition-colors">
                Sign In
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-xs text-[#2A2A28]/60 font-sans">
              &copy; {new Date().getFullYear()} Grand Horizon Hotel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
