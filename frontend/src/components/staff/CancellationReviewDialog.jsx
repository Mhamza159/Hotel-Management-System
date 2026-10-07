import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  Box,
  Divider,
  Chip,
  Paper,
} from '@mui/material';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { deskService } from '../../services/desk.service';

/**
 * Staff-Side Authoritative Cancellation Review Dialog
 * Displays calculated hours remaining, applied tier, and verbatim refund amount from backend.
 */
export const CancellationReviewDialog = ({ open, onClose, bookingId, onSuccess }) => {
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
      console.error('Failed to load cancellation review details:', err);
      setError(err?.response?.data?.message || 'Failed to evaluate cancellation refund policy.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Confirm approving cancellation? This will void reservation, release room inventory, and process authoritative refund.')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await deskService.approveCancellation(bookingId);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to approve cancellation:', err);
      setError(err?.response?.data?.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please provide a specific reason for rejecting the cancellation.');
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
      console.error('Failed to reject cancellation:', err);
      setError(err?.response?.data?.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={actionLoading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShieldAlert className="w-5 h-5 text-[#E8A33D]" />
        <span>Cancellation Audit & Authoritative Refund Evaluation</span>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#2A3547' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
            <CircularProgress size={36} sx={{ color: '#3FD0C9' }} />
            <Typography variant="body2" sx={{ color: '#8791A3' }}>
              Calculating authoritative policy refund...
            </Typography>
          </Box>
        ) : reviewData ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Header info strip */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: '#0A0F1A',
                border: '1px solid #2A3547',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: '#8791A3' }}>
                  Booking Reference
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: 'monospace', color: '#3FD0C9', fontWeight: 700 }}>
                  {reviewData.bookingReference}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                  Guest
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
                  {reviewData.guest?.name || 'Guest'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#8791A3' }}>
                  {reviewData.guest?.email} &bull; {reviewData.guest?.phone}
                </Typography>
              </Box>
            </Box>

            {/* Timeline & Cancellation Request Box */}
            <Paper sx={{ p: 2, border: '1px solid #2A3547', backgroundColor: '#131A26' }}>
              <Typography variant="caption" sx={{ color: '#8791A3', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Audit Timeline & Notice Period
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                    Check-in Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
                    {reviewData.timeline?.checkInDate
                      ? new Date(reviewData.timeline.checkInDate).toLocaleDateString()
                      : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                    Notice Window Remaining
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#3FD0C9' }}>
                    {reviewData.timeline?.hoursUntilCheckIn ?? 'N/A'} hours
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                    Requested
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ECEFF3' }}>
                    {reviewData.timeline?.requestDetails?.timeElapsedSinceRequest || 'Just now'}
                  </Typography>
                </Box>
              </Box>

              {reviewData.timeline?.requestDetails?.reason && (
                <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, backgroundColor: '#0A0F1A', border: '1px solid #2A3547' }}>
                  <Typography variant="caption" sx={{ color: '#8791A3', display: 'block', mb: 0.5 }}>
                    Guest Cancellation Reason:
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ECEFF3', fontStyle: 'italic' }}>
                    "{reviewData.timeline.requestDetails.reason}"
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Authoritative Refund Policy Evaluation */}
            <Paper
              sx={{
                p: 2.5,
                border: '1px solid #C9A15A',
                backgroundColor: 'rgba(201, 161, 90, 0.04)',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#C9A15A', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DollarSign className="w-4 h-4" />
                  Authoritative Policy Evaluation
                </Typography>
                <Chip
                  size="small"
                  label={reviewData.refundPolicyEvaluation?.applicableTier || 'Evaluated'}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(201, 161, 90, 0.15)',
                    color: '#C9A15A',
                    border: '1px solid rgba(201, 161, 90, 0.3)',
                  }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, my: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                    Total Booking Cost
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
                    ${(reviewData.financials?.totalPrice || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                    Total Advance Paid
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#3ECF8E' }}>
                    ${(reviewData.financials?.totalPaid || 0).toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                    Authoritative Refund ({reviewData.refundPolicyEvaluation?.refundPercentage || 0}%)
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#3ECF8E' }}>
                    ${(reviewData.refundPolicyEvaluation?.estimatedRefundAmount || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="caption" sx={{ color: '#8791A3', display: 'block', mt: 1 }}>
                Rule: {reviewData.refundPolicyEvaluation?.policyExplanation}
              </Typography>
            </Paper>

            {/* Rejection Form Input */}
            {showRejectForm && (
              <Box sx={{ mt: 1, p: 2, borderRadius: 2, backgroundColor: '#0A0F1A', border: '1px solid #F2545B' }}>
                <Typography variant="subtitle2" sx={{ color: '#F2545B', fontWeight: 600, mb: 1 }}>
                  Mandatory Rejection Explanation
                </Typography>
                <TextField
                  placeholder="Explain why this cancellation request is being rejected (sent to guest)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  multiline
                  rows={2}
                  fullWidth
                  size="small"
                  required
                />
              </Box>
            )}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderColor: '#2A3547', justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={actionLoading} sx={{ color: '#8791A3' }}>
          Close
        </Button>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {!showRejectForm ? (
            <Button
              variant="outlined"
              onClick={() => setShowRejectForm(true)}
              disabled={loading || actionLoading}
              sx={{
                borderColor: '#F2545B',
                color: '#F2545B',
                '&:hover': { backgroundColor: 'rgba(242, 84, 91, 0.1)', borderColor: '#F2545B' },
              }}
            >
              Reject Request
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
              sx={{
                backgroundColor: '#F2545B',
                color: '#ECEFF3',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#D9444B' },
              }}
            >
              {actionLoading ? <CircularProgress size={18} sx={{ color: '#ECEFF3' }} /> : 'Confirm Rejection'}
            </Button>
          )}

          <Button
            variant="contained"
            onClick={handleApprove}
            disabled={loading || actionLoading}
            sx={{
              backgroundColor: '#3ECF8E',
              color: '#0A0F1A',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#34B77C' },
            }}
          >
            {actionLoading ? <CircularProgress size={18} sx={{ color: '#0A0F1A' }} /> : 'Approve & Issue Refund'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CancellationReviewDialog;
