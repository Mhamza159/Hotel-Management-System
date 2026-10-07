import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Box,
  Divider,
  ButtonGroup,
  Chip,
} from '@mui/material';
import { CreditCard, DollarSign, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { deskService } from '../../services/desk.service';

/**
 * In-Person Physical Cash & Offline POS Card Payment Modal
 * Features: Full Settlement vs. Partial Advance Deposit Toggle, Live Ledger, and Check-Out Lock Disclosure.
 */
export const RecordPaymentDialog = ({ open, onClose, booking, onSuccess }) => {
  const [paymentMode, setPaymentMode] = useState('full'); // 'full' | 'partial'
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
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
      setPaymentMethod('cash');
      setTransactionReference('');
      setNotes('');
      setError(null);
    }
  }, [open, booking, remainingBalance]);

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    setError(null);
    if (mode === 'full') {
      setAmount(remainingBalance.toString());
    } else {
      // Suggest half as a convenient deposit default
      const half = Math.round((remainingBalance / 2) * 100) / 100;
      setAmount(half > 0 ? half.toString() : remainingBalance.toString());
    }
  };

  const parsedAmount = Number(amount) || 0;
  const remainingAfterThis = Math.max(0, remainingBalance - parsedAmount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!booking?._id) return;

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }

    if (parsedAmount > remainingBalance) {
      setError(`Payment cannot exceed outstanding balance of $${remainingBalance.toFixed(2)}.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        amount: parsedAmount,
        paymentMethod,
        paymentType: parsedAmount >= remainingBalance ? 'full' : 'partial',
        transactionReference: transactionReference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const result = await deskService.recordPayment(booking._id, payload);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      console.error('Failed to record payment:', err);
      setError(err?.message || err?.response?.data?.message || 'Failed to record in-person payment.');
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
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #2A3547' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              backgroundColor: 'rgba(63, 208, 201, 0.15)',
              color: '#3FD0C9',
              display: 'flex',
            }}
          >
            <DollarSign className="w-5 h-5" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#ECEFF3', fontSize: '1.1rem' }}>
              Record Front Desk Payment
            </Typography>
            <Typography variant="caption" sx={{ color: '#8791A3' }}>
              Attributed to Logged-in Front Desk Officer • Dual Gate Policy
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ mt: 2 }}>
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                backgroundColor: 'rgba(242, 84, 91, 0.1)',
                color: '#F2545B',
                border: '1px solid rgba(242, 84, 91, 0.2)',
              }}
            >
              {error}
            </Alert>
          )}

          {/* Payment Type Selection Mode Toggle */}
          <Box sx={{ mb: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#8791A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Payment Tier
            </Typography>
            <ButtonGroup fullWidth sx={{ borderRadius: 2 }}>
              <Button
                variant={paymentMode === 'full' ? 'contained' : 'outlined'}
                onClick={() => handleModeChange('full')}
                startIcon={<CheckCircle className="w-4 h-4" />}
                sx={{
                  py: 1,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  borderColor: '#2A3547',
                  backgroundColor: paymentMode === 'full' ? '#3ECF8E' : 'transparent',
                  color: paymentMode === 'full' ? '#0A0F1A' : '#ECEFF3',
                  '&:hover': {
                    backgroundColor: paymentMode === 'full' ? '#34B77C' : 'rgba(62, 207, 142, 0.08)',
                  },
                }}
              >
                Pay in Full (${remainingBalance.toFixed(2)})
              </Button>
              <Button
                variant={paymentMode === 'partial' ? 'contained' : 'outlined'}
                onClick={() => handleModeChange('partial')}
                startIcon={<CreditCard className="w-4 h-4" />}
                sx={{
                  py: 1,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  borderColor: '#2A3547',
                  backgroundColor: paymentMode === 'partial' ? '#C9A15A' : 'transparent',
                  color: paymentMode === 'partial' ? '#0A0F1A' : '#ECEFF3',
                  '&:hover': {
                    backgroundColor: paymentMode === 'partial' ? '#B88E45' : 'rgba(201, 161, 90, 0.08)',
                  },
                }}
              >
                Partial Deposit
              </Button>
            </ButtonGroup>
          </Box>

          {/* Booking Financial Ledger Card */}
          <Box
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 2,
              backgroundColor: '#1B2433',
              border: '1px solid #2A3547',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#8791A3' }}>
                Guest & Booking Reference
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#3FD0C9' }}>
                {booking?.bookingReference} ({booking?.guestInfo?.fullName || booking?.userId?.name || 'Guest'})
              </Typography>
            </Box>

            <Divider sx={{ my: 1, borderColor: '#2A3547' }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                  Total Accommodation
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
                  ${totalAmount.toFixed(2)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                  Paid to Date
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#3ECF8E' }}>
                  ${paidAmount.toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                  Current Balance Due
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#C9A15A' }}>
                  ${remainingBalance.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {/* Simulated Live Post-Payment Ledger */}
            {parsedAmount > 0 && parsedAmount < remainingBalance && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #2A3547', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#E8A33D', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Lock className="w-3.5 h-3.5" />
                  Remaining Balance at Check-Out:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#F2545B' }}>
                  ${remainingAfterThis.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Dual Gate Policy Warning for Partial Payment */}
          {paymentMode === 'partial' && remainingAfterThis > 0 && (
            <Alert
              severity="warning"
              icon={<AlertTriangle className="w-4 h-4 text-[#C9A15A]" />}
              sx={{
                mb: 2.5,
                backgroundColor: 'rgba(201, 161, 90, 0.1)',
                color: '#C9A15A',
                border: '1px solid rgba(201, 161, 90, 0.3)',
                fontSize: '0.8rem',
              }}
            >
              <strong>Dual Gate Notice:</strong> Recording this partial deposit will unlock guest Check-In. However, <strong>Check-Out will be strictly locked</strong> until the remaining ${remainingAfterThis.toFixed(2)} is settled.
            </Alert>
          )}

          {/* Form Input Fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Payment Amount ($)"
                type="number"
                inputProps={{ step: '0.01', min: '0.01', max: remainingBalance }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                fullWidth
                size="small"
                disabled={loading || paymentMode === 'full'}
                sx={{
                  '& .MuiInputBase-input': { color: '#ECEFF3' },
                  '& .MuiInputLabel-root': { color: '#8791A3' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#2A3547' },
                    '&:hover fieldset': { borderColor: '#3FD0C9' },
                  },
                }}
              />

              <FormControl fullWidth size="small">
                <InputLabel id="payment-method-label" sx={{ color: '#8791A3' }}>Payment Method</InputLabel>
                <Select
                  labelId="payment-method-label"
                  value={paymentMethod}
                  label="Payment Method"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={loading}
                  sx={{
                    color: '#ECEFF3',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2A3547' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3FD0C9' },
                  }}
                >
                  <MenuItem value="cash">Physical Cash (Front Drawer)</MenuItem>
                  <MenuItem value="offline-card">Offline POS Terminal / Credit Card</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Transaction / POS Slip Reference"
              placeholder="e.g. POS-SLIP-#9281, Cash receipt #042"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              fullWidth
              size="small"
              disabled={loading}
              sx={{
                '& .MuiInputBase-input': { color: '#ECEFF3' },
                '& .MuiInputLabel-root': { color: '#8791A3' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#2A3547' },
                  '&:hover fieldset': { borderColor: '#3FD0C9' },
                },
              }}
            />

            <TextField
              label="Staff Notes / Remarks"
              placeholder="e.g. Advance deposit paid; balance due on departure key return"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
              disabled={loading}
              sx={{
                '& .MuiInputBase-input': { color: '#ECEFF3' },
                '& .MuiInputLabel-root': { color: '#8791A3' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#2A3547' },
                  '&:hover fieldset': { borderColor: '#3FD0C9' },
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #2A3547', gap: 1 }}>
          <Button onClick={onClose} disabled={loading} sx={{ color: '#8791A3', '&:hover': { color: '#ECEFF3' } }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || parsedAmount <= 0}
            startIcon={
              loading ? (
                <CircularProgress size={16} sx={{ color: '#0A0F1A' }} />
              ) : (
                <DollarSign className="w-4 h-4" />
              )
            }
            sx={{
              backgroundColor: '#3FD0C9',
              color: '#0A0F1A',
              fontWeight: 700,
              px: 2.5,
              '&:hover': { backgroundColor: '#2DB9B2' },
              '&.Mui-disabled': { backgroundColor: '#2A3547', color: '#8791A3' },
            }}
          >
            {loading ? 'Recording Settlement...' : `Confirm Payment ($${parsedAmount.toFixed(2)})`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default RecordPaymentDialog;
