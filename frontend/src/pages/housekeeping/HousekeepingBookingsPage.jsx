import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  DollarSign,
  User,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { PERMISSIONS } from '../../config/constants';
import { can } from '../../components/common/Can';
import { WarmRecordPaymentDialog } from '../../components/housekeeping/WarmRecordPaymentDialog';

/**
 * ============================================================================
 * HOUSEKEEPING BOOKINGS DIRECTORY (WARM MINIMAL PLANNER)
 * ============================================================================
 * 
 * Unlocked when Housekeeping user has bookings:view permission.
 * Read-only list of hotel reservations with status tags, search, and ledger details.
 * If user also has payments:recordCash or payments:recordCard, adds "Record Payment" button.
 */
export const HousekeepingBookingsPage = () => {
  const user = useAuthStore((state) => state.user);
  const canRecordPayment =
    can(user, PERMISSIONS.PAYMENTS_RECORD_CASH) || can(user, PERMISSIONS.PAYMENTS_RECORD_CARD);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);

  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getAllBookings({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      });
      setBookings(res?.bookings || []);
    } catch (err) {
      console.error('Failed to load reservations:', err);
      setError(err?.response?.data?.message || 'Failed to load reservations directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBookings();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4DFD0] pb-6">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#2B3A2A] uppercase font-bold flex items-center space-x-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-[#2B3A2A]" />
            <span>RESERVATIONS INVENTORY</span>
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#2A2A28] mt-1">
            Bookings Directory
          </h1>
          <p className="text-xs font-serif italic text-[#2A2A28]/70 mt-0.5">
            Full overview of guest reservations, room dates, payment balances, and lifecycle states.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="self-start sm:self-auto inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-mono uppercase tracking-wider text-[#2A2A28] hover:bg-[#FAF8F2] shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#E4DFD0] shadow-2xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'checked-in', label: 'Checked In' },
            { id: 'checked-out', label: 'Checked Out' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono tracking-wider uppercase font-semibold transition-all cursor-pointer ${
                statusFilter === item.id
                  ? 'bg-[#2B3A2A] text-white shadow-xs'
                  : 'text-[#2A2A28]/70 hover:text-[#2A2A28] hover:bg-[#FAF8F2]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2A2A28]/40" />
          <input
            type="text"
            placeholder="Search by reference, guest name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-sans text-[#2A2A28] placeholder-[#2A2A28]/40 focus:outline-hidden focus:border-[#2B3A2A]"
          />
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#E4DFD0]">
          <div className="w-8 h-8 border-3 border-[#2B3A2A] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#2A2A28]/60">Loading reservations...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E4DFD0] space-y-2">
          <p className="font-serif text-lg text-[#2A2A28]">No bookings found.</p>
          <p className="text-xs font-mono text-[#2A2A28]/60">Try selecting a different filter or search query.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const guestName = b.user?.name || b.guestName || 'Valued Guest';
            const roomNum = b.room?.roomNumber || 'TBD';
            const total = b.totalPrice ?? b.totalAmount ?? 0;
            const paid = b.paidAmount || 0;
            const balance = Math.max(0, total - paid);

            // Status Badge styling
            let statusBadge = (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-[#FAF8F2] border border-[#E4DFD0] text-[#2A2A28]">
                {b.status}
              </span>
            );
            if (b.status === 'confirmed') {
              statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold border border-[#2B3A2A] text-[#2B3A2A] bg-[#2B3A2A]/5">
                  Confirmed
                </span>
              );
            } else if (b.status === 'checked-in') {
              statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-[#B7CBA8]/30 text-[#2B3A2A] border border-[#B7CBA8]">
                  Checked In
                </span>
              );
            } else if (b.status === 'checked-out') {
              statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-[#D8CFC0]/30 text-[#2A2A28] border border-[#D8CFC0]">
                  Checked Out
                </span>
              );
            } else if (b.status?.includes('cancel')) {
              statusBadge = (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold border border-[#D97757] text-[#D97757] bg-[#D97757]/5">
                  Cancelled
                </span>
              );
            }

            return (
              <div
                key={b._id}
                className="p-5 bg-white border border-[#E4DFD0] rounded-3xl shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#F3EFE7] border border-[#E4DFD0] text-[#2B3A2A] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono text-[#2A2A28]/60">ROOM</span>
                    <span className="font-serif font-bold text-sm text-[#2B3A2A]">{roomNum}</span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-serif font-bold text-base text-[#2A2A28]">{guestName}</h3>
                      <span className="text-[10px] font-mono text-[#2A2A28]/50 uppercase">
                        #{b.bookingReference || b._id?.slice(-6)}
                      </span>
                      {statusBadge}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#2A2A28]/70 mt-1">
                      <span>Type: <strong className="font-medium text-[#2A2A28] capitalize">{b.room?.type || 'Suite'}</strong></span>
                      <span>•</span>
                      <span>
                        Stay: {new Date(b.checkInDate).toLocaleDateString()} &rarr;{' '}
                        {new Date(b.checkOutDate).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[#C9A15A] font-bold">
                        ${total.toFixed(2)}{' '}
                        {balance > 0 ? (
                          <span className="text-amber-700">(Due: ${balance.toFixed(2)})</span>
                        ) : (
                          <span className="text-emerald-700 font-normal">(Settled)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                {canRecordPayment && balance > 0 && (
                  <button
                    onClick={() => setSelectedBookingForPayment(b)}
                    className="self-end md:self-auto px-4 py-2 border border-[#E4DFD0] rounded-xl text-xs font-mono font-semibold uppercase text-[#2A2A28] hover:bg-[#FAF8F2] flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-[#C9A15A]" />
                    <span>Record Payment</span>
                  </button>
                )}
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

export default HousekeepingBookingsPage;
