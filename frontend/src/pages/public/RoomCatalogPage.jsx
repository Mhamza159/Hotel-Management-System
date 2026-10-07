import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Bell,
  CheckCircle,
  AlertTriangle,
  Users,
  Bed,
  Sparkles,
  Calendar,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import RoomCard from '../../components/guest/RoomCard';
import { KeycardLoader } from '../../components/common/KeycardLoader';
import { roomService } from '../../services/room.service';
import { engagementService } from '../../services/engagement.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBookingDraftStore } from '../../stores/useBookingDraftStore';

// Luxury Room Category Definitions matching Grand Horizon Resort
const CATEGORY_DEFINITIONS = [
  {
    type: 'single',
    title: 'Single Luxury Sanctuary',
    description: 'Bespoke solo retreat tailored for executive productivity with rainfall shower, ergonomic workstation, and acoustic dampening.',
    capacity: 1,
    basePrice: 75,
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Fiber WiFi', 'Climate Control', 'Smart TV', 'Rainfall Shower'],
  },
  {
    type: 'double',
    title: 'Superior Double Suite',
    description: 'Handcrafted queen bed, sun-drenched private balcony, and state-of-the-art climate control for traveling duos.',
    capacity: 2,
    basePrice: 130,
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Private Balcony', 'Nespresso Bar', '4K TV', 'Plush Robes'],
  },
  {
    type: 'deluxe',
    title: 'Deluxe Oceanfront Suite',
    description: 'Expansive panorama terrace, deep-soaking Italian marble bath, and artisanal curated minibar for a sublime stay.',
    capacity: 2,
    basePrice: 180,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Oceanfront View', 'Marble Bath', 'Bluetooth Sound', 'Mini Bar'],
  },
  {
    type: 'suite',
    title: 'Grand Executive Suite',
    description: 'Separate formal living salon, master bedroom, walk-in closet, and panoramic floor-to-ceiling city horizons.',
    capacity: 3,
    basePrice: 260,
    image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Living Salon', 'Walk-in Closet', 'Complimentary Butler', 'Dining Area'],
  },
  {
    type: 'presidential',
    title: 'Royal Presidential Penthouse',
    description: 'The pinnacle of luxury: Private rooftop terrace, jacuzzi plunge pool, 24/7 dedicated butler, and bespoke dining salon.',
    capacity: 4,
    basePrice: 500,
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    amenities: ['Private Plunge Pool', 'Personal Butler', 'Rooftop Terrace', 'VIP Dining'],
  },
];

