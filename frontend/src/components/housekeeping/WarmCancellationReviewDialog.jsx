import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { deskService } from '../../services/desk.service';

/**
 * ============================================================================
 * WARM CANCELLATION REVIEW DIALOG (Warm Minimal Planner Style)
 * ============================================================================
 * 
 * Authoritative Cancellation Audit Dialog:
 * - Shows calculated hours remaining, refund percentage, and verbatim refund amount.
 * - Forest-green (#2B3A2A) "Approve" button.
 * - Terracotta outline (#D97757) "Reject" button.
 */
export const WarmCancellationReviewDialog = ({ open, onClose, bookingId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState(null);

  // Reject Flow State
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (open && bookingId) {
      fetchReviewDetails();
      setShowRejectForm(false);
      setRejectionReason('');
      setError(null);
    }
  }, [open, bookingId]);

  const fetchReviewDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deskService.getCancellationReview(bookingId);
      setReviewData(data);
    } catch (err) {
      console.error('Failed to load cancellation review:', err);
      setError(err?.response?.data?.message || 'Failed to evaluate cancellation refund policy.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      setError(null);
      await deskService.approveCancellation(bookingId);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Cancellation approve error:', err);
      setError(err?.response?.data?.message || 'Failed to approve cancellation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please provide an authoritative rejection reason for the guest audit trail.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await deskService.rejectCancellation(bookingId, {
        rejectionReason: rejectionReason.trim(),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Cancellation reject error:', err);
      setError(err?.response?.data?.message || 'Failed to reject cancellation.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#E4DFD0] rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col text-[#2A2A28]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4DFD0] bg-[#FAF8F2]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E3B7A8] text-[#2B3A2A] flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5 text-[#2B3A2A]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2A2A28]">Audit Cancellation Request</h3>
              <p className="text-xs font-mono text-[#2A2A28]/60">
                Authoritative Refund Policy Evaluation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#2A2A28]/60 hover:text-[#2A2A28] hover:bg-[#E4DFD0]/40 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#2B3A2A] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-[#2A2A28]/60">Evaluating refund policy matrix...</p>
            </div>
          ) : reviewData ? (
            <div className="space-y-4">
              {/* Reference & Hours Badge */}
              <div className="flex items-center justify-between p-3.5 bg-[#F3EFE7] rounded-2xl border border-[#E4DFD0]">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#2A2A28]/60 block">Reference</span>
                  <span className="font-mono font-bold text-xs text-[#2A2A28]">
                    {reviewData.bookingReference || reviewData.bookingId}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-[#E4DFD0]">
                  <Clock className="w-3.5 h-3.5 text-[#2B3A2A]" />
                  <span className="text-xs font-mono font-semibold text-[#2B3A2A]">
                    {reviewData.hoursUntilCheckIn ?? 0} hrs until check-in
                  </span>
                </div>
              </div>

              {/* Policy Evaluation Ledger */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#FAF8F2] rounded-2xl border border-[#E4DFD0]">
                  <span className="text-[10px] font-mono uppercase text-[#2A2A28]/60 block">Applied Tier</span>
                  <span className="font-serif font-bold text-sm text-[#2B3A2A] capitalize">
                    {reviewData.tier || 'Standard Policy'}
                  </span>
                  <span className="text-[10px] font-mono text-[#2B3A2A]/70 block mt-0.5">
                    Refund: {reviewData.refundPercentage}%
                  </span>
                </div>

                <div className="p-3.5 bg-[#FAF8F2] rounded-2xl border border-[#E4DFD0]">
                  <span className="text-[10px] font-mono uppercase text-[#2A2A28]/60 block">Total Guest Paid</span>
                  <span className="font-serif font-bold text-sm text-[#2A2A28]">
                    ${Number(reviewData.totalPaid || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 bg-[#B7CBA8]/20 rounded-2xl border border-[#B7CBA8]/40">
                  <span className="text-[10px] font-mono uppercase text-[#2B3A2A]/70 block">Authorized Refund</span>
                  <span className="font-serif font-bold text-base text-[#2B3A2A]">
                    ${Number(reviewData.refundAmount || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3.5 bg-[#D97757]/10 rounded-2xl border border-[#D97757]/30">
                  <span className="text-[10px] font-mono uppercase text-[#D97757] block">Retained Fee</span>
                  <span className="font-serif font-bold text-base text-[#D97757]">
                    ${Number(reviewData.cancellationFee || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Rejection Form (Optional slide-down) */}
              {showRejectForm && (
                <form onSubmit={handleReject} className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-3">
                  <label className="block text-xs font-mono font-semibold uppercase text-rose-900">
                    Audit Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain why this cancellation request is being denied..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                    className="w-full p-3 bg-white border border-rose-200 rounded-xl text-xs font-sans focus:outline-hidden focus:border-rose-500"
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="px-3 py-1.5 text-xs font-mono text-stone-600 hover:text-stone-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-[#D97757] text-white rounded-xl text-xs font-mono font-bold hover:bg-[#C06243] cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </form>
              )}

              {/* Decision Actions */}
              {!showRejectForm && (
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E4DFD0]">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    className="px-5 py-2.5 border-2 border-[#D97757] text-[#D97757] hover:bg-[#D97757]/10 text-xs font-mono uppercase tracking-wider rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Request</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-[#2B3A2A] text-white hover:bg-[#1F2B20] text-xs font-mono uppercase tracking-wider rounded-xl font-bold transition-all shadow-sm cursor-pointer flex items-center space-x-2"
                  >
                    {actionLoading ? (
                      <span>Approving...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#B7CBA8]" />
                        <span>Approve & Release Room</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default WarmCancellationReviewDialog;
