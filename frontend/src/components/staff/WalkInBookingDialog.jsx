import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Radio,
  RadioGroup,
  MenuItem,
} from '@mui/material';
import {
  CalendarPlus,
  X,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  BedDouble,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  Download,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { deskService } from '../../services/desk.service';
import { bookingService } from '../../services/booking.service';

/**
 * ============================================================================
 * WALK-IN GUEST RESERVATION & LOBBY SETTLEMENT DIALOG
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh modal Front Desk Receptionists aur Super Admins ke liye banaya gaya hai:
 * 1. Physical Lobby Guest: Counter par physically aane walay walk-in guest ka naam,
 *    phone, aur ID document record karta hai.
 * 2. Real-Time Room Selector: Selected stay dates ke mutabiq available saaf (clean)
 *    rooms dikhata hai jin par koi overlap collision na ho.
 * 3. Instant Payment: Counter par Cash ya POS Card swipe receive karke foran ledger me record karta hai.
 * 4. Instant Check-In: Ek hi click par booking status 'checked-in' aur room 'occupied'
 *    kar deta hai taake guest ko foran keycard handover kiya ja sake.
 * 5. Instant Tax Invoice: Booking mukammal hote hi print/download karne ke liye PDF invoice provide karta hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Dedicated Flight-Ops Walk-In Booking modal. Enables front desk staff to seamlessly
 * onboard in-person walk-in guests, select clean available suites, record physical cash/card
 * settlement, and execute instant lobby check-in with zero friction.
 */
export const WalkInBookingDialog = ({ open, onClose, onSuccess }) => {
  // --------------------------------------------------------------------------
  // FORM & STEP STATES
  // --------------------------------------------------------------------------
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Step 1: Guest Personal Information
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestIdDoc, setGuestIdDoc] = useState('');

  // Step 2: Stay Dates & Suite Selection
  const [checkInDate, setCheckInDate] = useState(getTodayString());
  const [checkOutDate, setCheckOutDate] = useState(getTomorrowString());
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);

  // Step 3: Financial Settlement & Disposition
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'offline-card' | 'pay_later'
  const [instantCheckIn, setInstantCheckIn] = useState(true);
  const [specialRequests, setSpecialRequests] = useState('');

  // Workflow & Submission Lifecycle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // --------------------------------------------------------------------------
  // CALCULATIONS: TOTAL NIGHTS & STAY COST
  // --------------------------------------------------------------------------
  const totalNights = useMemo(() => {
    try {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 1;
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    } catch {
      return 1;
    }
  }, [checkInDate, checkOutDate]);

  // Selected rooms details and total bill
  const selectedRoomsList = useMemo(() => {
    return availableRooms.filter((r) => selectedRoomIds.includes(r._id));
  }, [availableRooms, selectedRoomIds]);

  const totalStayPrice = useMemo(() => {
    const sumNightly = selectedRoomsList.reduce((sum, r) => sum + (r.pricePerNight || 0), 0);
    return sumNightly * totalNights;
  }, [selectedRoomsList, totalNights]);

  // --------------------------------------------------------------------------
  // FETCH AVAILABLE CLEAN ROOMS FOR SELECTED DATE WINDOW
  // --------------------------------------------------------------------------
  const fetchAvailableRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      setFormError(null);
      const roomsData = await deskService.getRoomsAllotmentStatus({
        checkInDate,
        checkOutDate,
      });

      // Filter for clean rooms that can be allotted
      const validCleanRooms = (Array.isArray(roomsData) ? roomsData : []).filter(
        (r) => r.canAllot || (r.housekeepingStatus === 'clean' && !r.isOccupied && !r.isBooked)
      );

      setAvailableRooms(validCleanRooms);
      // Clean up selected rooms that are no longer available in this window
      setSelectedRoomIds((prev) =>
        prev.filter((id) => validCleanRooms.some((r) => r._id === id))
      );
    } catch (err) {
      console.error('Failed to load clean available rooms for walk-in:', err);
      setFormError('Failed to fetch real-time clean room inventory for chosen dates.');
    } finally {
      setLoadingRooms(false);
    }
  }, [checkInDate, checkOutDate]);

  useEffect(() => {
    if (open) {
      fetchAvailableRooms();
    }
  }, [open, fetchAvailableRooms]);

  // Reset modal state upon closing
  const handleDialogClose = () => {
    if (isSubmitting) return;
    setConfirmedBooking(null);
    setFormError(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
    setGuestIdDoc('');
    setSelectedRoomIds([]);
    setSpecialRequests('');
    onClose();
  };

  // Toggle room selection
  const handleToggleRoom = (roomId) => {
    setSelectedRoomIds((prev) => {
      if (prev.includes(roomId)) {
        return prev.filter((id) => id !== roomId);
      }
      return [...prev, roomId];
    });
  };

  // Filtered rooms display list
  const filteredRooms = useMemo(() => {
    if (categoryFilter === 'all') return availableRooms;
    return availableRooms.filter((r) => r.type?.toLowerCase() === categoryFilter.toLowerCase());
  }, [availableRooms, categoryFilter]);

  // --------------------------------------------------------------------------
  // SUBMISSION: CREATE WALK-IN RESERVATION
  // --------------------------------------------------------------------------
  const handleSubmitBooking = async (e) => {
    e?.preventDefault();
    setFormError(null);

    // Basic Validation
    if (!guestName.trim()) {
      setFormError('Please enter the walk-in guest full name.');
      return;
    }
    if (!guestPhone.trim()) {
      setFormError('Please enter a valid guest phone number.');
      return;
    }
    if (selectedRoomIds.length === 0) {
      setFormError('Please select at least one clean room for this reservation.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
        guestIdDocument: guestIdDoc.trim() || undefined,
        roomIds: selectedRoomIds,
        checkInDate,
        checkOutDate,
        numberOfGuests: Number(numberOfGuests) || 1,
        paymentMethod,
        paymentAmount: totalStayPrice,
        instantCheckIn,
        specialRequests: specialRequests.trim() || undefined,
      };

      const res = await deskService.createWalkInBooking(payload);
      const created = res?.data || res;
      setConfirmedBooking(created);

      if (onSuccess) {
        onSuccess(created);
      }
    } catch (err) {
      console.error('Walk-in booking creation failed:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to confirm walk-in reservation. Please check room availability.';
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF Tax Invoice
  const handleDownloadInvoice = async () => {
    if (!confirmedBooking?._id) return;
    try {
      setIsDownloadingPdf(true);
      await bookingService.downloadInvoice(confirmedBooking._id);
    } catch (err) {
      console.error('Failed to download walk-in invoice PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          color: 'var(--text)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        },
      }}
    >
      {/* 1. DIALOG TITLE BAR */}
      <DialogTitle
        sx={{
          borderBottom: '1px solid var(--border)',
          py: 2,
          px: 3,
          backgroundColor: 'var(--surface)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 flex items-center justify-center text-[#3FD0C9] shrink-0">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                New Walk-In Guest Reservation
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                Front Desk Direct Lobby Check-In & In-Person Settlement
              </Typography>
            </div>
          </div>

          <IconButton
            onClick={handleDialogClose}
            size="small"
            sx={{
              color: 'var(--text-muted)',
              '&:hover': { color: 'var(--text)', backgroundColor: 'var(--surface-2)' },
            }}
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ p: 3, backgroundColor: 'var(--surface)' }} className="space-y-4">
        {/* Error Notification */}
        {formError && (
          <Alert severity="error" sx={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
            {formError}
          </Alert>
        )}

        {/* ================================================================== */}
        {/* SUCCESS CONFIRMATION SCREEN (When Booking Is Confirmed)            */}
        {/* ================================================================== */}
        {confirmedBooking ? (
          <div className="py-6 px-4 text-center space-y-5 animate-in fade-in-50 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-text">Walk-In Reservation Confirmed!</h2>
              <p className="text-xs text-text-muted mt-1">
                {confirmedBooking.status === 'checked-in'
                  ? 'Guest has been checked in and room keys are ready for handover.'
                  : 'Reservation confirmed and added to scheduled arrivals.'}
              </p>
            </div>

            {/* Booking Reference Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-2 border border-border">
              <span className="text-xs text-text-muted font-mono">Reference:</span>
              <span className="text-sm font-mono font-bold text-aqua tracking-wider">
                {confirmedBooking.bookingReference}
              </span>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              <div className="p-3 bg-surface-2 border border-border rounded-xl">
                <span className="text-[10px] uppercase font-mono text-text-muted block">Guest</span>
                <p className="text-xs font-bold text-text truncate mt-0.5">
                  {confirmedBooking.guestInfo?.fullName || confirmedBooking.userId?.name || 'Walk-in Guest'}
                </p>
              </div>

              <div className="p-3 bg-surface-2 border border-border rounded-xl">
                <span className="text-[10px] uppercase font-mono text-text-muted block">Stay Duration</span>
                <p className="text-xs font-bold text-text mt-0.5">
                  {totalNights} Night{totalNights > 1 ? 's' : ''}
                </p>
              </div>

              <div className="p-3 bg-surface-2 border border-border rounded-xl">
                <span className="text-[10px] uppercase font-mono text-text-muted block">Total Paid</span>
                <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                  ${confirmedBooking.paidAmount || confirmedBooking.totalPrice || 0}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-3">
              <Button
                variant="outlined"
                startIcon={isDownloadingPdf ? <CircularProgress size={16} /> : <Download className="w-4 h-4" />}
                onClick={handleDownloadInvoice}
                disabled={isDownloadingPdf}
                sx={{
                  color: 'var(--text)',
                  borderColor: 'var(--border)',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                  px: 2.5,
                  '&:hover': { borderColor: '#3FD0C9', backgroundColor: 'var(--surface-2)' },
                }}
              >
                Download PDF Invoice
              </Button>

              <Button
                variant="contained"
                onClick={handleDialogClose}
                sx={{
                  backgroundColor: '#3FD0C9',
                  color: '#0A0F1A',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  px: 3,
                  '&:hover': { backgroundColor: '#32B3AD' },
                }}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* WALK-IN REGISTRATION FORM                                        */
          /* ================================================================ */
          <form onSubmit={handleSubmitBooking} className="space-y-4">
            {/* STEP 1: GUEST IDENTIFICATION */}
            <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <User className="w-4 h-4 text-aqua" />
                <span className="text-xs font-bold text-text uppercase tracking-wider">
                  Step 1: Walk-In Guest Identity
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Full Legal Name *
                  </label>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="e.g. John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1 } }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Contact Phone Number *
                  </label>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="e.g. +1 555 123 4567"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1 } }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Email Address (Optional, for E-Receipt)
                  </label>
                  <TextField
                    type="email"
                    size="small"
                    fullWidth
                    placeholder="guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1 } }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Passport / National ID # (Front Desk Record)
                  </label>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="e.g. A12345678"
                    value={guestIdDoc}
                    onChange={(e) => setGuestIdDoc(e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1 } }}
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: STAY DATES & SUITE SELECTION */}
            <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-aqua" />
                  <span className="text-xs font-bold text-text uppercase tracking-wider">
                    Step 2: Dates & Clean Room Selection
                  </span>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border text-aqua">
                  {totalNights} Night{totalNights > 1 ? 's' : ''} Stay
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Check-In Date
                  </label>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1 } }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Check-Out Date
                  </label>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1 } }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">
                    Number of Guests
                  </label>
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    inputProps={{ min: 1, max: 10 }}
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1 } }}
                  />
                </div>
              </div>

              {/* Room Category Filter & Inventory Grid */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text">
                    Available Clean Suites ({filteredRooms.length})
                  </span>
                  <TextField
                    select
                    size="small"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    sx={{ width: 140, '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5 } }}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="single">Single</MenuItem>
                    <MenuItem value="double">Double</MenuItem>
                    <MenuItem value="deluxe">Deluxe</MenuItem>
                    <MenuItem value="suite">Suite</MenuItem>
                    <MenuItem value="presidential">Presidential</MenuItem>
                  </TextField>
                </div>

                {loadingRooms ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-text-muted text-xs">
                    <CircularProgress size={16} sx={{ color: '#3FD0C9' }} />
                    <span>Checking live room cleanliness & availability...</span>
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="py-4 text-center rounded-lg bg-surface border border-border text-xs text-text-muted">
                    No clean, unoccupied rooms available for this date window.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {filteredRooms.map((room) => {
                      const isSelected = selectedRoomIds.includes(room._id);
                      return (
                        <div
                          key={room._id}
                          onClick={() => handleToggleRoom(room._id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-aqua/10 border-aqua text-text shadow-sm'
                              : 'bg-surface border-border hover:border-border-hover text-text-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs font-mono text-text">
                              Suite #{room.roomNumber}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-2 border border-border text-aqua font-semibold">
                              {room.type}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50 text-[11px]">
                            <span className="text-emerald-400 font-bold font-mono">
                              ${room.pricePerNight}/night
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                              <Sparkles className="w-3 h-3" />
                              <span>Clean</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3: FINANCIAL SETTLEMENT & LOBBY DISPOSITION */}
            <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-text uppercase tracking-wider">
                    Step 3: Lobby Payment & Instant Check-In
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-muted block font-mono">Total Stay Cost</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    ${totalStayPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                  Payment Collection Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-surface border-border text-text-muted hover:text-text'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span className="text-xs">Cash at Desk</span>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('offline-card')}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                      paymentMethod === 'offline-card'
                        ? 'bg-aqua/10 border-aqua text-aqua font-bold'
                        : 'bg-surface border-border text-text-muted hover:text-text'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs">POS Card Slip</span>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('pay_later')}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                      paymentMethod === 'pay_later'
                        ? 'bg-gold/10 border-gold text-gold font-bold'
                        : 'bg-surface border-border text-text-muted hover:text-text'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Pay at Checkout</span>
                  </div>
                </div>
              </div>

              {/* Instant Check-In Toggle */}
              <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text block">
                    Immediate Guest Check-In & Keycard Handover
                  </span>
                  <span className="text-[11px] text-text-muted block">
                    Immediately allots physical suite #{selectedRoomsList.map((r) => r.roomNumber).join(', ') || '...'} and marks room status occupied.
                  </span>
                </div>
                <Switch
                  checked={instantCheckIn}
                  onChange={(e) => setInstantCheckIn(e.target.checked)}
                  color="primary"
                />
              </div>

              {/* Special Requests Notes */}
              <div>
                <label className="text-[11px] font-semibold text-text-muted block mb-1">
                  Front Desk Notes / Special Requests (Optional)
                </label>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="e.g. Extra pillows requested, late check-out allowed"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem', py: 1 } }}
                />
              </div>
            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div className="flex items-center justify-between pt-2">
              <Button
                onClick={handleDialogClose}
                disabled={isSubmitting}
                sx={{
                  color: 'var(--text-muted)',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  '&:hover': { color: 'var(--text)' },
                }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || selectedRoomIds.length === 0}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={16} sx={{ color: '#0A0F1A' }} />
                  ) : (
                    <Check className="w-4 h-4" />
                  )
                }
                sx={{
                  backgroundColor: '#3FD0C9',
                  color: '#0A0F1A',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  px: 3,
                  py: 1,
                  boxShadow: '0 4px 14px 0 rgba(63, 208, 201, 0.35)',
                  '&:hover': { backgroundColor: '#32B3AD' },
                  '&:disabled': { backgroundColor: 'var(--border)', color: 'var(--text-muted)' },
                }}
              >
                {isSubmitting
                  ? 'Confirming Walk-In...'
                  : instantCheckIn
                  ? `Confirm & Check In ($${totalStayPrice.toFixed(2)})`
                  : `Confirm Walk-In Booking ($${totalStayPrice.toFixed(2)})`}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalkInBookingDialog;
