import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  ShieldCheck,
  Star,
  ArrowLeft,
  Sparkles,
  Lock,
  Heart,
  Share2,
  MapPin,
  Tv,
  Wifi,
  Wind,
  Volume2,
  Clock,
  Coffee,
  Utensils,
  CheckCircle2,
  FileDown,
  Check,
  Copy,
  AlertCircle,
  Tag,
  Award,
  ChevronDown,
  CreditCard,
  Banknote,
  Phone,
  User,
  Mail,
  X,
  Loader2,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import ContactMarquee from '../../components/guest/ContactMarquee';
import { KeycardLoader } from '../../components/common/KeycardLoader';
import { roomService } from '../../services/room.service';
import { bookingService } from '../../services/booking.service';
import { engagementService } from '../../services/engagement.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBookingDraftStore } from '../../stores/useBookingDraftStore';
import { PAYMENT_PROVIDERS } from '../../config/constants';

// Luxury Curated Amenities matching Modern Hoteling System
const STANDARD_AMENITIES = [
  { name: 'Air Conditioning', icon: Wind, desc: 'Individual climate control' },
  { name: 'Flat-Screen TV', icon: Tv, desc: '55" 4K Smart TV with streaming' },
  { name: 'High-Speed Wi-Fi', icon: Wifi, desc: 'Complimentary gigabit access' },
  { name: 'Electronic Safe', icon: ShieldCheck, desc: 'Laptop-sized digital vault' },
  { name: 'Sound System', icon: Volume2, desc: 'Bluetooth acoustic soundbar' },
  { name: 'Vanity Mirror', icon: Sparkles, desc: 'LED illuminated grooming mirror' },
  { name: 'Bathtubs & Shower', icon: Bath, desc: 'Italian marble deep soak tub' },
  { name: 'Seating Area', icon: Users, desc: 'Plush velvet designer lounge' },
  { name: 'Alarm Clock', icon: Clock, desc: 'Dual-charging bedside clock' },
  { name: '24/7 Room Service', icon: Utensils, desc: 'Artisanal chef dining to room' },
  { name: 'Nespresso Bar', icon: Coffee, desc: 'Organic teas & premium roasts' },
  { name: 'Plush Bathrobes', icon: Sparkles, desc: 'Waffle-weave cotton & slippers' },
];

