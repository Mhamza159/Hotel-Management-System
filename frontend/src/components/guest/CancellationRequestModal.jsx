import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { bookingService } from '../../services/booking.service';

/**
 * Guest Cancellation Request Modal
 * Clearly discloses the 3-tier cancellation policy and submits request for front desk audit.
 */
export const CancellationRequestModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for your cancellation request.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await bookingService.requestCancellation(booking._id, { reason: reason.trim() });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Cancellation request failed:', err);
      setError(err?.response?.data?.message || 'Unable to submit cancellation request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          className="fixed inset-0 bg-[#2B3A2A]/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-6 shadow-2xl z-10 text-[#2A2A28]"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#2A2A28]/60 hover:text-[#2A2A28] hover:bg-[#F5F1E8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {submitted ? (
            /* Success State */
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#C9A15A]/10 border border-[#C9A15A]/30 flex items-center justify-center mx-auto text-[#C9A15A] mb-4">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#2A2A28]">
                Cancellation Requested
              </h3>
              <p className="text-sm text-[#2A2A28]/70 mt-2 max-w-sm mx-auto">
                Cancellation requested — front desk will review your reservation and calculate the authoritative refund based on your notice window.
              </p>
              <div className="mt-6">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-sm font-semibold transition-colors cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Request Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#B5533C]/10 border border-[#B5533C]/30 flex items-center justify-center text-[#B5533C]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#2A2A28]">
                    Request Cancellation
                  </h3>
                  <p className="text-xs text-[#2A2A28]/70">
                    Reservation Ref: <span className="font-mono text-[#2B3A2A] font-semibold">{booking.bookingReference}</span>
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs">
                  {error}
                </div>
              )}

              {/* Policy Disclosure Box */}
              <div className="p-3.5 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2B3A2A]">
                  <ShieldCheck className="w-4 h-4 text-[#2B3A2A]" />
                  <span>Grand Horizon 3-Tier Cancellation Policy</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-[#FAF8F2] border border-[#E4DFD0] text-center">
                    <span className="block font-bold text-[#2B3A2A]">100% Refund</span>
                    <span className="text-[#2A2A28]/60 text-[10px]">&gt; 48 hours notice</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FAF8F2] border border-[#E4DFD0] text-center">
                    <span className="block font-bold text-[#C9A15A]">50% Refund</span>
                    <span className="text-[#2A2A28]/60 text-[10px]">24 - 48 hours notice</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FAF8F2] border border-[#E4DFD0] text-center">
                    <span className="block font-bold text-[#B5533C]">0% Refund</span>
                    <span className="text-[#2A2A28]/60 text-[10px]">&lt; 24 hours notice</span>
                  </div>
                </div>
                <p className="text-[10px] text-[#2A2A28]/60 italic pt-1">
                  *Refund amounts are authoritatively calculated upon front desk review based on actual payment received and exact check-in time.
                </p>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-medium text-[#2A2A28] mb-1.5">
                  Reason for Cancellation <span className="text-[#B5533C]">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please let us know why you are cancelling your stay..."
                  rows={3}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] text-[#2A2A28] placeholder-[#2A2A28]/40 text-xs focus:outline-none focus:border-[#2B3A2A] transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2A2A28] border border-[#E4DFD0] bg-[#FAF8F2] hover:bg-[#F5F1E8] transition-colors cursor-pointer"
                >
                  Keep Reservation
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason.trim()}
                  className="px-5 py-2 rounded-xl bg-[#B5533C] hover:bg-[#9E4530] text-[#F5F1E8] font-semibold text-xs shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {loading ? 'Submitting Request...' : 'Submit Cancellation Request'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CancellationRequestModal;
