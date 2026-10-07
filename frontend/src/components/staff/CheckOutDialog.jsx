import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import { LogOut, AlertTriangle, CheckCircle, BedDouble, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { deskService } from '../../services/desk.service';

/**
 * Check-Out & Room Dirty Status Confirmation Dialog
 * Alerts receptionist of room vacancy and automatic transition to 'DIRTY' status for housekeeping.
 */
export const CheckOutDialog = ({ open, onClose, booking, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!booking) return null;

  const guestName = booking.guestInfo?.fullName || booking.userId?.name || 'Walk-in Guest';
  const guestPhone = booking.guestInfo?.phone || booking.userId?.phone || '';
  const totalAmount = booking.totalPrice ?? booking.totalAmount ?? 0;
  const paidAmount = booking.paidAmount || 0;
  const remainingBalance = Math.max(0, totalAmount - paidAmount);
  const isSettled = remainingBalance === 0;

  const roomsList = booking.rooms || [];

  const handleConfirmCheckOut = async () => {
    try {
      setLoading(true);
      setError(null);

      await deskService.checkOut(booking._id);
      onSuccess?.(`Guest ${guestName} checked out successfully. Room(s) marked 'DIRTY' and dispatched to Housekeeping.`);
      onClose();
    } catch (err) {
      console.error('Check-out error:', err);
      setError(err?.response?.data?.message || err?.message || 'Check-out validation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          color: '#ECEFF3',
          borderRadius: 3,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 2, borderBottom: '1px solid #2A3547' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'rgba(242, 84, 91, 0.15)',
              border: '1px solid rgba(242, 84, 91, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F2545B',
            }}
          >
            <LogOut className="w-5 h-5" />
          </Box>
          <div>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#ECEFF3', lineHeight: 1.2 }}>
              Confirm Guest Check-Out
            </Typography>
            <Typography variant="caption" sx={{ color: '#8791A3' }}>
              Ref: <span style={{ color: '#3FD0C9', fontFamily: 'monospace', fontWeight: 600 }}>{booking.bookingReference}</span> &bull; Room Vacancy Handover
            </Typography>
          </div>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {error && (
          <Alert
            severity="error"
            icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
            sx={{
              backgroundColor: 'rgba(242, 84, 91, 0.1)',
              color: '#F2545B',
              border: '1px solid rgba(242, 84, 91, 0.3)',
              fontSize: '0.8rem',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Guest & Reservation Brief */}
        <Box
          sx={{
            p: 2,
            backgroundColor: '#1B2433',
            border: '1px solid #2A3547',
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <div>
            <Typography variant="caption" sx={{ color: '#8791A3', display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
              Guest In-House
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, color: '#ECEFF3' }}>
              {guestName}
            </Typography>
            {guestPhone && (
              <Typography variant="caption" sx={{ color: '#8791A3' }}>
                {guestPhone}
              </Typography>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#8791A3', display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
              Stay Duration
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
              {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : 'N/A'} &rarr;{' '}
              {booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : 'N/A'}
            </Typography>
          </div>
        </Box>

        {/* Financial Settlement Status */}
        <Box
          sx={{
            p: 2,
            backgroundColor: isSettled ? 'rgba(62, 207, 142, 0.05)' : 'rgba(242, 84, 91, 0.05)',
            border: `1px solid ${isSettled ? 'rgba(62, 207, 142, 0.25)' : 'rgba(242, 84, 91, 0.25)'}`,
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#ECEFF3', textTransform: 'uppercase' }}>
              Folio Financial Settlement
            </Typography>
            <Chip
              size="small"
              icon={isSettled ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              label={isSettled ? 'All Dues Paid in Full ($0.00)' : `Unpaid Balance: $${remainingBalance.toFixed(2)}`}
              sx={{
                fontWeight: 700,
                fontSize: '0.7rem',
                backgroundColor: isSettled ? 'rgba(62, 207, 142, 0.15)' : 'rgba(242, 84, 91, 0.15)',
                color: isSettled ? '#3ECF8E' : '#F2545B',
                border: `1px solid ${isSettled ? 'rgba(62, 207, 142, 0.3)' : 'rgba(242, 84, 91, 0.3)'}`,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#8791A3' }}>
            <span>Total Stay Amount: <strong style={{ color: '#ECEFF3' }}>${totalAmount.toFixed(2)}</strong></span>
            <span>Recorded Payments: <strong style={{ color: '#3ECF8E' }}>${paidAmount.toFixed(2)}</strong></span>
          </Box>

          {!isSettled && (
            <Typography variant="caption" sx={{ color: '#F2545B', display: 'block', mt: 1, fontWeight: 600 }}>
              &bull; Strict Check-Out Lock: Guest must settle remaining ${remainingBalance.toFixed(2)} before check-out can be processed.
            </Typography>
          )}
        </Box>

        {/* Room Cleanliness Status Transition Alert */}
        <Box sx={{ p: 2, backgroundColor: '#1B2433', border: '1px solid #2A3547', borderRadius: 2 }}>
          <Typography variant="caption" sx={{ color: '#E8A33D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <AlertTriangle className="w-4 h-4 text-[#E8A33D]" />
            Automatic Housekeeping Board Status Transition
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {roomsList.map((rm, idx) => {
              const roomObj = rm.roomId || {};
              const roomNum = roomObj.roomNumber || rm.roomNumber || `Room ${idx + 1}`;
              const type = roomObj.type || rm.roomType || 'Deluxe';

              return (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    backgroundColor: '#131A26',
                    border: '1px solid #2A3547',
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BedDouble className="w-4 h-4 text-[#3FD0C9]" />
                    <div>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#ECEFF3' }}>
                        Room #{roomNum}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8791A3', textTransform: 'capitalize' }}>
                        {type} Suite
                      </Typography>
                    </div>
                  </Box>

                  {/* Cleanliness State Transition */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label="Occupied"
                      sx={{
                        height: 22,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(63, 208, 201, 0.15)',
                        color: '#3FD0C9',
                        border: '1px solid rgba(63, 208, 201, 0.3)',
                      }}
                    />
                    <ArrowRight className="w-3.5 h-3.5 text-[#8791A3]" />
                    <Chip
                      size="small"
                      label="DIRTY (Needs Cleaning)"
                      sx={{
                        height: 22,
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        backgroundColor: 'rgba(242, 84, 91, 0.2)',
                        color: '#F2545B',
                        border: '1px solid rgba(242, 84, 91, 0.4)',
                        animation: 'pulse 2s infinite',
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Typography variant="caption" sx={{ color: '#8791A3', display: 'block', mt: 1.5, lineHeight: 1.5 }}>
            Upon confirming check-out, the keycard access will be revoked and these room units will immediately be queued onto the <strong>Housekeeping Board</strong> as <strong>'DIRTY'</strong> for sanitization and turnover.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid #2A3547', gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{ color: '#8791A3', '&:hover': { color: '#ECEFF3' } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmCheckOut}
          disabled={loading || !isSettled}
          startIcon={
            loading ? (
              <CircularProgress size={16} sx={{ color: '#ECEFF3' }} />
            ) : (
              <LogOut className="w-4 h-4" />
            )
          }
          sx={{
            backgroundColor: '#F2545B',
            color: '#ECEFF3',
            fontWeight: 700,
            px: 2.5,
            '&:hover': { backgroundColor: '#E04148' },
            '&.Mui-disabled': { backgroundColor: '#2A3547', color: '#8791A3' },
          }}
        >
          {loading ? 'Checking Out & Marking Dirty...' : 'Confirm Check-Out & Mark Dirty'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CheckOutDialog;
