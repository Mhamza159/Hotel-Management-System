import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { deskService } from '../../services/desk.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { PERMISSIONS } from '../../config/constants';
import { can } from '../common/Can';

/**
 * ============================================================================
 * WARM RECORD PAYMENT DIALOG (Warm Minimal Planner Style)
 * ============================================================================
 * 
 * In-person Cash and Offline POS Card payment entry modal.
 * Respects permissions:
 * - payments:recordCash allows 'cash'
 * - payments:recordCard allows 'offline-card'
 */
export const WarmRecordPaymentDialog = ({ open, onClose, booking, onSuccess }) => {
  const user = useAuthStore((state) => state.user);

  const canCash = can(user, PERMISSIONS.PAYMENTS_RECORD_CASH);
  const canCard = can(user, PERMISSIONS.PAYMENTS_RECORD_CARD);

  const defaultMethod = canCash ? 'cash' : canCard ? 'offline-card' : 'cash';

  const [paymentMode, setPaymentMode] = useState('full'); // 'full' | 'partial'
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(defaultMethod);
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalAmount = booking?.totalPrice ?? booking?.totalAmount ?? 0;
  const paidAmount = booking?.paidAmount || 0;
  const remainingBalance = Math.max(0, totalAmount - paidAmount);

  useEffect(() => {
    if (open && booking) {
      setPaymentMode('full');
      setAmount(remainingBalance.toString());
      setPaymentMethod(canCash ? 'cash' : 'offline-card');
      setTransactionReference('');
      setNotes('');
      setError(null);
    }
  }, [open, booking, remainingBalance, canCash]);

  if (!open || !booking) return null;

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    setError(null);
    if (mode === 'full') {
      setAmount(remainingBalance.toString());
    } else {
      const half = Math.round((remainingBalance / 2) * 100) / 100;
      setAmount(half > 0 ? half.toString() : remainingBalance.toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    if (numAmount > remainingBalance) {
      setError(`Amount cannot exceed the remaining balance of $${remainingBalance.toFixed(2)}.`);
      return;
    }

    if (paymentMethod === 'offline-card' && !transactionReference.trim()) {
      setError('Transaction / POS Slip Reference is required for card payments.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await deskService.recordPayment(booking._id, {
        amount: numAmount,
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        paymentType: paymentMode === 'full' ? 'settlement' : 'partial',
        notes: notes.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Record payment failure:', err);
      setError(err?.response?.data?.message || err?.message || 'Payment recording failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#E4DFD0] rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col text-[#2A2A28]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4DFD0] bg-[#FAF8F2]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2B3A2A] text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5 text-[#C9A15A]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2A2A28]">Record In-Person Payment</h3>
              <p className="text-xs font-mono text-[#2A2A28]/60">
                Booking Ref: {booking.bookingReference || booking._id?.slice(-8)}
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Ledger Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-[#F3EFE7] rounded-2xl border border-[#E4DFD0]">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#2A2A28]/60 block">Total Due</span>
              <span className="font-serif font-bold text-base text-[#2A2A28]">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#2A2A28]/60 block">Paid So Far</span>
              <span className="font-serif font-bold text-base text-[#B7CBA8] text-[#2B3A2A]">
                ${paidAmount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#2A2A28]/60 block">Balance Due</span>
              <span className="font-serif font-bold text-base text-[#C9A15A]">
                ${remainingBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Mode Pill Toggle: Full vs Partial */}
          <div className="flex items-center space-x-2 bg-[#F3EFE7] p-1 rounded-2xl border border-[#E4DFD0]">
            <button
              type="button"
              onClick={() => handleModeChange('full')}
              className={`flex-1 py-2 text-xs font-mono font-medium rounded-xl transition-all cursor-pointer ${
                paymentMode === 'full'
                  ? 'bg-[#2B3A2A] text-white shadow-xs'
                  : 'text-[#2A2A28]/70 hover:text-[#2A2A28]'
              }`}
            >
              Full Settlement (${remainingBalance.toFixed(2)})
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('partial')}
              className={`flex-1 py-2 text-xs font-mono font-medium rounded-xl transition-all cursor-pointer ${
                paymentMode === 'partial'
                  ? 'bg-[#2B3A2A] text-white shadow-xs'
                  : 'text-[#2A2A28]/70 hover:text-[#2A2A28]'
              }`}
            >
              Partial Deposit
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1.5">
              Payment Amount ($ USD)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-serif font-bold text-[#2A2A28]/60">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E4DFD0] rounded-xl text-sm font-serif font-bold focus:outline-hidden focus:border-[#2B3A2A] focus:ring-1 focus:ring-[#2B3A2A]"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {canCash && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border text-left flex items-center space-x-3 cursor-pointer transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-[#2B3A2A] bg-[#B7CBA8]/20 shadow-xs'
                      : 'border-[#E4DFD0] bg-white hover:border-[#2B3A2A]/40'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#B7CBA8] text-[#2B3A2A] flex items-center justify-center font-bold">
                    $
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold block text-[#2A2A28]">Cash</span>
                    <span className="text-[10px] text-[#2A2A28]/60">Front Desk Drawer</span>
                  </div>
                </button>
              )}

              {canCard && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('offline-card')}
                  className={`p-3 rounded-2xl border text-left flex items-center space-x-3 cursor-pointer transition-all ${
                    paymentMethod === 'offline-card'
                      ? 'border-[#2B3A2A] bg-[#BFDCC4]/30 shadow-xs'
                      : 'border-[#E4DFD0] bg-white hover:border-[#2B3A2A]/40'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#BFDCC4] text-[#2B3A2A] flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold block text-[#2A2A28]">Offline POS</span>
                    <span className="text-[10px] text-[#2A2A28]/60">Physical Terminal</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Reference & Notes */}
          {paymentMethod === 'offline-card' && (
            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1.5">
                POS Transaction / Slip Reference *
              </label>
              <input
                type="text"
                placeholder="e.g. POS-982124 / Receipt #4410"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-[#FFFFFF] border border-[#E4DFD0] rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#2B3A2A]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1.5">
              Shift Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Collected by Housekeeping on room turn"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#FFFFFF] border border-[#E4DFD0] rounded-xl text-xs font-sans focus:outline-hidden focus:border-[#2B3A2A]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E4DFD0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#2A2A28]/70 hover:text-[#2A2A28] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || remainingBalance <= 0}
              className="px-6 py-2.5 bg-[#2B3A2A] text-white hover:bg-[#1F2B20] disabled:opacity-50 text-xs font-mono uppercase tracking-wider rounded-xl font-bold transition-all shadow-sm cursor-pointer flex items-center space-x-2"
            >
              {loading ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#B7CBA8]" />
                  <span>Record ${parseFloat(amount || 0).toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarmRecordPaymentDialog;
