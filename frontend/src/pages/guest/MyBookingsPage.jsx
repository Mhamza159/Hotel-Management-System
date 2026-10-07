import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  FileDown,
  Clock,
  ArrowRight,
  AlertTriangle,
  Star,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { bookingService } from '../../services/booking.service';
import { Navbar } from '../../components/guest/Navbar';
import { Footer } from '../../components/guest/Footer';
import { BookingStatusBadge } from '../../components/common/BookingStatusBadge';
import { CancellationRequestModal } from '../../components/guest/CancellationRequestModal';
import { SubmitReviewModal } from '../../components/guest/SubmitReviewModal';

/**
 * Guest Stays & Reservations History Page
 * Route: /my-bookings
 */
export const MyBookingsPage = () => {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'cancelled'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bookingService.getMyBookings({ limit: 50 });
      setBookings(res?.bookings || []);
    } catch (err) {
      console.error('Failed to load guest bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownloadInvoice = async (booking) => {
    try {
      setDownloadingInvoiceId(booking._id);
      await bookingService.downloadInvoice(booking._id, booking.bookingReference);
    } catch (err) {
      console.error('Invoice download failed:', err);
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Tab filtering
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const s = b.status;
      if (activeTab === 'upcoming') {
        return s === 'confirmed' || s === 'pending' || s === 'cancellation-requested' || s === 'cancellation_requested' || s === 'checked-in';
      }
      if (activeTab === 'past') {
        return s === 'checked-out' || s === 'completed';
      }
      if (activeTab === 'cancelled') {
        return s === 'cancelled';
      }
      return true;
    });
  }, [bookings, activeTab]);

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DFD0] pb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#2A2A28]">
              My Reservations
            </h1>
            <p className="text-xs text-[#2A2A28]/70 mt-1">
              Track your upcoming stays, access tax invoices, and request changes
            </p>
          </div>

          <button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F2] border border-[#E4DFD0] text-xs text-[#2A2A28] hover:bg-[#E4DFD0]/50 transition-colors self-start cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-[#E4DFD0] gap-8">
          {[
            { id: 'upcoming', label: 'Upcoming Stays' },
            { id: 'past', label: 'Past & Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === tab.id ? 'text-[#2B3A2A]' : 'text-[#2A2A28]/60 hover:text-[#2A2A28]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="active-bookings-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B3A2A]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-[#2B3A2A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#2A2A28]/70">Retrieving your reservations...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mx-auto">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2A2A28]">
                No {activeTab} bookings found
              </p>
              <p className="text-xs text-[#2A2A28]/70 mt-1">
                {activeTab === 'upcoming'
                  ? 'You have no active upcoming stays scheduled.'
                  : `You have no ${activeTab} reservation records.`}
              </p>
            </div>
            {activeTab === 'upcoming' && (
              <Link
                to="/rooms"
                className="inline-block px-5 py-2.5 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold shadow-sm transition-colors"
              >
                Explore Available Suites
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const isConfirmed = b.status === 'confirmed';
              const isCheckedOut = b.status === 'checked-out' || b.status === 'completed';

              return (
                <div
                  key={b._id}
                  className="p-6 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] hover:border-[#2B3A2A]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[#2B3A2A]">
                        #{b.bookingReference}
                      </span>

                      {/* Status Badge */}
                      <BookingStatusBadge status={b.status} />
                    </div>

                    {/* Room and Dates */}
                    <div className="text-xs text-[#2A2A28]/70 space-y-0.5">
                      <p className="font-semibold text-[#2A2A28]">
                        {b.rooms
                          ?.map((r) => {
                            const isCheckedIn = b.status === 'checked-in' || b.status === 'checked-out' || b.status === 'completed';
                            const typeName = r.roomId?.type ? `${r.roomId.type.toUpperCase()} Suite` : 'Luxury Suite';
                            return isCheckedIn && r.roomId?.roomNumber
                              ? `${typeName} (Room #${r.roomId.roomNumber})`
                              : `${typeName} • (Room allotted at check-in)`;
                          })
                          .join(', ')}
                      </p>
                      <p>
                        {new Date(b.checkInDate).toLocaleDateString()} &rarr; {new Date(b.checkOutDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Right Pricing & Actions */}
                  <div className="flex flex-col md:items-end gap-3 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-xs text-[#2A2A28]/70 block">Total Amount</span>
                      <span className="text-lg font-bold text-[#C9A15A]">
                        ${(b.totalAmount || b.totalPrice || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Details */}
                      <Link
                        to={`/my-bookings/${b._id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F2] hover:bg-[#F5F1E8] text-xs font-semibold text-[#2A2A28] border border-[#E4DFD0] transition-colors"
                      >
                        Details
                      </Link>

                      {/* Download PDF Invoice */}
                      <button
                        onClick={() => handleDownloadInvoice(b)}
                        disabled={downloadingInvoiceId === b._id}
                        title="Download Tax Invoice (PDF)"
                        className="p-1.5 rounded-lg bg-[#FAF8F2] hover:bg-[#F5F1E8] disabled:opacity-50 text-[#2B3A2A] border border-[#E4DFD0] transition-colors cursor-pointer"
                      >
                        {downloadingInvoiceId === b._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#2B3A2A]" />
                        ) : (
                          <FileDown className="w-4 h-4" />
                        )}
                      </button>

                      {/* Write Review Action (Only on Checked-Out Stays) */}
                      {isCheckedOut && (
                        <button
                          onClick={() => setReviewModalBooking(b)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-[#C9A15A] text-[#C9A15A]" />
                          <span>Write Review</span>
                        </button>
                      )}

                      {/* Cancel Request Action (Only if confirmed and before check-in) */}
                      {isConfirmed && (
                        <button
                          onClick={() => setCancelModalBooking(b)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#FAF8F2] hover:bg-[#B5533C]/10 border border-[#B5533C]/40 text-xs font-semibold text-[#B5533C] transition-colors cursor-pointer"
                        >
                          Request Cancellation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      {/* Cancellation Request Modal */}
      {cancelModalBooking && (
        <CancellationRequestModal
          isOpen={Boolean(cancelModalBooking)}
          booking={cancelModalBooking}
          onClose={() => setCancelModalBooking(null)}
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}

      {/* Review Modal */}
      {reviewModalBooking && (
        <SubmitReviewModal
          isOpen={Boolean(reviewModalBooking)}
          booking={reviewModalBooking}
          onClose={() => setReviewModalBooking(null)}
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}
    </div>
  );
};

export default MyBookingsPage;
