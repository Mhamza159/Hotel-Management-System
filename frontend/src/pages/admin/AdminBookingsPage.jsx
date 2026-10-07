import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
} from '@mui/material';
import {
  CalendarCheck,
  Search,
  Filter,
  Eye,
  FileDown,
  RefreshCw,
  Clock,
  BedDouble,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { bookingService } from '../../services/booking.service';
import { BookingDetailModal } from '../../components/admin/BookingDetailModal';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../../config/constants';

const STATUS_CHIP_COLORS = {
  confirmed: { bg: 'rgba(62, 207, 142, 0.1)', text: '#3ECF8E', border: 'rgba(62, 207, 142, 0.3)' },
  checked_in: { bg: 'rgba(63, 208, 201, 0.1)', text: '#3FD0C9', border: 'rgba(63, 208, 201, 0.3)' },
  checked_out: { bg: 'rgba(135, 145, 163, 0.1)', text: '#8791A3', border: 'rgba(135, 145, 163, 0.3)' },
  completed: { bg: 'rgba(135, 145, 163, 0.1)', text: '#8791A3', border: 'rgba(135, 145, 163, 0.3)' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.1)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
};

export const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Booking for Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(fromDate ? { fromDate } : {}),
        ...(toDate ? { toDate } : {}),
      };

      const res = await adminService.getAllBookings(params);
      setBookings(res.bookings || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setError(err?.message || 'Failed to fetch global bookings directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, rowsPerPage, status, paymentStatus, fromDate, toDate]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPaymentStatus('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchBookings();
  };

  const handleDownloadInvoice = async (booking) => {
    try {
      setDownloadingInvoiceId(booking._id);
      await bookingService.downloadInvoice(booking._id, booking.bookingReference);
    } catch (err) {
      console.error('Failed to download invoice:', err);
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      {/* Top Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 4,
          pb: 2,
          borderBottom: '1px solid #2A3547',
        }}
      >
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#ECEFF3' }}>
            Master Reservations Directory
          </Typography>
          <Typography variant="caption" sx={{ color: '#8791A3' }}>
            Global reservation audit, status management, and invoice generation
          </Typography>
        </div>

        <Button
          variant="outlined"
          size="small"
          onClick={fetchBookings}
          startIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          sx={{
            color: '#3FD0C9',
            borderColor: 'rgba(63, 208, 201, 0.3)',
            '&:hover': { borderColor: '#3FD0C9', backgroundColor: 'rgba(63, 208, 201, 0.1)' },
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Filter Controls Bar */}
      <Box
        component="form"
        onSubmit={handleSearchSubmit}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 4,
          p: 2.5,
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          borderRadius: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by Reference or Guest Name/Email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: '1 1 250px' }}
          InputProps={{
            startAdornment: <Search className="w-4 h-4 text-[#8791A3] mr-2" />,
          }}
        />

        <TextField
          select
          size="small"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          SelectProps={{ displayEmpty: true }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          {Object.values(BOOKING_STATUS).map((st) => (
            <MenuItem key={st} value={st} sx={{ textTransform: 'capitalize' }}>
              {st.replace('_', ' ')}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(0);
          }}
          SelectProps={{ displayEmpty: true }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All Payments</MenuItem>
          {Object.values(PAYMENT_STATUS).map((pst) => (
            <MenuItem key={pst} value={pst} sx={{ textTransform: 'capitalize' }}>
              {pst}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          type="date"
          size="small"
          label="From Date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 145 }}
        />

        <TextField
          type="date"
          size="small"
          label="To Date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(0);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 145 }}
        />

        <Button
          type="submit"
          variant="contained"
          size="small"
          sx={{
            backgroundColor: '#3FD0C9',
            color: '#0A0F1A',
            fontWeight: 700,
            '&:hover': { backgroundColor: '#34b3ad' },
          }}
        >
          Search
        </Button>

        {(search || status || paymentStatus || fromDate || toDate) && (
          <Button
            type="button"
            variant="outlined"
            size="small"
            onClick={handleResetFilters}
            sx={{
              color: '#8791A3',
              borderColor: '#2A3547',
              '&:hover': { borderColor: '#8791A3', color: '#ECEFF3' },
            }}
          >
            Reset Filters
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
          {error}
        </Alert>
      )}

      {/* Bookings Table */}
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          borderRadius: 2,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { borderBottom: '1px solid #2A3547', color: '#8791A3', fontWeight: 600, py: 1.5 } }}>
              <TableCell>Reference</TableCell>
              <TableCell>Guest</TableCell>
              <TableCell>Stay Dates</TableCell>
              <TableCell>Suites</TableCell>
              <TableCell>Total ($)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: '#3FD0C9' }} />
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8, color: '#8791A3' }}>
                  No reservations found matching the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => {
                const statusStyle = STATUS_CHIP_COLORS[booking.status] || STATUS_CHIP_COLORS.confirmed;
                return (
                  <TableRow
                    key={booking._id}
                    hover
                    sx={{
                      '& td': { borderBottom: '1px solid #2A3547', color: '#ECEFF3', py: 1.5 },
                      '&:hover': { backgroundColor: '#1B2433' },
                    }}
                  >
                    <TableCell>
                      <span className="font-mono font-bold text-[#3FD0C9]">
                        #{booking.bookingReference}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className="text-xs font-semibold text-[#ECEFF3]">{booking.userId?.name || 'Guest'}</p>
                        <span className="text-[10px] text-[#8791A3] block">{booking.userId?.email}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs">
                        <span>
                          {new Date(booking.checkInDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {' - '}
                          {new Date(booking.checkOutDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <BedDouble className="w-3.5 h-3.5 text-[#8791A3]" />
                        <span>
                          {booking.rooms?.map((r) => r.roomId?.roomNumber || 'Room').join(', ')}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono font-bold text-[#C9A15A]">
                        ${(booking.totalPrice ?? booking.totalAmount ?? 0).toFixed(2)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={booking.status?.replace('_', ' ')}
                        size="small"
                        sx={{
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1px solid ${statusStyle.border}`,
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          height: 20,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-mono capitalize text-[#8791A3]">
                        {booking.paymentStatus}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          size="small"
                          onClick={() => setSelectedBooking(booking)}
                          title="View Details"
                          sx={{ color: '#3FD0C9', '&:hover': { backgroundColor: 'rgba(63, 208, 201, 0.1)' } }}
                        >
                          <Eye className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          size="small"
                          disabled={downloadingInvoiceId === booking._id}
                          onClick={() => handleDownloadInvoice(booking)}
                          title="Download Tax Invoice"
                          sx={{ color: '#8791A3', '&:hover': { color: '#ECEFF3', backgroundColor: '#2A3547' } }}
                        >
                          {downloadingInvoiceId === booking._id ? (
                            <CircularProgress size={14} sx={{ color: '#3FD0C9' }} />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </IconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{
            borderTop: '1px solid #2A3547',
            color: '#8791A3',
            '& .MuiTablePagination-select': { color: '#ECEFF3' },
            '& .MuiTablePagination-actions button': { color: '#ECEFF3' },
          }}
        />
      </TableContainer>

      {/* Reservation Inspector Modal */}
      <BookingDetailModal
        open={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
      />
    </Box>
  );
};

export default AdminBookingsPage;
