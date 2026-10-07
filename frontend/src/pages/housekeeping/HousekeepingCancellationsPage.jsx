import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { deskService } from '../../services/desk.service';
import { WarmCancellationReviewDialog } from '../../components/housekeeping/WarmCancellationReviewDialog';

/**
 * ============================================================================
 * HOUSEKEEPING CANCELLATIONS AUDIT QUEUE (WARM MINIMAL PLANNER)
 * ============================================================================
 * 
 * Unlocked when Housekeeping user has bookings:cancel.
 * Reuses GET /desk/cancellation-requests, evaluate policy breakdown, and approve/reject.
 */
export const HousekeepingCancellationsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deskService.getCancellationRequests();
      setRequests(res?.requests || []);
    } catch (err) {
      console.error('Failed to load cancellation requests:', err);
      setError(err?.response?.data?.message || 'Failed to load cancellation review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4DFD0] pb-6">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#D97757] uppercase font-bold flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-[#D97757]" />
            <span>AUTHORITATIVE AUDIT QUEUE</span>
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#2A2A28] mt-1">
            Cancellation Requests
          </h1>
          <p className="text-xs font-serif italic text-[#2A2A28]/70 mt-0.5">
            Evaluate refund tiers, review policy compliance, and authorize room release.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="self-start sm:self-auto inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-mono uppercase tracking-wider text-[#2A2A28] hover:bg-[#FAF8F2] shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
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
          <span className="text-xs font-mono text-[#2A2A28]/60">Scanning cancellation queue...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E4DFD0] space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#B7CBA8]/30 text-[#2B3A2A] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="font-serif text-lg text-[#2A2A28]">Queue is completely clear!</p>
          <p className="text-xs font-mono text-[#2A2A28]/60">
            No pending guest cancellation requests requiring audit review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const guestName = req.user?.name || req.guestName || 'Guest';
            const roomNum = req.room?.roomNumber || 'TBD';
            const total = req.totalPrice ?? req.totalAmount ?? 0;

            return (
              <div
                key={req._id}
                className="p-5 bg-white border border-[#E4DFD0] rounded-3xl shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#E3B7A8]/30 border border-[#E3B7A8] text-[#2B3A2A] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono text-[#2A2A28]/60">ROOM</span>
                    <span className="font-serif font-bold text-sm text-[#2B3A2A]">{roomNum}</span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-serif font-bold text-base text-[#2A2A28]">{guestName}</h3>
                      <span className="text-[10px] font-mono text-[#2A2A28]/50 uppercase">
                        #{req.bookingReference || req._id?.slice(-6)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border border-[#D97757] text-[#D97757] bg-[#D97757]/5">
                        Audit Pending
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#2A2A28]/70 mt-1">
                      <span>Reason: <em className="text-[#2A2A28]">{req.cancellationReason || 'No specific reason provided'}</em></span>
                      <span>•</span>
                      <span>
                        Stay: {new Date(req.checkInDate).toLocaleDateString()} &rarr;{' '}
                        {new Date(req.checkOutDate).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[#C9A15A] font-bold">
                        Paid: ${Number(req.paidAmount || total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Action Button */}
                <button
                  onClick={() => setSelectedBookingId(req._id)}
                  className="self-end md:self-auto px-5 py-2.5 bg-[#2B3A2A] hover:bg-[#1F2B20] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-[#E3B7A8]" />
                  <span>Audit Refund</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Authoritative Cancellation Review Dialog */}
      {selectedBookingId && (
        <WarmCancellationReviewDialog
          open={Boolean(selectedBookingId)}
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onSuccess={fetchRequests}
        />
      )}
    </div>
  );
};

export default HousekeepingCancellationsPage;