export const RoomCatalogPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setDraftDates = useBookingDraftStore((state) => state.setDates);
  const setDraftGuests = useBookingDraftStore((state) => state.setGuests);

  // Extract query parameters
  const checkInDate =
    searchParams.get('checkInDate') ||
    new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const checkOutDate =
    searchParams.get('checkOutDate') ||
    new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0];
  const selectedType = searchParams.get('type') || '';
  const selectedCapacity = searchParams.get('capacity') || '';

  // Local filter states for the compact bar
  const [filterCheckIn, setFilterCheckIn] = useState(checkInDate);
  const [filterCheckOut, setFilterCheckOut] = useState(checkOutDate);
  const [filterCapacity, setFilterCapacity] = useState(selectedCapacity);
  const [filterType, setFilterType] = useState(selectedType);

  useEffect(() => {
    setFilterCheckIn(checkInDate);
    setFilterCheckOut(checkOutDate);
    setFilterCapacity(selectedCapacity);
    setFilterType(selectedType);
  }, [checkInDate, checkOutDate, selectedCapacity, selectedType]);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Waitlist State per Room Type
  const [joiningWaitlistType, setJoiningWaitlistType] = useState(null);
  const [waitlistStatus, setWaitlistStatus] = useState({});
  const [waitlistSuccessMsg, setWaitlistSuccessMsg] = useState('');

  const fetchRooms = () => {
    setLoading(true);
    setError('');

    const query = {
      checkInDate,
      checkOutDate,
    };
    if (selectedType) query.type = selectedType;
    if (selectedCapacity) query.capacity = selectedCapacity;

    roomService
      .getAvailableRooms(query)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.rooms || [];
        setRooms(list);
      })
      .catch((err) => {
        console.error('Error fetching available rooms:', err);
        setError(err.message || 'Unable to fetch room availability.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRooms();
  }, [checkInDate, checkOutDate, selectedType, selectedCapacity]);

  const handleUpdateFilters = (e) => {
    e.preventDefault();
    setDraftDates(filterCheckIn, filterCheckOut);
    if (filterCapacity) setDraftGuests(Number(filterCapacity));

    const params = new URLSearchParams({
      checkInDate: filterCheckIn,
      checkOutDate: filterCheckOut,
    });
    if (filterCapacity) params.append('capacity', filterCapacity);
    if (filterType) params.append('type', filterType);

    navigate(`/rooms?${params.toString()}`);
  };

  const handleJoinWaitlistForType = async (roomType) => {
    if (!user) {
      navigate(
        '/login?redirect=' +
          encodeURIComponent(window.location.pathname + window.location.search)
      );
      return;
    }

    try {
      setJoiningWaitlistType(roomType);
      await engagementService.joinWaitlist({
        roomType: roomType.toLowerCase(),
        checkIn: checkInDate,
        checkOut: checkOutDate,
      });

      setWaitlistStatus((prev) => ({ ...prev, [roomType]: true }));
      setWaitlistSuccessMsg(
        `✓ Subscribed! You will be notified immediately if a ${roomType.toUpperCase()} Suite becomes available between ${checkInDate} and ${checkOutDate}.`
      );
    } catch (err) {
      console.error('Failed to join waitlist:', err);
      alert(err?.response?.data?.message || 'Failed to join waitlist.');
    } finally {
      setJoiningWaitlistType(null);
    }
  };

  // Determine available and sold out categories
  const relevantCategories = selectedType
    ? CATEGORY_DEFINITIONS.filter((c) => c.type.toLowerCase() === selectedType.toLowerCase())
    : CATEGORY_DEFINITIONS;

  // Find sold-out categories
  const soldOutCategories = relevantCategories.filter((cat) => {
    const hasAvailableRoom = rooms.some(
      (r) => r.type?.toLowerCase() === cat.type.toLowerCase()
    );
    return !hasAvailableRoom;
  });

  return (
    <GuestLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-[#F5F1E8]">
        {/* COMPACT STICKY FILTER BAR (Replacing large hero & search card) */}
        <form
          onSubmit={handleUpdateFilters}
          className="sticky top-24 z-30 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(43,58,42,0.06)] mb-6"
        >
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
            {/* Check-In */}
            <div className="p-2.5 bg-[#F5F1E8] rounded-xl border border-[#E4DFD0]">
              <label className="text-[9px] font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] block mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#2B3A2A]" />
                <span>Check-In</span>
              </label>
              <input
                type="date"
                value={filterCheckIn}
                onChange={(e) => setFilterCheckIn(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-[#2A2A28] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Check-Out */}
            <div className="p-2.5 bg-[#F5F1E8] rounded-xl border border-[#E4DFD0]">
              <label className="text-[9px] font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] block mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#2B3A2A]" />
                <span>Check-Out</span>
              </label>
              <input
                type="date"
                value={filterCheckOut}
                onChange={(e) => setFilterCheckOut(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-[#2A2A28] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Guests */}
            <div className="p-2.5 bg-[#F5F1E8] rounded-xl border border-[#E4DFD0]">
              <label className="text-[9px] font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] block mb-0.5 flex items-center gap-1">
                <Users className="w-3 h-3 text-[#2B3A2A]" />
                <span>Guests</span>
              </label>
              <select
                value={filterCapacity}
                onChange={(e) => setFilterCapacity(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-[#2A2A28] focus:outline-none cursor-pointer"
              >
                <option value="">All Guests</option>
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4+ Guests</option>
              </select>
            </div>

            {/* Room Type */}
            <div className="p-2.5 bg-[#F5F1E8] rounded-xl border border-[#E4DFD0]">
              <label className="text-[9px] font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A] block mb-0.5 flex items-center gap-1">
                <Bed className="w-3 h-3 text-[#2B3A2A]" />
                <span>Suite Tier</span>
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-[#2A2A28] focus:outline-none cursor-pointer capitalize"
              >
                <option value="">All Suites</option>
                <option value="single">Single Sanctuary</option>
                <option value="double">Double Suite</option>
                <option value="deluxe">Deluxe Oceanfront</option>
                <option value="suite">Executive Suite</option>
                <option value="presidential">Presidential Penthouse</option>
              </select>
            </div>

            {/* Update Action Button */}
            <div className="col-span-2 sm:col-span-1 flex items-center h-full">
              <button
                type="submit"
                className="w-full h-[46px] bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] font-sans text-xs font-semibold uppercase tracking-[0.14em] rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center"
              >
                Update
              </button>
            </div>
          </div>
        </form>

        {/* Waitlist Success Banner */}
        {waitlistSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-[#FAF8F2] border border-[#2B3A2A]/30 text-[#2B3A2A] text-xs font-semibold flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#2B3A2A] shrink-0" />
              <span>{waitlistSuccessMsg}</span>
            </div>
            <button
              onClick={() => setWaitlistSuccessMsg('')}
              className="text-[#2A2A28]/60 hover:text-[#2A2A28] text-sm cursor-pointer"
            >
              &times;
            </button>
          </motion.div>
        )}

        {/* Status Bar */}
        <div className="flex items-center justify-between py-2.5 border-b border-[#E4DFD0] mb-6 text-xs text-[#2A2A28]/70">
          <div>
            <span>Showing </span>
            <strong className="text-[#2B3A2A] font-medium">{rooms.length}</strong> available suites
            {soldOutCategories.length > 0 && (
              <span className="ml-2 text-[#C9A15A] font-semibold">
                ({soldOutCategories.length} tier{soldOutCategories.length > 1 ? 's' : ''} waitlisted)
              </span>
            )}
          </div>
          <button
            onClick={fetchRooms}
            className="flex items-center space-x-1.5 text-[#2B3A2A] hover:text-[#1F2B20] font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Availability</span>
          </button>
        </div>

        {/* Content Loading & Error States */}
        {loading ? (
          <div className="py-16">
            <KeycardLoader message="Auditing available inventory..." />
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm max-w-xl mx-auto text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-12">
            {/* 1. AVAILABLE ROOMS RESULTS GRID */}
            {rooms.length > 0 && (
              <div>
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.06 },
                    },
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {rooms.map((room) => (
                    <motion.div
                      key={room._id}
                      variants={{
                        hidden: { opacity: 0, y: 15 },
                        show: { opacity: 1, y: 0 },
                      }}
                    >
                      <RoomCard
                        room={room}
                        searchParams={new URLSearchParams({
                          checkInDate,
                          checkOutDate,
                        }).toString()}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {/* 2. SOLD OUT / UNAVAILABLE TIERS WITH WAITLIST BUTTON */}
            {soldOutCategories.length > 0 && (
              <div className="pt-6 border-t border-[#E4DFD0]">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-[#C9A15A]" />
                  <h2 className="text-xs font-sans font-semibold uppercase tracking-[0.14em] text-[#2B3A2A]">
                    Fully Booked for Selected Dates &bull; Join Waitlist
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {soldOutCategories.map((cat) => {
                    const isJoined = waitlistStatus[cat.type];
                    const isJoining = joiningWaitlistType === cat.type;

                    return (
                      <motion.div
                        key={cat.type}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group hover:border-[#2B3A2A]/40 transition-all"
                      >
                        <div>
                          {/* Image Container with Sold Out Overlay */}
                          <div className="relative h-56 overflow-hidden bg-[#FAF8F2]">
                            <img
                              src={cat.image}
                              alt={`${cat.type} Suite`}
                              className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

                            {/* Category Pill */}
                            <div className="absolute top-3 left-3 bg-[#FAF8F2]/95 px-3 py-1 rounded-full border border-[#2B3A2A]/30 text-[10px] font-sans font-medium uppercase tracking-wider text-[#2B3A2A]">
                              {cat.type} Suite
                            </div>

                            {/* Sold Out Pill */}
                            <div className="absolute top-3 right-3 bg-rose-700/90 px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-1 shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Sold Out</span>
                            </div>

                            {/* Bottom Note on Image */}
                            <div className="absolute bottom-3 left-3 right-3">
                              <span className="text-[11px] text-[#F5F1E8] bg-black/75 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-lg inline-block">
                                All {cat.type.toUpperCase()} rooms are filled for these dates
                              </span>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="p-5 space-y-3">
                            <h3 className="font-playfair text-lg font-normal text-[#2A2A28]">
                              {cat.title}
                            </h3>
                            <p className="text-xs text-[#2A2A28]/70 line-clamp-2 leading-relaxed">
                              {cat.description}
                            </p>

                            {/* Quick Specs */}
                            <div className="flex items-center space-x-4 text-xs text-[#2A2A28]/70">
                              <span className="flex items-center space-x-1">
                                <Users className="w-3.5 h-3.5 text-[#2B3A2A]" />
                                <span>Up to {cat.capacity} Guests</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Bed className="w-3.5 h-3.5 text-[#2B3A2A]" />
                                <span className="capitalize">{cat.type}</span>
                              </span>
                            </div>

                            {/* Amenities */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {cat.amenities.map((am, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-[#F5F1E8] text-[10px] text-[#2B3A2A] border border-[#E4DFD0]"
                                >
                                  {am}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Card Footer with Waitlist Trigger */}
                        <div className="p-5 pt-0">
                          <div className="pt-3 border-t border-[#E4DFD0] flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#2A2A28]/60 uppercase block">
                                Base Rate
                              </span>
                              <span className="font-playfair text-base font-bold text-[#2B3A2A]">
                                ${cat.basePrice} / night
                              </span>
                            </div>

                            {isJoined ? (
                              <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F5F1E8] border border-[#2B3A2A]/40 rounded-xl text-xs font-semibold text-[#2B3A2A]">
                                <CheckCircle className="w-3.5 h-3.5 text-[#2B3A2A]" />
                                <span>Waitlist Joined</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleJoinWaitlistForType(cat.type)}
                                disabled={isJoining}
                                className="px-4 py-2 bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>{isJoining ? 'Joining...' : 'Join Waitlist'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </GuestLayout>
  );
};

export default RoomCatalogPage;
