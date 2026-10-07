import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import {
  CalendarCheck,
  User,
  BedDouble,
  CreditCard,
  FileDown,
  X,
  Clock,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { bookingService } from '../../services/booking.service';

const STATUS_CHIP_COLORS = {
  confirmed: { bg: 'rgba(62, 207, 142, 0.1)', text: '#3ECF8E', border: 'rgba(62, 207, 142, 0.3)' },
  checked_in: { bg: 'rgba(63, 208, 201, 0.1)', text: '#3FD0C9', border: 'rgba(63, 208, 201, 0.3)' },
  checked_out: { bg: 'rgba(135, 145, 163, 0.1)', text: '#8791A3', border: 'rgba(135, 145, 163, 0.3)' },
  completed: { bg: 'rgba(135, 145, 163, 0.1)', text: '#8791A3', border: 'rgba(135, 145, 163, 0.3)' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
};

const PAYMENT_CHIP_COLORS = {
  completed: { bg: 'rgba(62, 207, 142, 0.1)', text: '#3ECF8E' },
  pending: { bg: 'rgba(201, 161, 90, 0.1)', text: '#C9A15A' },
  refunded: { bg: 'rgba(239, 68, 68, 0.1)', text: '#F87171' },
};

export const BookingDetailModal = ({ open, onClose, booking }) => {
  if (!booking) return null;

  const statusStyle = STATUS_CHIP_COLORS[booking.status] || STATUS_CHIP_COLORS.confirmed;
  const paymentStyle = PAYMENT_CHIP_COLORS[booking.paymentStatus] || PAYMENT_CHIP_COLORS.pending;

  const handleDownloadInvoice = async () => {
    try {
      await bookingService.downloadInvoice(booking._id, booking.bookingReference);
    } catch (err) {
      console.error('Invoice download failed:', err);
    }
  };

  const checkIn = new Date(booking.checkInDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const checkOut = new Date(booking.checkOutDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          borderRadius: 2,
          color: '#ECEFF3',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #2A3547', pb: 2 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 flex items-center justify-center text-[#3FD0C9]">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#ECEFF3' }}>
                  Reservation #{booking.bookingReference}
                </Typography>
                <Chip
                  label={booking.status?.replace('_', ' ')}
                  size="small"
                  sx={{
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.text,
                    border: `1px solid ${statusStyle.border}`,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: '0.65rem',
                    height: 20,
                  }}
                />
              </div>
              <Typography variant="caption" sx={{ color: '#8791A3' }}>
                Created on {new Date(booking.createdAt).toLocaleString()}
              </Typography>
            </div>
          </div>
          <IconButton onClick={onClose} size="small" sx={{ color: '#8791A3' }}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }} className="space-y-6">
        {/* Section 1: Guest Information */}
        <div className="p-4 bg-[#0A0F1A] border border-[#2A3547] rounded-xl">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[#3FD0C9]">
            <User className="w-4 h-4" />
            <span>Primary Guest Information</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] text-[#8791A3] block">Full Name</span>
              <p className="text-sm font-semibold text-[#ECEFF3]">{booking.userId?.name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[11px] text-[#8791A3] block">Email Address</span>
              <p className="text-sm font-semibold text-[#ECEFF3]">{booking.userId?.email || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[11px] text-[#8791A3] block">Contact Phone</span>
              <p className="text-sm font-semibold text-[#ECEFF3]">{booking.userId?.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Stay Dates & Suites */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#0A0F1A] border border-[#2A3547] rounded-xl">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[#3FD0C9]">
              <Clock className="w-4 h-4" />
              <span>Itinerary Dates</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#8791A3]">Check-In:</span>
                <span className="font-semibold text-[#ECEFF3]">{checkIn}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8791A3]">Check-Out:</span>
                <span className="font-semibold text-[#ECEFF3]">{checkOut}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-[#2A3547] pt-2">
                <span className="text-[#8791A3]">Total Nights:</span>
                <span className="font-semibold text-[#3FD0C9]">
                  {Math.max(
                    1,
                    Math.ceil(
                      (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}{' '}
                  Nights
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#0A0F1A] border border-[#2A3547] rounded-xl">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[#3FD0C9]">
              <BedDouble className="w-4 h-4" />
              <span>Assigned Suites ({booking.rooms?.length || 0})</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {booking.rooms?.map((r, idx) => (
                <div
                  key={r._id || idx}
                  className="flex items-center justify-between text-xs p-2 bg-[#131A26] rounded-lg border border-[#2A3547]"
                >
                  <div>
                    <span className="font-bold text-[#ECEFF3]">
                      Suite {r.roomId?.roomNumber || 'Room'}
                    </span>
                    <span className="text-[10px] text-[#8791A3] block uppercase">
                      {r.roomId?.type || 'Deluxe'}
                    </span>
                  </div>
                  <span className="font-mono text-[#C9A15A] font-semibold">
                    ${r.pricePerNight || r.roomId?.pricePerNight || 0}/night
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Financial Settlement & Invoicing */}
        <div className="p-4 bg-[#0A0F1A] border border-[#2A3547] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#3FD0C9]">
              <CreditCard className="w-4 h-4" />
              <span>Authoritative Financial Settlement</span>
            </div>
            <Chip
              label={`Payment: ${booking.paymentStatus}`}
              size="small"
              sx={{
                backgroundColor: paymentStyle.bg,
                color: paymentStyle.text,
                fontWeight: 700,
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                height: 20,
              }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-[#8791A3] block">Total Amount</span>
              <p className="text-lg font-bold text-[#C9A15A] font-mono">
                ${(booking.totalPrice ?? booking.totalAmount ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-[#8791A3] block">Idempotency Key</span>
              <p className="text-[10px] font-mono text-[#8791A3] truncate" title={booking.idempotencyKey}>
                {booking.idempotencyKey || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-[#8791A3] block">Payment Gateway</span>
              <p className="text-xs text-[#ECEFF3] font-medium">Stripe / Authoritative Mock</p>
            </div>
            <div>
              <span className="text-[11px] text-[#8791A3] block">Refund Status</span>
              <p className="text-xs text-[#ECEFF3] font-medium">
                {booking.cancellation ? `${booking.cancellation.refundPercentage}% Refunded` : 'No Refund'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #2A3547', p: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={handleDownloadInvoice}
          startIcon={<FileDown className="w-4 h-4" />}
          sx={{
            color: '#3FD0C9',
            borderColor: 'rgba(63, 208, 201, 0.4)',
            '&:hover': { backgroundColor: 'rgba(63, 208, 201, 0.1)' },
          }}
          variant="outlined"
          size="small"
        >
          Download PDF Tax Invoice
        </Button>
        <Button onClick={onClose} sx={{ color: '#8791A3' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
