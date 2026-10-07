import React, { useState, useEffect } from 'react';
import {
  ConciergeBell,
  Search,
  Calendar,
  LogIn,
  LogOut,
  CreditCard,
  DollarSign,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { deskService } from '../../services/desk.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { PERMISSIONS } from '../../config/constants';
import { can } from '../../components/common/Can';
import { WarmRecordPaymentDialog } from '../../components/housekeeping/WarmRecordPaymentDialog';

/**
 * ============================================================================
 * HOUSEKEEPING FRONT DESK VIEW (WARM MINIMAL PLANNER)
 * ============================================================================
 * 
 * Unlocked when Housekeeping user has checkin:manage OR checkout:manage.
 * Reuses GET /desk/bookings, PATCH /desk/bookings/:id/check-in, PATCH /desk/bookings/:id/check-out.
 * Features:
 * - White --hk-card rows, pastel status dots, --hk-sidebar green (#2B3A2A) action buttons.
 * - Dynamic "Record Payment" button if user has payments:recordCash or payments:recordCard.
 */
export const HousekeepingDeskPage = () => {
  const user = useAuthStore((state) => state.user);

  const canCheckIn = can(user, PERMISSIONS.CHECKIN_MANAGE);
  const canCheckOut = can(user, PERMISSIONS.CHECKOUT_MANAGE);
  const canRecordPayment =
    can(user, PERMISSIONS.PAYMENTS_RECORD_CASH) || can(user, PERMISSIONS.PAYMENTS_RECORD_CARD);

  const [activeTab, setActiveTab] = useState('arrivals'); // 'arrivals' | 'departures' | 'in-house'
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);

  // Payment modal state
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deskService.getOverview({ type: activeTab });
      setBookings(res?.bookings || []);
    } catch (err) {
      console.error('Failed to load desk bookings:', err);
      setError(err?.response?.data?.message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  const handleCheckIn = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      await deskService.checkIn(bookingId);
      fetchBookings();
    } catch (err) {
      alert(err?.response?.data?.message || 'Check-in failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCheckOut = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      await deskService.checkOut(bookingId);
      fetchBookings();
    } catch (err) {
      alert(err?.response?.data?.message || 'Check-out failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (!search) return true;
    const query = search.toLowerCase();
    const guestName = (b.user?.name || b.guestName || '').toLowerCase();
    const ref = (b.bookingReference || b._id || '').toLowerCase();
    const room = (b.room?.roomNumber || '').toString();
    return guestName.includes(query) || ref.includes(query) || room.includes(query);
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4DFD0] pb-6">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#2B3A2A] uppercase font-bold flex items-center space-x-1.5">
            <ConciergeBell className="w-3.5 h-3.5 text-[#2B3A2A]" />
            <span>OPERATIONAL EXTENSION</span>
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#2A2A28] mt-1">
            Front Desk Operations
          </h1>
          <p className="text-xs font-serif italic text-[#2A2A28]/70 mt-0.5">
            Live guest arrivals, departures, check-in turnover, and in-person settlements.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="self-start sm:self-auto inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-mono uppercase tracking-wider text-[#2A2A28] hover:bg-[#FAF8F2] shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Pill Tabs */}
        <div className="flex items-center space-x-2 bg-white p-1 rounded-2xl border border-[#E4DFD0] shadow-2xs">
          {[
            { id: 'arrivals', label: 'Today Arrivals' },
            { id: 'departures', label: 'Today Departures' },
            { id: 'in-house', label: 'In-House Guests' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#2B3A2A] text-white shadow-xs'
                  : 'text-[#2A2A28]/70 hover:text-[#2A2A28] hover:bg-[#FAF8F2]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2A2A28]/40" />
          <input
            type="text"
            placeholder="Search guest, room, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-sans text-[#2A2A28] placeholder-[#2A2A28]/40 focus:outline-hidden focus:border-[#2B3A2A] focus:ring-1 focus:ring-[#2B3A2A]"
          />
        </div>
      </div>

      {/* Bookings List */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#E4DFD0]">
          <div className="w-8 h-8 border-3 border-[#2B3A2A] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#2A2A28]/60">Syncing reservation records...</span>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E4DFD0] space-y-2">
          <p className="font-serif text-lg text-[#2A2A28]">No reservations found for this view.</p>
          <p className="text-xs font-mono text-[#2A2A28]/60">
            Check back when new guest arrival or departure slots are scheduled.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const guestName = b.user?.name || b.guestName || 'Unnamed Guest';
            const guestEmail = b.user?.email || b.guestEmail || '';
            const roomNum = b.room?.roomNumber || 'Unassigned';
            const roomType = b.room?.type || 'Standard';
            const total = b.totalPrice ?? b.totalAmount ?? 0;
            const paid = b.paidAmount || 0;
            const balance = Math.max(0, total - paid);

            // Pastel status indicator dot
            let statusDotColor = 'bg-[#B7CBA8]'; // default sage
            if (b.status === 'confirmed') statusDotColor = 'bg-[#BFDCC4]';
            else if (b.status === 'checked-in') statusDotColor = 'bg-[#B7CBA8]';
            else if (b.status === 'checked-out') statusDotColor = 'bg-[#D8CFC0]';
            else if (b.status?.includes('cancel')) statusDotColor = 'bg-[#E3B7A8]';

            return (
              <div
                key={b._id}
                className="p-5 bg-white border border-[#E4DFD0] rounded-3xl shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Guest & Room Details */}
                <div className="flex items-start space-x-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#F3EFE7] border border-[#E4DFD0] text-[#2B3A2A] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono text-[#2A2A28]/60">ROOM</span>
                    <span className="font-serif font-bold text-sm text-[#2B3A2A]">{roomNum}</span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                      <h3 className="font-serif font-bold text-base text-[#2A2A28]">{guestName}</h3>
                      <span className="text-[10px] font-mono text-[#2A2A28]/50 uppercase">
                        #{b.bookingReference || b._id?.slice(-6)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#2A2A28]/70 mt-1">
                      <span>Type: <strong className="font-medium text-[#2A2A28] capitalize">{roomType}</strong></span>
                      <span>•</span>
                      <span>
                        Dates: {new Date(b.checkInDate).toLocaleDateString()} &rarr;{' '}
                        {new Date(b.checkOutDate).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[#C9A15A] font-bold">
                        ${total.toFixed(2)} {balance > 0 ? `(Due: $${balance.toFixed(2)})` : '(Paid in Full)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center space-x-2.5 self-end md:self-auto shrink-0">
                  {/* Dynamic Record Payment Button (payments:recordCash / recordCard) */}
                  {canRecordPayment && balance > 0 && (
                    <button
                      onClick={() => setSelectedBookingForPayment(b)}
                      className="px-3.5 py-2 border border-[#E4DFD0] rounded-xl text-xs font-mono font-semibold uppercase text-[#2A2A28] hover:bg-[#FAF8F2] flex items-center space-x-1.5 transition-colors cursor-pointer"
                      title="Record physical settlement"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-[#C9A15A]" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  {/* Check-In Button (checkin:manage) */}
                  {canCheckIn && b.status === 'confirmed' && (
                    <button
                      onClick={() => handleCheckIn(b._id)}
                      disabled={actionLoadingId === b._id}
                      className="px-4 py-2 bg-[#2B3A2A] hover:bg-[#1F2B20] text-white text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <LogIn className="w-3.5 h-3.5 text-[#B7CBA8]" />
                      <span>{actionLoadingId === b._id ? 'Processing...' : 'Check In'}</span>
                    </button>
                  )}

                  {/* Check-Out Button (checkout:manage) */}
                  {canCheckOut && b.status === 'checked-in' && (
                    <button
                      onClick={() => handleCheckOut(b._id)}
                      disabled={actionLoadingId === b._id}
                      className="px-4 py-2 bg-[#2B3A2A] hover:bg-[#1F2B20] text-white text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#E3B7A8]" />
                      <span>{actionLoadingId === b._id ? 'Processing...' : 'Check Out'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Payment Dialog */}
      {selectedBookingForPayment && (
        <WarmRecordPaymentDialog
          open={Boolean(selectedBookingForPayment)}
          booking={selectedBookingForPayment}
          onClose={() => setSelectedBookingForPayment(null)}
          onSuccess={fetchBookings}
        />
      )}
    </div>
  );
};

export default HousekeepingDeskPage;
