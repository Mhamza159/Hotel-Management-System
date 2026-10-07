import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
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
  LogIn,
  LogOut,
  DollarSign,
  FileDown,
  RefreshCw,
  Search,
  UserCheck,
  Key,
  Lock,
  CheckCircle,
  CalendarPlus,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ROLES, PERMISSIONS } from '../../config/constants';
import { deskService } from '../../services/desk.service';
import { bookingService } from '../../services/booking.service';
import { RecordPaymentDialog } from '../../components/staff/RecordPaymentDialog';
import { AllotRoomDialog } from '../../components/staff/AllotRoomDialog';
import { CheckOutDialog } from '../../components/staff/CheckOutDialog';
import { WalkInBookingDialog } from '../../components/staff/WalkInBookingDialog';

/**
 * Front Desk Flight-Ops Operations Console
 * Displays Arrivals, Departures, and In-House guests with live check-in, check-out, and POS settlement.
 */
export const DeskDashboardPage = () => {
  const [activeTab, setActiveTab] = useState(0); // 0: arrivals, 1: departures, 2: in-house
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, limit: 10, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Operational Counter Metrics
  const [metrics, setMetrics] = useState({
    arrivalsCount: 0,
    departuresCount: 0,
    inHouseCount: 0,
  });

  // Directive Alert & Notification
  const [alertInfo, setAlertInfo] = useState(null);

  // Record Payment Modal State
  const [paymentModalState, setPaymentModalState] = useState({
    open: false,
    booking: null,
  });

  // Allot Room & Check-In Modal State
  const [allotModalState, setAllotModalState] = useState({
    open: false,
    booking: null,
  });

  // Check-Out & Room Dirty Status Transition Modal State
  const [checkOutModalState, setCheckOutModalState] = useState({
    open: false,
    booking: null,
  });

  // Walk-In Guest Reservation Modal State
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);

  // PBAC Permission Authorities
  const { user } = useAuthStore();
  const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const canCreateBooking = isSuperAdmin || userPerms.includes(PERMISSIONS.BOOKINGS_CREATE);
  const canCheckIn = isSuperAdmin || userPerms.includes(PERMISSIONS.CHECKIN_MANAGE);
  const canCheckOut = isSuperAdmin || userPerms.includes(PERMISSIONS.CHECKOUT_MANAGE);
  const canRecordPayment =
    isSuperAdmin ||
    userPerms.includes(PERMISSIONS.PAYMENTS_RECORD_CASH) ||
    userPerms.includes(PERMISSIONS.PAYMENTS_RECORD_CARD);

  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);

  const tabTypes = useMemo(() => ['arrivals', 'departures', 'in-house'], []);
  const currentType = tabTypes[activeTab];

  // Fetch summary counters for the top flight-ops metric bar
  const fetchMetrics = useCallback(async () => {
    try {
      const [arrRes, depRes, inhRes] = await Promise.all([
        deskService.getOverview({ type: 'arrivals', date: selectedDate, limit: 1 }),
        deskService.getOverview({ type: 'departures', date: selectedDate, limit: 1 }),
        deskService.getOverview({ type: 'in-house', limit: 1 }),
      ]);
      setMetrics({
        arrivalsCount: arrRes?.pagination?.total || 0,
        departuresCount: depRes?.pagination?.total || 0,
        inHouseCount: inhRes?.pagination?.total || 0,
      });
    } catch (err) {
      console.error('Failed to load operational metrics:', err);
    }
  }, [selectedDate]);

  // Fetch main table bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        type: currentType,
        page: pagination.page + 1,
        limit: pagination.limit,
      };

      if (currentType !== 'in-house' && selectedDate) {
        params.date = selectedDate;
      }

      const res = await deskService.getOverview(params);
      setBookings(res?.bookings || []);
      setPagination((prev) => ({
        ...prev,
        total: res?.pagination?.total || 0,
      }));
    } catch (err) {
      console.error('Failed to fetch desk bookings:', err);
      setAlertInfo({
        severity: 'error',
        message: err?.response?.data?.message || 'Failed to load front desk bookings.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentType, selectedDate, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchMetrics();
    fetchBookings();
  }, [fetchMetrics, fetchBookings]);

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
    setPagination((prev) => ({ ...prev, page: 0 }));
    setAlertInfo(null);
  };

  // Check In & Room Allotment Handlers
  const handleOpenAllotment = (booking) => {
    setAlertInfo(null);
    setAllotModalState({
      open: true,
      booking,
    });
  };

  const handleDirectCheckIn = async (booking) => {
    try {
      setActionLoadingId(booking._id);
      setAlertInfo(null);
      await deskService.checkIn(booking._id);
      setAlertInfo({
        severity: 'success',
        message: `Guest successfully checked in and keys issued! Room is now marked occupied.`,
      });
      fetchBookings();
      fetchMetrics();
    } catch (err) {
      console.error('Direct check-in error:', err);
      setAlertInfo({
        severity: 'error',
        message: err?.response?.data?.message || 'Check-in validation failed.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAllotSuccess = (message) => {
    setAlertInfo({
      severity: 'success',
      message: message || 'Rooms successfully allotted! Please collect payment before checking in.',
    });
    fetchBookings();
    fetchMetrics();
  };

  // Check Out Handler - Opens dedicated room dirty & vacancy alert modal
  const handleCheckOut = (booking) => {
    setAlertInfo(null);
    setCheckOutModalState({
      open: true,
      booking,
    });
  };

  // Download Invoice Handler
  const handleDownloadInvoice = async (booking) => {
    try {
      setDownloadingInvoiceId(booking._id);
      await bookingService.downloadInvoice(booking._id, booking.bookingReference);
    } catch (err) {
      console.error('Failed to download invoice:', err);
      setAlertInfo({
        severity: 'error',
        message: 'Unable to stream tax invoice PDF.',
      });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  // Filtered rows for fast in-memory search
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter((b) => {
      const ref = (b.bookingReference || '').toLowerCase();
      const guest = (b.guestInfo?.fullName || b.userId?.name || '').toLowerCase();
      const phone = (b.guestInfo?.phone || b.userId?.phone || '').toLowerCase();
      const roomNumbers = (b.rooms || [])
        .map((r) => r.roomId?.roomNumber || '')
        .join(' ')
        .toLowerCase();
      return ref.includes(q) || guest.includes(q) || phone.includes(q) || roomNumbers.includes(q);
    });
  }, [bookings, searchQuery]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Top Operational Metrics Cockpit - Harborlight Style */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {/* Metric 1: Arrivals */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            border: activeTab === 0 ? '2px solid #143D2B' : '1px solid #E3EAE5',
            borderRadius: 2.5,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            '&:hover': { borderColor: '#143D2B' },
          }}
          className="dark:bg-[#14241C] dark:border-[#264334]"
          onClick={() => setActiveTab(0)}
        >
          <Box>
            <Typography variant="caption" sx={{ color: '#7C8B84', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Arrivals Scheduled
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#143D2B', mt: 0.5 }} className="dark:text-[#3ECF8E]">
              {metrics.arrivalsCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7C8B84' }}>
              For {selectedDate}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: 'rgba(20, 61, 43, 0.08)',
              color: '#143D2B',
            }}
            className="dark:bg-emerald-950/40 dark:text-[#3ECF8E]"
          >
            <LogIn className="w-6 h-6" />
          </Box>
        </Paper>

        {/* Metric 2: Departures */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            border: activeTab === 1 ? '2px solid #C19A5B' : '1px solid #E3EAE5',
            borderRadius: 2.5,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            '&:hover': { borderColor: '#C19A5B' },
          }}
          className="dark:bg-[#14241C] dark:border-[#264334]"
          onClick={() => setActiveTab(1)}
        >
          <Box>
            <Typography variant="caption" sx={{ color: '#7C8B84', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Departures Due
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#C19A5B', mt: 0.5 }}>
              {metrics.departuresCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7C8B84' }}>
              For {selectedDate}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: 'rgba(193, 154, 91, 0.12)',
              color: '#C19A5B',
            }}
          >
            <LogOut className="w-6 h-6" />
          </Box>
        </Paper>

        {/* Metric 3: In-House */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            border: activeTab === 2 ? '2px solid #1B7A4E' : '1px solid #E3EAE5',
            borderRadius: 2.5,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            '&:hover': { borderColor: '#1B7A4E' },
          }}
          className="dark:bg-[#14241C] dark:border-[#264334]"
          onClick={() => setActiveTab(2)}
        >
          <Box>
            <Typography variant="caption" sx={{ color: '#7C8B84', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Currently In-House
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1B7A4E', mt: 0.5 }}>
              {metrics.inHouseCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7C8B84' }}>
              Active Occupied Rooms
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: 'rgba(27, 122, 78, 0.1)',
              color: '#1B7A4E',
            }}
          >
            <UserCheck className="w-6 h-6" />
          </Box>
        </Paper>
      </Box>

      {/* Directive Alert Banner */}
      {alertInfo && (
        <Alert
          severity={alertInfo.severity}
          onClose={() => setAlertInfo(null)}
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor:
              alertInfo.severity === 'error'
                ? '#F2545B'
                : alertInfo.severity === 'warning'
                ? '#E8A33D'
                : '#3ECF8E',
          }}
        >
          {alertInfo.message}
        </Alert>
      )}

      {/* Main Operations Card */}
      <Paper sx={{ border: '1px solid #2A3547', borderRadius: 2, overflow: 'hidden' }}>
        {/* Navigation Tabs & Controls Toolbar */}
        <Box
          sx={{
            borderBottom: '1px solid #2A3547',
            px: 2,
            pt: 1,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 2,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: '#3FD0C9', height: 3 } }}
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                minWidth: 120,
                color: '#8791A3',
                '&.Mui-selected': { color: '#3FD0C9' },
              },
            }}
          >
            <Tab label={`Arrivals (${metrics.arrivalsCount})`} />
            <Tab label={`Departures (${metrics.departuresCount})`} />
            <Tab label={`Currently In-House (${metrics.inHouseCount})`} />
          </Tabs>

          {/* Action Toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: { xs: 2, md: 0 } }}>
            {activeTab !== 2 && (
              <TextField
                type="date"
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                sx={{
                  width: 160,
                  '& .MuiInputBase-input': { fontSize: '0.8rem', color: '#ECEFF3', py: 0.75 },
                }}
              />
            )}

            <TextField
              size="small"
              placeholder="Search reference, guest, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="w-4 h-4 text-[#8791A3]" />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: { xs: '100%', sm: 240 },
                '& .MuiInputBase-input': { fontSize: '0.8rem', color: '#ECEFF3', py: 0.75 },
              }}
            />

            <Tooltip title="Refresh Feed">
              <IconButton
                onClick={() => {
                  fetchMetrics();
                  fetchBookings();
                }}
                disabled={loading}
                sx={{ color: '#8791A3', border: '1px solid #2A3547', borderRadius: 1.5 }}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </IconButton>
            </Tooltip>

            {/* Walk-In Booking Action Button (PBAC Gated) */}
            {canCreateBooking && (
              <Button
                variant="contained"
                size="small"
                startIcon={<CalendarPlus className="w-3.5 h-3.5" />}
                onClick={() => setWalkInModalOpen(true)}
                sx={{
                  backgroundColor: '#3FD0C9',
                  color: '#0A0F1A',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  px: 2,
                  py: 0.75,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 10px rgba(63, 208, 201, 0.25)',
                  '&:hover': { backgroundColor: '#32B3AD' },
                }}
              >
                + Walk-In Guest
              </Button>
            )}
          </Box>
        </Box>

        {/* Flight-Ops Data Table */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Booking Ref</TableCell>
                <TableCell>Guest</TableCell>
                <TableCell>Assigned Room</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Settlement</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#3FD0C9', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#8791A3' }}>
                      Retrieving flight-ops bookings...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" sx={{ color: '#8791A3' }}>
                      No {currentType} bookings found for the selected criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((b) => {
                  const guestName = b.guestInfo?.fullName || b.userId?.name || 'Walk-in Guest';
                  const guestPhone = b.guestInfo?.phone || b.userId?.phone || '';
                  const total = b.totalPrice ?? b.totalAmount ?? 0;
                  const paid = b.paidAmount ?? 0;
                  const balance = Math.max(0, total - paid);
                  const isSettled = (total > 0 && balance === 0) || b.paymentStatus === 'completed' || b.paymentStatus === 'paid';

                  return (
                    <TableRow key={b._id} hover>
                      {/* Booking Ref */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#3FD0C9' }}>
                          {b.bookingReference}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                          {b.paymentMethod?.replace('_', ' ')}
                        </Typography>
                      </TableCell>

                      {/* Guest Info */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#ECEFF3' }}>
                          {guestName}
                        </Typography>
                        {guestPhone && (
                          <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                            {guestPhone}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Assigned Room & Cleanliness */}
                      <TableCell>
                        {b.rooms && b.rooms.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {b.rooms.map((rm, idx) => {
                              const roomObj = rm.roomId || {};
                              const roomNum = roomObj.roomNumber || rm.roomNumber || `Room ${idx + 1}`;
                              const cleanStatus = roomObj.housekeepingStatus || 'clean';
                              const isAllocated = !!rm.isAllocated;

                              const isClean = cleanStatus === 'clean';
                              const isDirty = cleanStatus === 'dirty';

                              return (
                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
                                    #{roomNum}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={cleanStatus}
                                    sx={{
                                      height: 18,
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                      backgroundColor: isClean
                                        ? 'rgba(62, 207, 142, 0.15)'
                                        : isDirty
                                        ? 'rgba(242, 84, 91, 0.15)'
                                        : 'rgba(232, 163, 61, 0.15)',
                                      color: isClean ? '#3ECF8E' : isDirty ? '#F2545B' : '#E8A33D',
                                      border: `1px solid ${
                                        isClean
                                          ? 'rgba(62, 207, 142, 0.3)'
                                          : isDirty
                                          ? 'rgba(242, 84, 91, 0.3)'
                                          : 'rgba(232, 163, 61, 0.3)'
                                      }`,
                                    }}
                                  />
                                  {!isAllocated && (
                                    <Chip
                                      size="small"
                                      label="Not Allotted"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        backgroundColor: 'rgba(201, 161, 90, 0.15)',
                                        color: '#C9A15A',
                                        border: '1px solid rgba(201, 161, 90, 0.3)',
                                      }}
                                    />
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        ) : (
                          <Chip
                            size="small"
                            label="Unassigned"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              backgroundColor: 'rgba(135, 145, 163, 0.15)',
                              color: '#8791A3',
                              border: '1px solid #2A3547',
                            }}
                          />
                        )}
                      </TableCell>

                      {/* Dates */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#ECEFF3', whiteSpace: 'nowrap' }}>
                          {b.checkInDate ? new Date(b.checkInDate).toLocaleDateString() : 'N/A'} &rarr;
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#8791A3', whiteSpace: 'nowrap', display: 'block' }}>
                          {b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>

                      {/* Settlement / Financials */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
                            ${total.toFixed(2)}
                          </Typography>
                          {!isSettled && (
                            <Typography variant="caption" sx={{ color: '#C9A15A', fontWeight: 600 }}>
                              (Bal: ${balance.toFixed(2)})
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          size="small"
                          label={isSettled ? 'Paid' : balance < total ? 'Partial' : 'Unpaid'}
                          sx={{
                            mt: 0.5,
                            height: 18,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            backgroundColor: isSettled
                              ? 'rgba(62, 207, 142, 0.15)'
                              : 'rgba(232, 163, 61, 0.15)',
                            color: isSettled ? '#3ECF8E' : '#E8A33D',
                            border: `1px solid ${
                              isSettled ? 'rgba(62, 207, 142, 0.3)' : 'rgba(232, 163, 61, 0.3)'
                            }`,
                          }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip
                          size="small"
                          label={b.status}
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            backgroundColor:
                              b.status === 'checked-in'
                                ? 'rgba(63, 208, 201, 0.15)'
                                : b.status === 'confirmed'
                                ? 'rgba(62, 207, 142, 0.15)'
                                : b.status === 'checked-out'
                                ? 'rgba(135, 145, 163, 0.15)'
                                : 'rgba(242, 84, 91, 0.15)',
                            color:
                              b.status === 'checked-in'
                                ? '#3FD0C9'
                                : b.status === 'confirmed'
                                ? '#3ECF8E'
                                : b.status === 'checked-out'
                                ? '#8791A3'
                                : '#F2545B',
                            border: '1px solid #2A3547',
                          }}
                        />
                      </TableCell>

                      {/* Quick Operations Action Buttons */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                          {/* ========================================================= */}
                          {/* ARRIVALS ACTIONS (status === 'confirmed' or 'pending') */}
                          {/* ========================================================= */}
                          {(b.status === 'confirmed' || b.status === 'pending') && (() => {
                            const isAllocated =
                              b.rooms &&
                              b.rooms.length > 0 &&
                              b.rooms.every((r) => r.isAllocated && r.roomId?._id);
                            const hasPaidAny = (b.paidAmount || 0) > 0;

                            if (!isAllocated) {
                              if (!canCheckIn) return null;
                              // GATE 1: Needs Physical Room Allotment
                              return (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleOpenAllotment(b)}
                                  startIcon={<Key className="w-3.5 h-3.5" />}
                                  sx={{
                                    height: 28,
                                    px: 1.5,
                                    fontSize: '0.72rem',
                                    backgroundColor: '#C9A15A',
                                    color: '#0A0F1A',
                                    fontWeight: 700,
                                    '&:hover': { backgroundColor: '#B88E45' },
                                  }}
                                >
                                  Allot Rooms
                                </Button>
                              );
                            }

                            if (!hasPaidAny) {
                              // GATE 2: Rooms Allocated, but $0 Payment Recorded -> Check-In Locked
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  {canCheckIn && (
                                    <Tooltip title="Change or re-allot room assignment">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleOpenAllotment(b)}
                                        startIcon={<Key className="w-3.5 h-3.5" />}
                                        sx={{
                                          height: 28,
                                          px: 1,
                                          fontSize: '0.72rem',
                                          borderColor: '#C9A15A',
                                          color: '#C9A15A',
                                          fontWeight: 600,
                                          '&:hover': {
                                            borderColor: '#B88E45',
                                            backgroundColor: 'rgba(201, 161, 90, 0.08)',
                                          },
                                        }}
                                      >
                                        Re-Allot
                                      </Button>
                                    </Tooltip>
                                  )}

                                  {canCheckIn && (
                                    <Tooltip title="Check-in locked: Must collect at least a partial deposit or full payment before issuing room keys">
                                      <span>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          disabled
                                          startIcon={<Lock className="w-3.5 h-3.5" />}
                                          sx={{
                                            height: 28,
                                            px: 1.25,
                                            fontSize: '0.72rem',
                                            borderColor: '#2A3547',
                                            color: '#8791A3',
                                            fontWeight: 600,
                                            '&.Mui-disabled': {
                                              borderColor: '#2A3547',
                                              color: '#8791A3',
                                            },
                                          }}
                                        >
                                          Check In
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}

                                  {canRecordPayment && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => setPaymentModalState({ open: true, booking: b })}
                                      startIcon={<DollarSign className="w-3.5 h-3.5" />}
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
                                      Collect Payment
                                    </Button>
                                  )}
                                </Box>
                              );
                            }

                            // GATE 3: Rooms Allocated & Payment Recorded (> 0) -> Check-In Unlocked
                            if (!canCheckIn) return null;
                            return (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleDirectCheckIn(b)}
                                disabled={actionLoadingId === b._id}
                                startIcon={
                                  actionLoadingId === b._id ? (
                                    <CircularProgress size={14} sx={{ color: '#0A0F1A' }} />
                                  ) : (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  )
                                }
                                sx={{
                                  height: 28,
                                  px: 1.5,
                                  fontSize: '0.72rem',
                                  backgroundColor: '#3ECF8E',
                                  color: '#0A0F1A',
                                  fontWeight: 700,
                                  '&:hover': { backgroundColor: '#34B77C' },
                                }}
                              >
                                {actionLoadingId === b._id ? 'Checking In...' : 'Check In & Issue Keys'}
                              </Button>
                            );
                          })()}

                          {/* ========================================================= */}
                          {/* DEPARTURES / IN-HOUSE ACTIONS (status === 'checked-in') */}
                          {/* ========================================================= */}
                          {b.status === 'checked-in' && (() => {
                            const remainingDues = Math.max(0, (b.totalPrice ?? b.totalAmount ?? 0) - (b.paidAmount || 0));

                            if (remainingDues > 0) {
                              // CHECK-OUT LOCKED: Guest has unpaid dues
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  {canCheckOut && (
                                    <Tooltip title={`Check-out locked: Guest has outstanding balance of $${remainingDues.toFixed(2)}. Settle remaining dues first.`}>
                                      <span>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          disabled
                                          startIcon={<Lock className="w-3.5 h-3.5" />}
                                          sx={{
                                            height: 28,
                                            px: 1.25,
                                            fontSize: '0.72rem',
                                            borderColor: '#2A3547',
                                            color: '#8791A3',
                                            fontWeight: 600,
                                            '&.Mui-disabled': {
                                              borderColor: '#2A3547',
                                              color: '#8791A3',
                                            },
                                          }}
                                        >
                                          Check Out
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}

                                  {canRecordPayment && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      onClick={() => setPaymentModalState({ open: true, booking: b })}
                                      startIcon={<DollarSign className="w-3.5 h-3.5" />}
                                      sx={{
                                        height: 28,
                                        px: 1.5,
                                        fontSize: '0.72rem',
                                        backgroundColor: '#E8A33D',
                                        color: '#0A0F1A',
                                        fontWeight: 700,
                                        '&:hover': { backgroundColor: '#D4922F' },
                                      }}
                                    >
                                      Settle ${remainingDues.toFixed(2)}
                                    </Button>
                                  )}
                                </Box>
                              );
                            }

                            // CHECK-OUT UNLOCKED: Fully settled ($0 remaining)
                            if (!canCheckOut) return null;
                            return (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleCheckOut(b)}
                                disabled={actionLoadingId === b._id}
                                startIcon={
                                  actionLoadingId === b._id ? (
                                    <CircularProgress size={14} sx={{ color: '#ECEFF3' }} />
                                  ) : (
                                    <LogOut className="w-3.5 h-3.5" />
                                  )
                                }
                                sx={{
                                  height: 28,
                                  px: 1.5,
                                  fontSize: '0.72rem',
                                  backgroundColor: '#F2545B',
                                  color: '#ECEFF3',
                                  fontWeight: 600,
                                  '&:hover': { backgroundColor: '#E04148' },
                                }}
                              >
                                {actionLoadingId === b._id ? 'Checking Out...' : 'Check Out'}
                              </Button>
                            );
                          })()}

                          {/* Quick Payment Icon for any booking with balance (e.g. checked-out or custom) */}
                          {balance > 0 && canRecordPayment && b.status !== 'confirmed' && b.status !== 'pending' && b.status !== 'checked-in' && (
                            <Tooltip title="Record In-Person Payment">
                              <IconButton
                                size="small"
                                onClick={() => setPaymentModalState({ open: true, booking: b })}
                                sx={{
                                  color: '#3ECF8E',
                                  border: '1px solid #2A3547',
                                  borderRadius: 1,
                                  width: 28,
                                  height: 28,
                                }}
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* PDF Tax Invoice / Folio Download */}
                          <Tooltip title="Print Official PDF Folio / Tax Invoice">
                            <span>
                              <IconButton
                                size="small"
                                disabled={downloadingInvoiceId === b._id}
                                onClick={() => handleDownloadInvoice(b)}
                                sx={{
                                  color: '#8791A3',
                                  border: '1px solid #2A3547',
                                  borderRadius: 1,
                                  width: 28,
                                  height: 28,
                                  '&:hover': { color: '#ECEFF3', borderColor: '#8791A3' },
                                }}
                              >
                                {downloadingInvoiceId === b._id ? (
                                  <CircularProgress size={13} sx={{ color: '#3FD0C9' }} />
                                ) : (
                                  <FileDown className="w-3.5 h-3.5" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
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
          rowsPerPageOptions={[5, 10, 25, 50]}
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

      {/* Record In-Person Payment Modal */}
      {paymentModalState.open && (
        <RecordPaymentDialog
          open={paymentModalState.open}
          booking={paymentModalState.booking}
          onClose={() => setPaymentModalState({ open: false, booking: null })}
          onSuccess={() => {
            setAlertInfo({
              severity: 'success',
              message: 'Payment settlement recorded successfully. Booking updated.',
            });
            fetchBookings();
            fetchMetrics();
          }}
        />
      )}

      {/* Allot Physical Room & Check-In Modal */}
      {allotModalState.open && (
        <AllotRoomDialog
          open={allotModalState.open}
          booking={allotModalState.booking}
          onClose={() => setAllotModalState({ open: false, booking: null })}
          onSuccess={handleAllotSuccess}
        />
      )}

      {/* Check-Out & Room Dirty Status Alert Modal */}
      {checkOutModalState.open && (
        <CheckOutDialog
          open={checkOutModalState.open}
          booking={checkOutModalState.booking}
          onClose={() => setCheckOutModalState({ open: false, booking: null })}
          onSuccess={(msg) => {
            setAlertInfo({
              severity: 'success',
              message: msg,
            });
            fetchBookings();
            fetchMetrics();
          }}
        />
      )}

      {/* Walk-In Guest Reservation Modal Dialog */}
      {walkInModalOpen && (
        <WalkInBookingDialog
          open={walkInModalOpen}
          onClose={() => setWalkInModalOpen(false)}
          onSuccess={() => {
            fetchBookings();
            fetchMetrics();
          }}
        />
      )}
    </Box>
  );
};

export default DeskDashboardPage;
