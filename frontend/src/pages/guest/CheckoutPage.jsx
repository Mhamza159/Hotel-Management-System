import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  CreditCard,
  Banknote,
  ShieldCheck,
  CheckCircle,
  FileText,
  AlertCircle,
  Calendar,
  Lock,
  Tag,
  Award,
  Loader2,
} from 'lucide-react';
import GuestLayout from '../../layouts/GuestLayout';
import PriceBreakdown from '../../components/guest/PriceBreakdown';
import { KeycardLoader } from '../../components/common/KeycardLoader';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBookingDraftStore } from '../../stores/useBookingDraftStore';
import { bookingService } from '../../services/booking.service';
import { engagementService } from '../../services/engagement.service';
import { PAYMENT_PROVIDERS } from '../../config/constants';

const checkoutSchema = z.object({
  specialRequests: z.string().max(500).optional(),
  paymentMethod: z.enum([PAYMENT_PROVIDERS.CASH, PAYMENT_PROVIDERS.OFFLINE_CARD]),
});

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { selectedRooms, checkInDate, checkOutDate, numberOfGuests, clearDraft } =
    useBookingDraftStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [serverError, setServerError] = useState('');

  const nights = Math.max(
    1,
    checkInDate && checkOutDate
      ? Math.round(
          (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 1
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      specialRequests: '',
      paymentMethod: PAYMENT_PROVIDERS.CASH,
    },
  });

  const selectedPaymentMethod = watch('paymentMethod');

  // Guard against direct navigation with zero selected rooms
  if (!confirmedBooking && (!selectedRooms || selectedRooms.length === 0)) {
    return (
      <GuestLayout>
        <div className="max-w-md mx-auto my-24 p-8 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl text-center shadow-sm">
          <h2 className="text-lg font-bold text-[#2A2A28] mb-2">No Suites Selected</h2>
          <p className="text-xs text-[#2A2A28]/70 mb-6">
            Please choose a suite from our inventory before proceeding to checkout.
          </p>
          <Link
            to="/rooms"
            className="px-6 py-2.5 bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Explore Available Suites
          </Link>
        </div>
      </GuestLayout>
    );
  }

  const [couponCode, setCouponCode] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState({ loyaltyPoints: 0, discountValue: 0 });

  useEffect(() => {
    if (user) {
      engagementService.getLoyaltyBalance()
        .then((res) => {
          setLoyaltyBalance(res || { loyaltyPoints: 0, discountValue: 0 });
        })
        .catch(() => {});
    }
  }, [user]);

  const onSubmit = async (data) => {
    try {
      setServerError('');
      setIsSubmitting(true);

      const payload = {
        roomIds: selectedRooms.map((r) => r._id),
        rooms: selectedRooms.map((r) => ({
          roomId: r._id,
          pricePerNight: r.pricePerNight,
        })),
        checkInDate,
        checkOutDate,
        numberOfGuests: Number(numberOfGuests || 2),
        specialRequests: data.specialRequests || '',
        paymentMethod: data.paymentMethod,
        couponCode: couponCode.trim() ? couponCode.trim().toUpperCase() : undefined,
        redeemLoyaltyPoints: Boolean(redeemPoints),
      };

      const response = await bookingService.createBooking(payload);
      const bookingData = response.booking || response;

      setConfirmedBooking(bookingData);
      clearDraft();
    } catch (err) {
      console.error('Booking submission failure:', err);
      setServerError(
        err.message ||
          'Failed to complete reservation. The suite may have been locked by another guest.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (confirmedBooking?._id) {
      bookingService.downloadInvoice(
        confirmedBooking._id,
        confirmedBooking.bookingReference
      );
    }
  };

  return (
    <GuestLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-[#F5F1E8]">
        {/* Booking Confirmation Success State */}
        {confirmedBooking ? (
          <div className="bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-8 sm:p-12 shadow-sm text-center space-y-6 text-[#2A2A28]">
            <div className="w-16 h-16 rounded-full bg-[#2B3A2A]/10 border border-[#2B3A2A]/30 flex items-center justify-center mx-auto text-[#2B3A2A]">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs uppercase tracking-widest text-[#2B3A2A] font-semibold block mb-1">
                Reservation Confirmed
              </span>
              <h1 className="font-serif text-3xl font-normal text-[#2A2A28]">
                We Look Forward to Welcoming You
              </h1>
              <p className="text-xs text-[#2A2A28]/70 mt-2">
                Your reservation has been securely committed via ACID transaction lock.
              </p>
            </div>

            {/* Reference Highlight */}
            <div className="p-4 bg-[#F5F1E8] rounded-xl border border-[#E4DFD0] max-w-sm mx-auto">
              <span className="text-[10px] uppercase tracking-wider text-[#2A2A28]/70 block">
                Booking Reference
              </span>
              <span className="font-mono text-xl font-bold text-[#2B3A2A]">
                #{confirmedBooking.bookingReference}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-xs text-[#2A2A28]/70 text-left">
              <div>
                <span>Check-in:</span>
                <p className="font-semibold text-[#2A2A28]">
                  {new Date(confirmedBooking.checkInDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span>Check-out:</span>
                <p className="font-semibold text-[#2A2A28]">
                  {new Date(confirmedBooking.checkOutDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span>Total Amount:</span>
                <p className="font-semibold text-[#C9A15A]">
                  ${confirmedBooking.totalPrice ?? confirmedBooking.totalAmount ?? 0}
                  {confirmedBooking.discountAmount > 0 && (
                    <span className="text-[10px] text-[#B5533C] ml-1.5 font-normal">
                      (-${confirmedBooking.discountAmount} saved)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span>Payment Mode:</span>
                <p className="font-semibold text-[#2B3A2A] capitalize">
                  {confirmedBooking.paymentMethod?.replace('_', ' ') || 'Cash at Desk'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-[#E4DFD0] flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleDownloadInvoice}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#F5F1E8] hover:bg-[#E4DFD0] text-[#2A2A28] text-xs font-semibold rounded-lg border border-[#E4DFD0] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#2B3A2A]" />
                <span>Download Tax Invoice (PDF)</span>
              </button>

              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold rounded-lg shadow-sm transition-colors text-center"
              >
                View in Guest Portal &rarr;
              </Link>
            </div>
          </div>
        ) : (
          /* Normal Checkout Form */
          <div>
            <div className="mb-8">
              <span className="text-xs uppercase tracking-widest text-[#2B3A2A] font-semibold block mb-1">
                Final Step
              </span>
              <h1 className="font-display text-3xl font-bold text-[#2A2A28]">
                Confirm Your Stay
              </h1>
              <p className="text-xs text-[#2A2A28]/70 mt-1">
                Review your reservation details and select an in-person payment method.
              </p>
            </div>

            {serverError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {isSubmitting ? (
              <div className="p-12 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl text-center">
                <KeycardLoader message="Locking room inventory & committing reservation..." />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* 1. Stay & Suite Summary */}
                <div className="p-6 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#2A2A28]">
                    Selected Stay
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F5F1E8] rounded-xl border border-[#E4DFD0] text-xs gap-3">
                    <div className="flex items-center space-x-3 text-[#2A2A28]">
                      <Calendar className="w-4 h-4 text-[#2B3A2A]" />
                      <span>
                        {checkInDate} &rarr; {checkOutDate}
                      </span>
                    </div>
                    <span className="font-semibold text-[#2B3A2A]">{nights} Nights</span>
                    <span className="text-[#2A2A28]">{numberOfGuests} Guests</span>
                  </div>

                  <PriceBreakdown rooms={selectedRooms} nights={nights} />

                  {/* Promo Code & Loyalty Discounts */}
                  <div className="pt-4 border-t border-[#E4DFD0] space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-4 h-4 text-[#2B3A2A] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Promo code (e.g. WELCOME10, SUMMER20, VIP50)"
                          className="w-full pl-9 pr-3 py-2 bg-[#F5F1E8] border border-[#E4DFD0] rounded-lg text-xs text-[#2A2A28] placeholder-[#2A2A28]/50 outline-none uppercase font-mono tracking-wider focus:border-[#2B3A2A]"
                        />
                      </div>
                      {couponCode && (
                        <button
                          type="button"
                          onClick={() => setCouponCode('')}
                          className="text-[11px] text-[#2A2A28]/70 hover:text-[#2A2A28] px-2 py-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Loyalty Points Redemption (if guest has points) */}
                    {loyaltyBalance?.loyaltyPoints >= 100 && (
                      <div className="p-3 bg-[#FAF8F2] border border-[#E4DFD0] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#C9A15A]" />
                          <div>
                            <p className="text-xs font-semibold text-[#2A2A28]">
                              Redeem Loyalty Reward Points
                            </p>
                            <p className="text-[10px] text-[#2A2A28]/70">
                              You have <span className="font-semibold text-[#C9A15A]">{loyaltyBalance.loyaltyPoints} points</span> available (${Math.floor(loyaltyBalance.loyaltyPoints / 100) * 10} value)
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={redeemPoints}
                            onChange={(e) => setRedeemPoints(e.target.checked)}
                            className="w-4 h-4 accent-[#2B3A2A] rounded cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-[#2B3A2A]">Apply</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Guest Information */}
                <div className="p-6 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#2A2A28]">
                    Guest Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#2A2A28]/70 block mb-1">Full Name</span>
                      <p className="font-semibold text-[#2A2A28] p-2.5 bg-[#F5F1E8] rounded-lg border border-[#E4DFD0]">
                        {user?.name || 'Guest User'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#2A2A28]/70 block mb-1">Email Address</span>
                      <p className="font-semibold text-[#2A2A28] p-2.5 bg-[#F5F1E8] rounded-lg border border-[#E4DFD0]">
                        {user?.email || 'guest@example.com'}
                      </p>
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2A2A28]/70 uppercase tracking-wider mb-2">
                      Special Inquiries or Requests <span className="text-[10px] lowercase">(Optional)</span>
                    </label>
                    <textarea
                      {...register('specialRequests')}
                      rows={3}
                      placeholder="e.g. Quiet floor, early check-in preference, or dietary requirements."
                      className="w-full p-3 bg-[#F5F1E8] border border-[#E4DFD0] rounded-lg text-xs text-[#2A2A28] placeholder-[#2A2A28]/50 focus:outline-none focus:border-[#2B3A2A] transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* 3. In-Person Payment Method Selector */}
                <div className="p-6 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#2A2A28]">
                    Payment Preference
                  </h3>
                  <p className="text-xs text-[#2A2A28]/70">
                    Payment is finalized in person at the front desk upon arrival. Choose your preferred settlement method:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label
                      className={`p-4 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all ${
                        selectedPaymentMethod === PAYMENT_PROVIDERS.CASH
                          ? 'bg-[#2B3A2A]/5 border-[#2B3A2A]'
                          : 'bg-[#F5F1E8] border-[#E4DFD0] hover:border-[#2B3A2A]'
                      }`}
                    >
                      <input
                        type="radio"
                        value={PAYMENT_PROVIDERS.CASH}
                        {...register('paymentMethod')}
                        className="mt-1 accent-[#2B3A2A]"
                      />
                      <div>
                        <span className="font-semibold text-xs text-[#2A2A28] flex items-center space-x-1.5">
                          <Banknote className="w-4 h-4 text-[#2B3A2A]" />
                          <span>Cash at Front Desk</span>
                        </span>
                        <p className="text-[11px] text-[#2A2A28]/70 mt-1 leading-relaxed">
                          Pay physical currency to the receptionist during check-in inspection.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-4 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all ${
                        selectedPaymentMethod === PAYMENT_PROVIDERS.OFFLINE_CARD
                          ? 'bg-[#2B3A2A]/5 border-[#2B3A2A]'
                          : 'bg-[#F5F1E8] border-[#E4DFD0] hover:border-[#2B3A2A]'
                      }`}
                    >
                      <input
                        type="radio"
                        value={PAYMENT_PROVIDERS.OFFLINE_CARD}
                        {...register('paymentMethod')}
                        className="mt-1 accent-[#2B3A2A]"
                      />
                      <div>
                        <span className="font-semibold text-xs text-[#2A2A28] flex items-center space-x-1.5">
                          <CreditCard className="w-4 h-4 text-[#2B3A2A]" />
                          <span>POS Card Terminal at Desk</span>
                        </span>
                        <p className="text-[11px] text-[#2A2A28]/70 mt-1 leading-relaxed">
                          Swipe / tap your credit or debit card at the physical front desk terminal.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Final Submit CTA */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-2 text-xs text-[#2B3A2A]">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-[#2B3A2A]" />
                    <span>Free cancellation up to 48 hours prior to check-in</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#2B3A2A] hover:bg-[#1F2B20] disabled:opacity-75 disabled:cursor-not-allowed text-[#F5F1E8] font-semibold text-sm rounded-xl shadow-md transition-all duration-200 active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#F5F1E8]" />
                        <span>Securing Suite & Confirming...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Complete Reservation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </GuestLayout>
  );
};

export default CheckoutPage;