export const RoomDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);

  // Draft Store Sync
  const draft = useBookingDraftStore();
  const setDraftDates = useBookingDraftStore((state) => state.setDates);

  // Initial State Setup
  const [room, setRoom] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  // Reservation Form State (Sticky Sidebar)
  const [guestName, setGuestName] = useState(draft.guestName || user?.name || '');
  const [guestPhone, setGuestPhone] = useState(draft.guestPhone || user?.phone || '');
  const [guestEmail, setGuestEmail] = useState(draft.guestEmail || user?.email || '');
  
  const [checkInDate, setCheckInDate] = useState(
    searchParams.get('checkInDate') ||
    draft.checkInDate ||
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [checkOutDate, setCheckOutDate] = useState(
    searchParams.get('checkOutDate') ||
    draft.checkOutDate ||
    new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0]
  );

  const [adults, setAdults] = useState(draft.adults || 1);
  const [children, setChildren] = useState(draft.children || 0);
  const [numberOfRooms, setNumberOfRooms] = useState(1);
  const [specialRequests, setSpecialRequests] = useState(draft.specialRequests || '');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_PROVIDERS.CASH);

  // Discounts & Loyalty State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState({ loyaltyPoints: 0, discountValue: 0 });

  // Submission & Confirmation Modal State
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Sync user profile when user logs in
  useEffect(() => {
    if (user) {
      if (!guestName) setGuestName(user.name || '');
      if (!guestPhone) setGuestPhone(user.phone || '');
      if (!guestEmail) setGuestEmail(user.email || '');
      
      engagementService.getLoyaltyBalance()
        .then((res) => setLoyaltyBalance(res || { loyaltyPoints: 0, discountValue: 0 }))
        .catch(() => {});
    }
  }, [user]);

  // Compute Nights
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Financial Calculations
  const baseRate = room?.pricePerNight || 0;
  const roomSubtotal = baseRate * nights * numberOfRooms;
  const hospitalityTax = Math.round(roomSubtotal * 0.1); // 10% hospitality & resort tax

  // Promo Discount Calculation
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercentage) {
      couponDiscount = Math.round((roomSubtotal * appliedCoupon.discountPercentage) / 100);
    } else if (appliedCoupon.discountAmount) {
      couponDiscount = Math.min(roomSubtotal, appliedCoupon.discountAmount);
    }
  }

  // Loyalty Discount Calculation ($10 for every 100 pts)
  const loyaltyDiscount = redeemPoints ? Math.min(roomSubtotal - couponDiscount, loyaltyBalance.discountValue || 0) : 0;
  const totalDiscount = couponDiscount + loyaltyDiscount;
  const grandTotal = Math.max(0, roomSubtotal + hospitalityTax - totalDiscount);

  // Fetch Room & Engagement Details
  useEffect(() => {
    setLoading(true);
    Promise.all([
      roomService.getRoomDetails(id),
      roomService.getRoomReviews(id, { limit: 5 }).catch(() => ({ reviews: [] })),
      user ? engagementService.getWishlist().catch(() => []) : Promise.resolve([]),
    ])
      .then(([roomData, reviewsData, wList]) => {
        setRoom(roomData.room || roomData);
        setReviews(reviewsData.reviews || []);
        setInWishlist(wList.some((item) => (typeof item === 'string' ? item === id : item._id === id)));
      })
      .catch((err) => {
        console.error('Failed to load room details:', err);
        setError(err.message || 'Unable to load room details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, user]);

  // Handle Share Room Link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  // Toggle Wishlist
  const handleToggleWishlist = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    try {
      if (inWishlist) {
        await engagementService.removeFromWishlist(id);
        setInWishlist(false);
      } else {
        await engagementService.addToWishlist(id);
        setInWishlist(true);
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
    }
  };

  // Apply Coupon Action
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      const code = couponCode.trim().toUpperCase();
      if (code === 'WELCOME10') {
        setAppliedCoupon({ code: 'WELCOME10', discountPercentage: 10 });
      } else {
        setAppliedCoupon({ code, discountPercentage: 10 });
      }
    } catch (err) {
      setCouponError('Invalid or expired coupon code.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Submit Reservation
  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    if (!room) return;

    // Validate dates
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setBookingError('Check-out date must be strictly after Check-in date.');
      return;
    }

    // Capacity validation
    const totalGuests = Number(adults) + Number(children);
    if (totalGuests > room.capacity * numberOfRooms) {
      setBookingError(`Maximum occupancy for this selection is ${room.capacity * numberOfRooms} guests.`);
      return;
    }

    // Save draft in store
    setDraftDates(checkInDate, checkOutDate);
    useBookingDraftStore.setState({
      selectedRooms: [room],
      numberOfGuests: totalGuests,
      adults: Number(adults),
      children: Number(children),
      guestName,
      guestPhone,
      guestEmail,
      specialRequests,
      paymentMethod,
    });

    // If guest is not logged in, redirect to login preserving intent
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setSubmitting(true);
      setBookingError('');

      const payload = {
        rooms: [{ roomId: room._id, pricePerNight: room.pricePerNight }],
        checkInDate,
        checkOutDate,
        numberOfGuests: totalGuests,
        specialRequests: specialRequests.trim() || undefined,
        paymentMethod,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        redeemLoyaltyPoints: redeemPoints,
      };

      const res = await bookingService.createBooking(payload);
      setConfirmedBooking(res.booking || res.data || res);
      useBookingDraftStore.getState().clearDraft();
    } catch (err) {
      console.error('Reservation creation failed:', err);
      setBookingError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to process reservation. Please check room availability or try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <GuestLayout>
        <div className="py-24">
          <KeycardLoader message="Preparing luxury suite inspection..." />
        </div>
      </GuestLayout>
    );
  }

  if (error || !room) {
    return (
      <GuestLayout>
        <div className="max-w-md mx-auto my-24 p-8 bg-[#FAF8F2] border border-[#E4DFD0] rounded-xl text-center">
          <h2 className="text-lg font-bold text-rose-600 mb-2">Suite Not Found</h2>
          <p className="text-xs text-[#2A2A28]/70 mb-6">
            {error || 'This room is either inactive or does not exist.'}
          </p>
          <Link
            to="/rooms"
            className="px-4 py-2 bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold rounded-lg transition-colors"
          >
            Browse Available Suites
          </Link>
        </div>
      </GuestLayout>
    );
  }

  const images =
    room.images && room.images.length > 0
      ? room.images
      : [
          {
            url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          },
        ];

  // Derive specs
  const bedCount = room.type === 'double' ? '2 Beds' : room.type === 'presidential' ? 'King Master' : '1 Bed';
  const bathCount = room.type === 'presidential' || room.type === 'suite' ? '2 Baths' : '1 Bath';
  const sqft = room.type === 'presidential' ? '750 sqft' : room.type === 'suite' ? '500 sqft' : '300 sqft';

  return (
    <GuestLayout>
      {/* 1. TOP ANNOUNCEMENT / CONTACT MARQUEE BAR */}
      <ContactMarquee />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-[#F5F1E8]">
        {/* Navigation Breadcrumb */}
        <Link
          to={`/rooms?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`}
          className="inline-flex items-center space-x-1.5 text-xs text-[#2A2A28]/70 hover:text-[#2B3A2A] transition-colors mb-6 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Available Rooms</span>
        </Link>

        {/* 2-Column Master Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================================================================ */}
          {/* LEFT COLUMN: Suite Specs, Overview, Amenities, Rules (7 Cols)   */}
          {/* ================================================================ */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Gallery Showcase with Shared layoutId */}
            <div className="rounded-2xl overflow-hidden border border-[#E4DFD0] bg-[#FAF8F2] shadow-sm p-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* 4 Thumbnails on Left (Desktop) */}
                <div className="hidden md:flex flex-col gap-2.5 col-span-1">
                  {images.slice(0, 4).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-[#2B3A2A] shadow-sm'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                {/* Primary Main Viewport Image */}
                <div className="relative h-72 sm:h-96 md:col-span-4 rounded-xl overflow-hidden bg-[#E4DFD0]">
                  <motion.img
                    layoutId={`room-img-${room._id}`}
                    key={activeImageIndex}
                    initial={{ opacity: 0.85 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    src={images[activeImageIndex]?.url}
                    alt={`${room.type} Suite`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 rounded-lg bg-[#FAF8F2]/90 border border-[#E4DFD0] text-xs font-mono font-semibold text-[#2B3A2A] uppercase tracking-wider backdrop-blur-sm">
                      {room.type} Suite Gallery
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Thumbnails Scrollbar */}
              {images.length > 1 && (
                <div className="md:hidden mt-3 pt-2 border-t border-[#E4DFD0] flex space-x-2 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        activeImageIndex === idx
                          ? 'border-[#2B3A2A]'
                          : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={img.url} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Top Room Banner Card */}
            <div className="bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
              {/* Row 1: Title, Category Pill, Star Rating */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#2A2A28] capitalize">
                    {room.type ? `${room.type} Suite` : 'Standard Suite'}
                  </h1>
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#FAF8F2] border border-[#2B3A2A]/40 text-[#2B3A2A] uppercase tracking-wider">
                    Luxury Enclave
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-[#FAF8F2] border border-[#2B3A2A]/40 text-[#2B3A2A]">
                    Unit Allotted at Check-in
                  </span>
                </div>

                {/* Rating Badge */}
                <div className="flex items-center space-x-1.5 bg-[#F5F1E8] px-3 py-1 rounded-full border border-[#E4DFD0]">
                  <Star className="w-4 h-4 fill-[#C9A15A] text-[#C9A15A]" />
                  <span className="text-xs font-bold text-[#2A2A28]">4.9</span>
                  <span className="text-xs text-[#2A2A28]/70">(245 Verified Reviews)</span>
                </div>
              </div>

              {/* Row 2: Location Address with Pin */}
              <div className="flex items-center space-x-2 text-xs text-[#2A2A28]/70">
                <MapPin className="w-4 h-4 text-[#2B3A2A] shrink-0" />
                <span>Grand Horizon Promenade, Coastal Sanctuary</span>
              </div>

              {/* Row 3: Nightly Price Highlight */}
              <div className="flex items-baseline space-x-2">
                <span className="font-serif text-3xl font-bold text-[#2B3A2A]">
                  ${room.pricePerNight}
                </span>
                <span className="text-sm font-medium text-[#2A2A28]/70">/ night</span>
              </div>

              {/* Row 4: Quick Specs Pill Bar + Share Button */}
              <div className="pt-4 border-t border-[#E4DFD0] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[#2A2A28]">
                  {/* Bed */}
                  <div className="flex items-center space-x-1.5">
                    <Bed className="w-4 h-4 text-[#2B3A2A]" />
                    <span className="font-medium text-[#2A2A28]">{bedCount}</span>
                  </div>
                  {/* Bath */}
                  <div className="flex items-center space-x-1.5">
                    <Bath className="w-4 h-4 text-[#2B3A2A]" />
                    <span className="font-medium text-[#2A2A28]">{bathCount}</span>
                  </div>
                  {/* Sqft */}
                  <div className="flex items-center space-x-1.5">
                    <Maximize2 className="w-4 h-4 text-[#2B3A2A]" />
                    <span className="font-medium text-[#2A2A28]">{sqft}</span>
                  </div>
                  {/* Capacity */}
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-[#2B3A2A]" />
                    <span className="font-medium text-[#2A2A28]">{room.capacity} Guests</span>
                  </div>
                </div>

                {/* Right Quick Actions (Share & Wishlist) */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      inWishlist
                        ? 'bg-rose-50 border-rose-300 text-rose-600'
                        : 'bg-[#F5F1E8] border-[#E4DFD0] text-[#2A2A28]/70 hover:text-[#2B3A2A]'
                    }`}
                    title={inWishlist ? 'Saved in Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-3 py-1.5 rounded-xl bg-[#F5F1E8] hover:bg-[#E4DFD0] border border-[#E4DFD0] text-[#2A2A28] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    {copiedShare ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#2B3A2A]" />
                        <span className="text-[#2B3A2A]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-[#2A2A28]/70" />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Section: Overview */}
            <div className="space-y-3 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-6 sm:p-7 shadow-sm">
              <h2 className="font-serif text-2xl font-normal text-[#2A2A28]">Overview</h2>
              <p className="text-xs sm:text-sm text-[#2A2A28]/80 leading-relaxed">
                {room.description ||
                  'Experience bespoke luxury in our masterfully tailored suite. Featuring floor-to-ceiling panoramic views, handcrafted furnishings, and custom bedding, each detail is architected for deep relaxation and acoustic serenity. Unwind in your spa-grade bath or enjoy the horizon from your private terrace.'}
              </p>
              <p className="text-xs text-[#2A2A28]/80 leading-relaxed">
                Equipped with whisper-quiet climate purification, high-velocity gigabit mesh connectivity, and dedicated 24-hour concierge dispatch for personalized itinerary orchestration.
              </p>
            </div>

            {/* Section: Room Amenities */}
            <div className="space-y-4 pt-4 border-t border-[#E4DFD0]">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#2A2A28]">Room Amenities</h2>
                <p className="text-xs text-[#2A2A28]/70 mt-1">
                  Meticulously curated comforts and modern technology engineered for an effortless stay.
                </p>
              </div>

              {/* 3-Column Amenity Rounded Box Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {STANDARD_AMENITIES.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E4DFD0] hover:border-[#2B3A2A]/40 transition-colors flex items-center space-x-3 group shadow-sm"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] shrink-0 group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[#2A2A28] block truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-[#2A2A28]/70 block truncate">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section: Booking Rules */}
            <div className="space-y-4 pt-4 border-t border-[#E4DFD0]">
              <h2 className="font-serif text-2xl font-normal text-[#2A2A28]">Booking Rules</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] shadow-sm">
                {/* Check In Column */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#2A2A28] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#2B3A2A]" />
                    <span>Check In</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-[#2A2A28]/80">
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0 mt-0.5" />
                      <span>Check-in available daily from 3:00 PM to 11:00 PM.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0 mt-0.5" />
                      <span>Valid government-issued photo ID required at check-in.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0 mt-0.5" />
                      <span>Primary reservation holder must be at least 18 years old.</span>
                    </li>
                  </ul>
                </div>

                {/* Check Out Column */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#2A2A28] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#2B3A2A]" />
                    <span>Check Out</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-[#2A2A28]/80">
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0 mt-0.5" />
                      <span>Check-out time is strictly 11:00 AM.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0 mt-0.5" />
                      <span>Express keycard drop box active in the grand lobby.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2B3A2A] shrink-0 mt-0.5" />
                      <span>Late check-out available on request (subject to occupancy).</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Verified Guest Reviews */}
            <div className="space-y-4 pt-4 border-t border-[#E4DFD0]">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-normal text-[#2A2A28]">Verified Guest Reviews</h2>
                <span className="text-xs text-[#2A2A28]/70 font-mono">{reviews.length} Experiences</span>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div key={rev._id} className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E4DFD0] space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#2A2A28]">
                          {rev.user?.name || 'Verified Resident'}
                        </span>
                        <div className="flex items-center text-[#C9A15A]">
                          {[...Array(rev.rating || 5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[#2A2A28]/80 leading-relaxed">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#2A2A28]/70 italic bg-[#FAF8F2] p-4 rounded-xl border border-[#E4DFD0]">
                  Be the first verified resident to review this newly appointed suite upon departure.
                </p>
              )}
            </div>

          </div>

          {/* ================================================================ */}
          {/* RIGHT COLUMN: Sticky "Book Room" Reservation Form (5 Cols)        */}
          {/* ================================================================ */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-6 sm:p-7 shadow-xl space-y-5 text-[#2A2A28]">
              
              {/* Form Heading */}
              <div>
                <h3 className="font-serif text-2xl font-normal text-[#2A2A28]">Book Room</h3>
                <p className="text-xs text-[#2A2A28]/70 mt-0.5">
                  Instant reservation with guaranteed key issuance
                </p>
              </div>

              {bookingError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Reservation Intake Form */}
              <form onSubmit={handleReservationSubmit} className="space-y-4">
                
                {/* 1. Your Name */}
                <div>
                  <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                    Your Name <span className="text-[#2B3A2A]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#2B3A2A] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Ex. John Doe"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/50 focus:outline-none focus:border-[#2B3A2A]"
                    />
                  </div>
                </div>

                {/* 2. Phone Number */}
                <div>
                  <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                    Phone Number <span className="text-[#2B3A2A]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#2B3A2A] absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="Enter Phone Number (e.g. +1 555-0192)"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/50 focus:outline-none focus:border-[#2B3A2A]"
                    />
                  </div>
                </div>

                {/* 3. Dates Grid: Check-In & Check-Out */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                      Check-in Date <span className="text-[#2B3A2A]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl px-3 py-2 text-xs text-[#2A2A28] focus:outline-none focus:border-[#2B3A2A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                      Check-out Date <span className="text-[#2B3A2A]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        min={checkInDate}
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl px-3 py-2 text-xs text-[#2A2A28] focus:outline-none focus:border-[#2B3A2A]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Occupancy Grid: Adults & Children */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                      Adult <span className="text-[#2B3A2A]">*</span>
                    </label>
                    <select
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl px-3 py-2.5 text-xs text-[#2A2A28] focus:outline-none focus:border-[#2B3A2A] cursor-pointer"
                    >
                      <option value={1}>1 Adult</option>
                      <option value={2}>2 Adults</option>
                      <option value={3}>3 Adults</option>
                      <option value={4}>4 Adults</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                      Children <span className="text-[#2B3A2A]">*</span>
                    </label>
                    <select
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl px-3 py-2.5 text-xs text-[#2A2A28] focus:outline-none focus:border-[#2B3A2A] cursor-pointer"
                    >
                      <option value={0}>0 Children</option>
                      <option value={1}>1 Child</option>
                      <option value={2}>2 Children</option>
                      <option value={3}>3 Children</option>
                    </select>
                  </div>
                </div>

                {/* 5. Room Type & Number of Rooms */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                      Room Type <span className="text-[#2B3A2A]">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${room.type?.toUpperCase()} Luxury Suite`}
                      className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl px-3 py-2.5 text-xs text-[#2B3A2A] font-semibold cursor-not-allowed"
                    />
                    <span className="text-[10px] text-[#2A2A28]/70 mt-1 block">
                      Physical room number is allotted at Front Desk check-in
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                      Number of Rooms <span className="text-[#2B3A2A]">*</span>
                    </label>
                    <select
                      value={numberOfRooms}
                      onChange={(e) => setNumberOfRooms(Number(e.target.value))}
                      className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl px-3 py-2.5 text-xs text-[#2A2A28] focus:outline-none focus:border-[#2B3A2A] cursor-pointer"
                    >
                      <option value={1}>1 Room</option>
                      <option value={2}>2 Rooms</option>
                    </select>
                  </div>
                </div>

                {/* 6. Special Requests */}
                <div>
                  <label className="text-xs font-semibold text-[#2A2A28] block mb-1">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Quiet top-floor room, late check-in, feather pillows..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="w-full bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl px-3 py-2 text-xs text-[#2A2A28] placeholder-[#2A2A28]/50 focus:outline-none focus:border-[#2B3A2A]"
                  />
                </div>

                {/* 7. Payment Preference Option */}
                <div>
                  <label className="text-xs font-semibold text-[#2A2A28] block mb-1.5">
                    Settlement Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(PAYMENT_PROVIDERS.CASH)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        paymentMethod === PAYMENT_PROVIDERS.CASH
                          ? 'bg-[#2B3A2A] border-[#2B3A2A] text-[#F5F1E8] shadow-sm'
                          : 'bg-[#F5F1E8] border-[#E4DFD0] text-[#2A2A28]/80 hover:text-[#2B3A2A]'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Pay at Counter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod(PAYMENT_PROVIDERS.OFFLINE_CARD)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        paymentMethod === PAYMENT_PROVIDERS.OFFLINE_CARD
                          ? 'bg-[#2B3A2A] border-[#2B3A2A] text-[#F5F1E8] shadow-sm'
                          : 'bg-[#F5F1E8] border-[#E4DFD0] text-[#2A2A28]/80 hover:text-[#2B3A2A]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Card Guarantee</span>
                    </button>
                  </div>
                </div>

                {/* 8. Promo Code & Loyalty Accordion */}
                <div className="p-3.5 bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#2B3A2A] flex items-center space-x-1">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Have a Promo Code?</span>
                    </span>
                    {appliedCoupon && (
                      <span className="text-[10px] text-emerald-700 font-mono font-bold">
                        {appliedCoupon.code} (-10%)
                      </span>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#FAF8F2] border border-[#E4DFD0] rounded-lg px-2.5 py-1.5 text-xs text-[#2A2A28] placeholder-[#2A2A28]/50 uppercase focus:outline-none focus:border-[#2B3A2A]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="px-3 py-1.5 bg-[#2B3A2A] hover:bg-[#1F2B20] disabled:opacity-50 text-[#F5F1E8] text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      {isApplyingCoupon ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5F1E8]" />
                          <span>Applying...</span>
                        </>
                      ) : (
                        <span>Apply</span>
                      )}
                    </button>
                  </div>

                  {/* Loyalty Points Redemption */}
                  {user && loyaltyBalance.loyaltyPoints > 0 && (
                    <div className="pt-2 border-t border-[#E4DFD0] flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <Award className="w-3.5 h-3.5 text-[#2B3A2A]" />
                        <span className="text-[#2A2A28]/80">
                          Redeem {loyaltyBalance.loyaltyPoints} Pts (-${loyaltyBalance.discountValue})
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={redeemPoints}
                        onChange={(e) => setRedeemPoints(e.target.checked)}
                        className="w-4 h-4 accent-[#2B3A2A] rounded cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* 9. Authoritative Financial Breakdown Box */}
                <div className="p-4 bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-[#2A2A28]/70">
                    <span>
                      ${baseRate} &times; {nights} night{nights > 1 ? 's' : ''} ({numberOfRooms} room)
                    </span>
                    <span className="text-[#2A2A28] font-mono font-medium">${roomSubtotal}</span>
                  </div>

                  <div className="flex justify-between text-[#2A2A28]/70">
                    <span>Hospitality & Resort Tax (10%)</span>
                    <span className="text-[#2A2A28] font-mono font-medium">${hospitalityTax}</span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Total Savings & Promo Discount</span>
                      <span className="font-mono">-${totalDiscount}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E4DFD0] flex justify-between items-baseline">
                    <span className="text-xs uppercase font-bold text-[#2A2A28] font-mono">Total Reservation</span>
                    <div className="text-right">
                      <span className="font-serif text-2xl font-bold text-[#2B3A2A]">
                        ${grandTotal}
                      </span>
                      <span className="text-[10px] text-[#2A2A28]/70 block">USD &bull; All taxes included</span>
                    </div>
                  </div>
                </div>

                {/* 10. Reserve Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#2B3A2A] hover:bg-[#1F2B20] disabled:opacity-75 disabled:cursor-not-allowed text-[#F5F1E8] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all duration-200 active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#F5F1E8]" />
                      <span>Locking Suite & Creating Reservation...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-[#F5F1E8]" />
                      <span>
                        {user
                          ? `Book Room Now ($${grandTotal})`
                          : 'Sign In & Book Room'}
                      </span>
                    </>
                  )}
                </button>

                {/* Trust & Guarantee Badges */}
                <div className="text-[11px] text-[#2A2A28]/70 space-y-1.5 pt-2 border-t border-[#E4DFD0]">
                  <p className="flex items-center space-x-1.5 text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>100% Refundable up to 48 hours before check-in</span>
                  </p>
                  <p className="flex items-center space-x-1.5 text-[#2B3A2A]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Zero Double-Booking Guarantee via master ledger isolation</span>
                  </p>
                </div>

              </form>
            </div>
          </div>

        </div>
      </div>

      {/* ==================================================================== */}
      {/* RESERVATION CONFIRMED SUCCESS MODAL                                  */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {confirmedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-6 sm:p-8 shadow-2xl relative space-y-6 text-[#2A2A28]"
            >
              {/* Close Button */}
              <button
                onClick={() => setConfirmedBooking(null)}
                className="absolute top-4 right-4 text-[#2A2A28]/60 hover:text-[#2A2A28]"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Success Badge */}
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-[#F5F1E8] border border-emerald-600/40 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-2xl font-normal text-[#2A2A28]">
                  Reservation Confirmed!
                </h3>
                <p className="text-xs text-[#2A2A28]/70">
                  Your luxury stay is confirmed and locked in our master ledger.
                </p>
              </div>

              {/* Details Receipt Card */}
              <div className="p-4 bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#E4DFD0]">
                  <span className="text-[#2A2A28]/70">Booking Reference:</span>
                  <span className="font-mono font-bold text-[#2B3A2A] text-sm">
                    #{confirmedBooking.bookingReference}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[#2A2A28]">
                  <div>
                    <span className="text-[10px] text-[#2A2A28]/70 block">Reserved Tier</span>
                    <span className="font-semibold">{room.type?.toUpperCase()} Luxury Suite</span>
                    <span className="text-[10px] text-emerald-700 block">Unit assigned at front desk check-in</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#2A2A28]/70 block">Primary Resident</span>
                    <span className="font-semibold">{guestName || user?.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#2A2A28]/70 block">Stay Dates</span>
                    <span className="font-semibold">{checkInDate} &rarr; {checkOutDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#2A2A28]/70 block">Status / Dues</span>
                    <span className="font-semibold text-[#2B3A2A]">
                      ${confirmedBooking.totalPrice ?? grandTotal} ({confirmedBooking.status})
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => bookingService.downloadInvoice(confirmedBooking._id, confirmedBooking.bookingReference)}
                  className="w-full py-3 bg-[#F5F1E8] hover:bg-[#E4DFD0] text-[#2A2A28] border border-[#E4DFD0] rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
                >
                  <FileDown className="w-4 h-4 text-[#2B3A2A]" />
                  <span>Download Tax Invoice (PDF)</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    to="/my-bookings"
                    className="py-3 bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] rounded-xl text-xs font-bold text-center transition-colors shadow-sm"
                  >
                    View My Bookings
                  </Link>

                  <Link
                    to="/rooms"
                    className="py-3 bg-[#F5F1E8] hover:bg-[#E4DFD0] border border-[#E4DFD0] text-[#2A2A28] rounded-xl text-xs font-semibold text-center transition-colors"
                  >
                    Explore More Suites
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </GuestLayout>
  );
};

export default RoomDetailPage;
