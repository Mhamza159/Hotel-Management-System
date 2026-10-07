import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TablePagination,
} from '@mui/material';
import { Clock, RefreshCw, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { deskService } from '../../services/desk.service';
import { CancellationReviewDialog } from '../../components/staff/CancellationReviewDialog';

/**
 * Front Desk Cancellations Review Queue Page
 * Route: /desk/cancellations
 */
export const DeskCancellationsPage = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, limit: 10, total: 0 });
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [alertInfo, setAlertInfo] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deskService.getCancellationRequests({
        page: pagination.page + 1,
        limit: pagination.limit,
      });

      setRequests(res?.bookings || res?.requests || []);
      setPagination((prev) => ({
        ...prev,
        total: res?.pagination?.total || 0,
      }));
    } catch (err) {
      console.error('Failed to load cancellation requests:', err);
      setAlertInfo({
        severity: 'error',
        message: err?.response?.data?.message || 'Failed to retrieve cancellation queue.',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Page Header Strip */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ECEFF3' }}>
            Cancellation Audit Queue
          </Typography>
          <Typography variant="caption" sx={{ color: '#8791A3' }}>
            Pending guest cancellation requests requiring authoritative tier calculation and refund audit
          </Typography>
        </div>

        <Tooltip title="Refresh Queue">
          <IconButton
            onClick={fetchRequests}
            disabled={loading}
            sx={{ color: '#8791A3', border: '1px solid #2A3547', borderRadius: 1.5 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Alert Banner */}
      {alertInfo && (
        <Alert
          severity={alertInfo.severity}
          onClose={() => setAlertInfo(null)}
          sx={{ borderRadius: 2 }}
        >
          {alertInfo.message}
        </Alert>
      )}

      {/* Main Table Card */}
      <Paper sx={{ border: '1px solid #2A3547', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 650 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Booking Ref</TableCell>
                <TableCell>Guest</TableCell>
                <TableCell>Requested At</TableCell>
                <TableCell>Check-In Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Audit & Decision</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#3FD0C9', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#8791A3' }}>
                      Loading cancellation audit requests...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <CheckCircle2 className="w-8 h-8 text-[#3ECF8E]" />
                      <Typography variant="body2" sx={{ color: '#ECEFF3', fontWeight: 600 }}>
                        Audit Queue Clear
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8791A3' }}>
                        There are no pending cancellation requests waiting for review.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((booking) => {
                  const reqDetails = booking.cancellationRequest || {};
                  const guestName = booking.guestInfo?.fullName || booking.userId?.name || 'Guest';

                  return (
                    <TableRow key={booking._id} hover>
                      {/* Booking Reference */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#3FD0C9' }}>
                          {booking.bookingReference}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                          ${(booking.totalAmount || booking.totalPrice || 0).toFixed(2)}
                        </Typography>
                      </TableCell>

                      {/* Guest */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#ECEFF3' }}>
                          {guestName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                          {booking.userId?.phone || booking.guestInfo?.phone || booking.userId?.email}
                        </Typography>
                      </TableCell>

                      {/* Requested At */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#ECEFF3' }}>
                          {reqDetails.requestedAt
                            ? new Date(reqDetails.requestedAt).toLocaleDateString()
                            : 'Recent'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                          {reqDetails.requestedAt
                            ? new Date(reqDetails.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </Typography>
                      </TableCell>

                      {/* Check-In Date */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#ECEFF3' }}>
                          {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>

                      {/* Reason */}
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#ECEFF3',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          "{reqDetails.reason || 'No specific reason provided'}"
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip
                          size="small"
                          label="Pending Audit"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: 'rgba(232, 163, 61, 0.15)',
                            color: '#E8A33D',
                            border: '1px solid rgba(232, 163, 61, 0.3)',
                          }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => setSelectedBookingId(booking._id)}
                          sx={{
                            height: 28,
                            px: 1.5,
                            fontSize: '0.72rem',
                            backgroundColor: '#3FD0C9',
                            color: '#0A0F1A',
                            fontWeight: 700,
                            '&:hover': { backgroundColor: '#2DB9B2' },
                          }}
                        >
                          Audit & Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Bar */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={pagination.total}
          rowsPerPage={pagination.limit}
          page={pagination.page}
          onPageChange={(_e, newPage) => setPagination((prev) => ({ ...prev, page: newPage }))}
          onRowsPerPageChange={(e) =>
            setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value, 10), page: 0 }))
          }
          sx={{
            borderTop: '1px solid #2A3547',
            color: '#8791A3',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.75rem',
            },
          }}
        />
      </Paper>

      {/* Review Dialog */}
      {selectedBookingId && (
        <CancellationReviewDialog
          open={Boolean(selectedBookingId)}
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onSuccess={() => {
            setAlertInfo({
              severity: 'success',
              message: 'Cancellation decision recorded and inventory status updated.',
            });
            fetchRequests();
          }}
        />
      )}
    </Box>
  );
};

export default DeskCancellationsPage;
