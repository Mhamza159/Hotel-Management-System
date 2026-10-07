import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { chatService } from '../../services/chat.service';

export const ConfirmationActionModal = ({ open, onClose, pendingAction, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!pendingAction) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await chatService.confirmAdminAction(pendingAction.confirmationToken);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to confirm action. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          color: '#ECEFF3',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #2A3547', pb: 2 }}>
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#ECEFF3' }}>
            Two-Phase Mutation Confirmation
          </Typography>
        </div>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
            {error}
          </Alert>
        )}

        <div className="p-4 bg-[#0A0F1A] border border-[#2A3547] rounded-xl mb-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8791A3] block">
            Requested Action
          </span>
          <p className="text-base font-bold text-[#ECEFF3] mt-1 font-mono">
            {pendingAction.action || 'cancelBooking'}
          </p>
          {pendingAction.bookingReference && (
            <span className="text-xs text-[#3FD0C9] font-mono block mt-1">
              Target Booking: #{pendingAction.bookingReference}
            </span>
          )}
        </div>

        <DialogContentText sx={{ color: '#8791A3', fontSize: '0.875rem' }}>
          This action will mutate production database records and trigger financial/refund settlements.
          A cryptographically signed token has been generated. Confirmation will record an authoritative event in the immutable Security Audit Trail.
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #2A3547', p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#8791A3' }} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ShieldCheck className="w-4 h-4" />}
          sx={{ fontWeight: 700 }}
        >
          {loading ? 'Executing...' : 'Confirm & Execute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
