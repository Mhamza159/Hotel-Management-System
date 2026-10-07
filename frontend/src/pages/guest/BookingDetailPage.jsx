import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  FileDown,
  Clock,
  Sparkles,
  BedDouble,
  ShieldCheck,
  AlertTriangle,
  Star,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { bookingService } from '../../services/booking.service';
import { Navbar } from '../../components/guest/Navbar';
import { Footer } from '../../components/guest/Footer';
import { BookingStatusBadge } from '../../components/common/BookingStatusBadge';
import { CancellationRequestModal } from '../../components/guest/CancellationRequestModal';
import { SubmitReviewModal } from '../../components/guest/SubmitReviewModal';

/**
 * Detailed Guest Reservation Breakdown Page
 * Route: /my-bookings/:id
 */
export const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookingService.getBookingById(id);
      setBooking(res?.booking || res);
    } catch (err) {
      console.error('Failed to load booking details:', err);
      setError(err?.response?.data?.message || 'Unable to retrieve reservation details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!booking) return;
    try {
      setDownloadingInvoice(true);
      await bookingService.downloadInvoice(booking._id, booking.bookingReference);
    } catch (err) {
      console.error('Failed to download invoice:', err);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
          <div className="w-8 h-8 border-2 border-[#2B3A2A] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#2A2A28]/70">Retrieving reservation details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-xl font-bold text-[#2A2A28]">Booking Not Found</h2>
          <p className="text-xs text-[#2A2A28]/70">{error || 'This reservation does not exist or has been removed.'}</p>
          <Link
            to="/my-bookings"
            className="inline-block px-4 py-2 bg-[#FAF8F2] hover:bg-[#F5F1E8] border border-[#E4DFD0] rounded-xl text-xs font-semibold text-[#2A2A28]"
          >
            &larr; Back to My Bookings
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isConfirmed = booking.status === 'confirmed';
  const isCheckedOut = booking.status === 'checked-out' || booking.status === 'completed';

  const total = booking.totalAmount || booking.totalPrice || 0;
  const paid = booking.paidAmount || 0;
  const balance = Math.max(0, total - paid);

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between border-b border-[#E4DFD0] pb-4">
          <Link
            to="/my-bookings"
            className="flex items-center gap-2 text-xs font-semibold text-[#2A2A28]/70 hover:text-[#2A2A28] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Stays</span>
          </Link>

          <button
            onClick={() => bookingService.downloadInvoice(booking._id, booking.bookingReference)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FAF8F2] hover:bg-[#F5F1E8] border border-[#E4DFD0] text-xs font-semibold text-[#2A2A28] transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-[#2B3A2A]" />
            <span>Download Tax Invoice (PDF)</span>
          </button>
        </div>

        {/* Hero Summary Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DFD0] pb-6">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#2A2A28]/60 block">
                Booking Reference
              </span>
              <h1 className="font-mono text-2xl font-bold text-[#2B3A2A]">
                #{booking.bookingReference}
              </h1>
            </div>

            {/* Status Badge */}
            <div>
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>

          {/* Stay Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0]">
              <span className="text-xs text-[#2A2A28]/70 block mb-1">Check-In</span>
              <span className="text-sm font-semibold text-[#2A2A28] block">
                {new Date(booking.checkInDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-[11px] text-[#2B3A2A] font-medium">From 3:00 PM</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0]">
              <span className="text-xs text-[#2A2A28]/70 block mb-1">Check-Out</span>
              <span className="text-sm font-semibold text-[#2A2A28] block">
                {new Date(booking.checkOutDate).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="text-[11px] text-[#8C8578] font-medium">Until 11:00 AM</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0]">
              <span className="text-xs text-[#2A2A28]/70 block mb-1">Guest Attribution</span>
              <span className="text-sm font-semibold text-[#2A2A28] block">
                {booking.guestInfo?.fullName || booking.userId?.name || 'Guest'}
              </span>
              <span className="text-[11px] text-[#2A2A28]/70">
                {booking.guestInfo?.phone || booking.userId?.email}
              </span>
            </div>
          </div>

          {/* Reserved Rooms */}
          <div>
            <h3 className="text-xs uppercase font-mono tracking-wider text-[#2A2A28] font-bold mb-3">
              Reserved Suite(s)
            </h3>
            <div className="space-y-2">
              {booking.rooms?.map((rm, idx) => {
                const roomObj = rm.roomId || {};
                const isCheckedIn = booking.status === 'checked-in' || booking.status === 'checked-out' || booking.status === 'completed';
                const type = roomObj.type || 'Suite';
                const rate = rm.pricePerNight || roomObj.pricePerNight || 0;
                const titleText = isCheckedIn && roomObj.roomNumber
                  ? `Room #${roomObj.roomNumber} • ${type.toUpperCase()} Suite`
                  : `${type.toUpperCase()} Luxury Suite`;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#FAF8F2] border border-[#E4DFD0] text-[#2B3A2A]">
                        <BedDouble className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[#2A2A28] block">
                          {titleText}
                        </span>
                        <span className="text-xs text-[#2A2A28]/70">
                          {isCheckedIn ? 'Key Issued • Occupied' : '🛎️ Physical room allotted upon Front Desk check-in'} &bull; Capacity: {roomObj.capacity || 2} Guests
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#C9A15A]">
                      ${rate.toFixed(2)} / night
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settlement / Financial Breakdown */}
          <div className="p-5 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] space-y-3">
            <h3 className="text-xs uppercase font-mono tracking-wider text-[#2A2A28] font-bold">
              Financial Breakdown
            </h3>
            <div className="space-y-1.5 text-xs text-[#2A2A28]/70">
              <div className="flex justify-between">
                <span>Total Reservation Amount</span>
                <span className="text-[#2A2A28] font-semibold">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Paid</span>
                <span className="text-[#2B3A2A] font-semibold">${paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E4DFD0] text-sm">
                <span className="font-bold text-[#2A2A28]">Balance Due</span>
                <span className="font-bold text-[#C9A15A]">${balance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E4DFD0] flex-wrap gap-4">
            <div>
              {isCheckedOut && (
                <button
                  onClick={() => setReviewModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] font-semibold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-[#C9A15A] text-[#C9A15A]" />
                  <span>Write Verified Stay Review</span>
                </button>
              )}

              {isConfirmed && (
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F2] hover:bg-[#B5533C]/10 text-[#B5533C] border border-[#B5533C]/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Request Stay Cancellation
                </button>
              )}
            </div>

            <button
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              className="text-xs text-[#2B3A2A] hover:underline disabled:opacity-50 flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              {downloadingInvoice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#2B3A2A]" />
                  <span>Generating Invoice PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-[#2B3A2A]" />
                  <span>Download Tax Invoice (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {cancelModalOpen && (
        <CancellationRequestModal
          isOpen={cancelModalOpen}
          booking={booking}
          onClose={() => setCancelModalOpen(false)}
          onSuccess={() => {
            fetchBooking();
          }}
        />
      )}

      {reviewModalOpen && (
        <SubmitReviewModal
          isOpen={reviewModalOpen}
          booking={booking}
          onClose={() => setReviewModalOpen(false)}
          onSuccess={() => {
            fetchBooking();
          }}
        />
      )}
    </div>
  );
};

export default BookingDetailPage;
