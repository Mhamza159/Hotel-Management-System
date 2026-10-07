import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Home, Search, Loader2 } from 'lucide-react';
import { useBookingDraftStore } from '../../stores/useBookingDraftStore';
import { ROOM_TYPES } from '../../config/constants';

export const SearchWidget = ({ initialValues = {}, className = '' }) => {
  const navigate = useNavigate();
  const setDraftDates = useBookingDraftStore((state) => state.setDates);
  const setDraftGuests = useBookingDraftStore((state) => state.setGuests);

  // Compute reasonable default dates (Tomorrow -> +3 days)
  const today = new Date();
  const defaultCheckIn = new Date(today.setDate(today.getDate() + 1))
    .toISOString()
    .split('T')[0];
  const defaultCheckOut = new Date(today.setDate(today.getDate() + 3))
    .toISOString()
    .split('T')[0];

  const [checkInDate, setCheckInDate] = useState(
    initialValues.checkInDate || defaultCheckIn
  );
  const [checkOutDate, setCheckOutDate] = useState(
    initialValues.checkOutDate || defaultCheckOut
  );
  const [roomType, setRoomType] = useState(initialValues.type || '');
  const [guests, setGuests] = useState(initialValues.capacity || 2);
  const [dateError, setDateError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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

    // Save to global draft
    setDraftDates(checkInDate, checkOutDate);
    setDraftGuests(Number(guests));

    // Construct query parameters
    const params = new URLSearchParams({
      checkInDate,
      checkOutDate,
      capacity: String(guests),
    });

    if (roomType) {
      params.append('type', roomType);
    }

    navigate(`/rooms?${params.toString()}`);
    setTimeout(() => setIsSearching(false), 800);
  };

  return (
    <form
      onSubmit={handleSearch}
      className={`bg-[#131A26] border border-[#2A3547] rounded-2xl p-5 sm:p-6 shadow-xl ${className}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Check-In Date */}
        <div className="p-3 bg-[#1B2433] rounded-xl border border-[#2A3547] hover:border-[#3FD0C9]/50 transition-colors">
          <label className="text-[10px] font-bold text-[#8791A3] uppercase tracking-wider block mb-1 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#3FD0C9]" />
            <span>Check-in</span>
          </label>
          <input
            type="date"
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-[#ECEFF3] focus:outline-none cursor-pointer"
          />
        </div>

        {/* Check-Out Date */}
        <div className="p-3 bg-[#1B2433] rounded-xl border border-[#2A3547] hover:border-[#3FD0C9]/50 transition-colors">
          <label className="text-[10px] font-bold text-[#8791A3] uppercase tracking-wider block mb-1 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#3FD0C9]" />
            <span>Check-out</span>
          </label>
          <input
            type="date"
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-[#ECEFF3] focus:outline-none cursor-pointer"
          />
        </div>

        {/* Guests Count */}
        <div className="p-3 bg-[#1B2433] rounded-xl border border-[#2A3547] hover:border-[#3FD0C9]/50 transition-colors">
          <label className="text-[10px] font-bold text-[#8791A3] uppercase tracking-wider block mb-1 flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-[#C9A15A]" />
            <span>Guests</span>
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full bg-transparent text-sm font-semibold text-[#ECEFF3] focus:outline-none cursor-pointer"
          >
            <option value={1} className="bg-[#131A26] text-[#ECEFF3]">1 Guest</option>
            <option value={2} className="bg-[#131A26] text-[#ECEFF3]">2 Guests</option>
            <option value={3} className="bg-[#131A26] text-[#ECEFF3]">3 Guests</option>
            <option value={4} className="bg-[#131A26] text-[#ECEFF3]">4+ Guests</option>
          </select>
        </div>

        {/* Action Button: Check Availability */}
        <div className="flex flex-col justify-end">
          <button
            type="submit"
            disabled={isSearching}
            className="w-full h-[54px] px-6 bg-[#C9A15A] hover:bg-[#B88E45] disabled:opacity-75 disabled:cursor-not-allowed text-[#0A0F1A] font-bold text-xs tracking-wider uppercase rounded-xl shadow-md transition-all duration-200 flex items-center justify-center space-x-2 active:scale-98 cursor-pointer"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0A0F1A]" />
                <span>Checking...</span>
              </>
            ) : (
              <span>Check Availability</span>
            )}
          </button>
        </div>
      </div>

      {dateError && (
        <div className="mt-3 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/30">
          {dateError}
        </div>
      )}

      {/* Trust Guarantee */}
      <div className="mt-4 pt-3 border-t border-[#2A3547] flex items-center justify-center sm:justify-start gap-2 text-xs text-[#8791A3]">
        <span className="w-4 h-4 rounded-full bg-[#3FD0C9]/15 text-[#3FD0C9] flex items-center justify-center text-[10px] font-bold">✓</span>
        <span className="font-medium text-[11px] tracking-wide text-[#ECEFF3]">Best Rate Guarantee</span>
        <span className="text-[#2A3547]">•</span>
        <span className="font-medium text-[11px] tracking-wide text-[#8791A3]">Instant Key Issuance</span>
      </div>
    </form>
  );
};

export default SearchWidget;
