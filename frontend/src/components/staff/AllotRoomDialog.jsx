import React, { useState, useEffect, useMemo } from 'react';
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
  Radio,
  Chip,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import { Key, Sparkles, CheckCircle, BedDouble, AlertCircle, ArrowRight } from 'lucide-react';
import { deskService } from '../../services/desk.service';
import { roomService } from '../../services/room.service';

/**
 * Allot Room Dialog for Front Desk Receptionists
 * Supports single-room and multi-room reservations with dynamic pricing preview
 * and conflict prevention across room slots.
 */
export const AllotRoomDialog = ({ open, onClose, booking, onSuccess }) => {
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [slotAllocations, setSlotAllocations] = useState({}); // { [slotIndex]: roomId }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const roomsList = useMemo(() => booking?.rooms || [], [booking]);
  const numSlots = roomsList.length || 1;

  // Calculate stay nights
  const diffDays = useMemo(() => {
    if (!booking?.checkInDate || !booking?.checkOutDate) return 1;
    const cin = new Date(booking.checkInDate);
    const cout = new Date(booking.checkOutDate);
    return Math.max(1, Math.ceil(Math.abs(cout - cin) / (1000 * 60 * 60 * 24)));
  }, [booking]);

  useEffect(() => {
    if (!open || !booking) return;

    setError(null);
    setActiveSlot(0);
    setLoadingRooms(true);

    // Initial allocations map from booking.rooms
    const initialMap = {};
    roomsList.forEach((rm, idx) => {
      const roomObj = rm.roomId;
      if (roomObj?._id) {
        initialMap[idx] = roomObj._id;
      }
    });
    setSlotAllocations(initialMap);

    const checkIn = booking.checkInDate
      ? new Date(booking.checkInDate).toISOString().split('T')[0]
      : '';
    const checkOut = booking.checkOutDate
      ? new Date(booking.checkOutDate).toISOString().split('T')[0]
      : '';

    deskService
      .getRoomsAllotmentStatus({
        bookingId: booking._id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      })
      .then((res) => {
        let rooms = Array.isArray(res) ? res : res?.rooms || [];

        // Ensure currently pre-assigned rooms are included in list
        roomsList.forEach((rm) => {
          const preAssigned = rm.roomId;
          if (preAssigned?._id && !rooms.some((r) => r._id === preAssigned._id)) {
            rooms = [{ ...preAssigned, isAssignedToCurrentBooking: true }, ...rooms];
          }
        });

        setAvailableRooms(rooms);
      })
      .catch((err) => {
        console.error('Failed to fetch rooms for allotment with status:', err);
        // Fallback to roomService.getAvailableRooms
        roomService
          .getAvailableRooms({
            checkInDate: checkIn,
            checkOutDate: checkOut,
            excludeBookingId: booking._id,
          })
          .then((res) => {
            let rooms = Array.isArray(res) ? res : res?.rooms || [];
            roomsList.forEach((rm) => {
              const preAssigned = rm.roomId;
              if (preAssigned?._id && !rooms.some((r) => r._id === preAssigned._id)) {
                rooms = [preAssigned, ...rooms];
              }
            });
            setAvailableRooms(rooms);
          })
          .catch(() => {
            setError('Failed to fetch real-time rooms for allotment.');
          });
      })
      .finally(() => {
        setLoadingRooms(false);
      });
  }, [open, booking, roomsList]);

  // Selected room for active slot
  const currentSlotRoom = roomsList[activeSlot];
  const reservedType = currentSlotRoom?.roomType || currentSlotRoom?.roomId?.type || 'deluxe';

  const handleSelectRoomForSlot = (roomId) => {
    const room = availableRooms.find((r) => r._id === roomId);
    if (!room) return;

    if (!room.canAllot && !room.isAssignedToCurrentBooking) {
      if (room.isOccupied) {
        setError(`Room #${room.roomNumber} is currently occupied by an in-house guest (Ref: ${room.conflictRef || 'N/A'}) and cannot be allotted.`);
      } else if (room.isBooked) {
        setError(`Room #${room.roomNumber} is already booked for these dates (Ref: ${room.conflictRef || 'N/A'}) and cannot be allotted.`);
      } else if (room.housekeepingStatus !== 'clean') {
        setError(`Room #${room.roomNumber} is '${room.housekeepingStatus}'. Only clean rooms can be allotted.`);
      }
      return;
    }

    // Check if room is already allocated to another slot
    const existingSlot = Object.keys(slotAllocations).find(
      (s) => Number(s) !== activeSlot && slotAllocations[s] === roomId
    );

    if (existingSlot !== undefined) {
      setError(`Room #${room.roomNumber} is already selected for Room Slot #${Number(existingSlot) + 1}. Please choose another room.`);
      return;
    }

    setError(null);
    setSlotAllocations((prev) => ({
      ...prev,
      [activeSlot]: roomId,
    }));
  };

  // Dynamic price preview calculation
  const { proposedTotal, priceDifference } = useMemo(() => {
    const originalTotal = booking?.totalPrice ?? booking?.totalAmount ?? 0;
    if (!roomsList.length) return { proposedTotal: originalTotal, priceDifference: 0 };

    let total = 0;
    roomsList.forEach((rm, idx) => {
      const selectedId = slotAllocations[idx];
      const foundRoom = availableRooms.find((r) => r._id === selectedId);
      const rate = foundRoom?.pricePerNight ?? rm.pricePerNight ?? 100;
      total += rate * diffDays;
    });

    return {
      proposedTotal: total,
      priceDifference: total - originalTotal,
    };
  }, [booking, roomsList, slotAllocations, availableRooms, diffDays]);

  const allSlotsAssigned = useMemo(() => {
    return roomsList.every((_, idx) => Boolean(slotAllocations[idx]));
  }, [roomsList, slotAllocations]);

  const handleConfirmAllotment = async () => {
    if (!allSlotsAssigned) {
      setError('Please allocate a clean physical room for every room slot.');
      return;
    }

    // Verify all selected rooms are clean and not occupied or booked by another guest
    for (let i = 0; i < roomsList.length; i++) {
      const rId = slotAllocations[i];
      const room = availableRooms.find((r) => r._id === rId);
      if (room) {
        if (room.isOccupied) {
          setError(`Room #${room.roomNumber} in Slot #${i + 1} is currently occupied by an in-house guest (Ref: ${room.conflictRef || 'N/A'}).`);
          return;
        }
        if (room.isBooked && !room.isAssignedToCurrentBooking) {
          setError(`Room #${room.roomNumber} in Slot #${i + 1} is already booked for these dates (Ref: ${room.conflictRef || 'N/A'}).`);
          return;
        }
        if (room.housekeepingStatus !== 'clean') {
          setError(`Room #${room.roomNumber} in Slot #${i + 1} is '${room.housekeepingStatus}'. Only clean rooms can be allotted.`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const allocations = roomsList.map((_, idx) => ({
        slotIndex: idx,
        allocatedRoomId: slotAllocations[idx],
        pricingPolicy: 'recalculate',
      }));

      await deskService.allotRooms(booking._id, { allocations });

      if (onSuccess) {
        onSuccess(
          `Rooms successfully allotted! New Total: $${proposedTotal.toFixed(2)}. Please collect payment before checking in.`
        );
      }
      onClose();
    } catch (err) {
      console.error('Allotment error:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to allot rooms.');
    } finally {
      setSubmitting(false);
    }
  };

  const matchingRooms = availableRooms.filter(
    (r) => r.type?.toLowerCase() === reservedType?.toLowerCase()
  );
  const otherRooms = availableRooms.filter(
    (r) => r.type?.toLowerCase() !== reservedType?.toLowerCase()
  );

  const renderRoomCard = (room, isMatchingCategory = false) => {
    const isSelectedInThisSlot = slotAllocations[activeSlot] === room._id;
    const allocatedInOtherSlot = Object.keys(slotAllocations).find(
      (s) => Number(s) !== activeSlot && slotAllocations[s] === room._id
    );

    const isOccupied = room.isOccupied || room.statusBadge === 'occupied';
    const isBooked = (room.isBooked || room.statusBadge === 'booked') && !room.isAssignedToCurrentBooking;
    const isClean = room.housekeepingStatus === 'clean';
    const canSelect = !isOccupied && !isBooked && isClean && allocatedInOtherSlot === undefined;
    const isDisabled = !canSelect && !isSelectedInThisSlot;

    // Determine status badge
    let badgeColor = '#3ECF8E';
    let badgeBg = 'rgba(62, 207, 142, 0.15)';
    let badgeBorder = 'rgba(62, 207, 142, 0.3)';
    let badgeLabel = 'Clean & Ready';

    if (isOccupied) {
      badgeColor = '#F2545B';
      badgeBg = 'rgba(242, 84, 91, 0.15)';
      badgeBorder = 'rgba(242, 84, 91, 0.4)';
      badgeLabel = room.conflictRef ? `Occupied (${room.conflictRef})` : 'Occupied';
    } else if (isBooked) {
      badgeColor = '#E8A33D';
      badgeBg = 'rgba(232, 163, 61, 0.15)';
      badgeBorder = 'rgba(232, 163, 61, 0.4)';
      badgeLabel = room.conflictRef ? `Booked (${room.conflictRef})` : 'Booked';
    } else if (room.housekeepingStatus === 'dirty') {
      badgeColor = '#F2545B';
      badgeBg = 'rgba(242, 84, 91, 0.15)';
      badgeBorder = 'rgba(242, 84, 91, 0.3)';
      badgeLabel = 'Dirty (Needs Cleaning)';
    } else if (room.housekeepingStatus === 'cleaning') {
      badgeColor = '#3FD0C9';
      badgeBg = 'rgba(63, 208, 201, 0.15)';
      badgeBorder = 'rgba(63, 208, 201, 0.3)';
      badgeLabel = 'Cleaning in Progress';
    } else if (room.housekeepingStatus === 'maintenance') {
      badgeColor = '#8791A3';
      badgeBg = 'rgba(135, 145, 163, 0.15)';
      badgeBorder = 'rgba(135, 145, 163, 0.3)';
      badgeLabel = 'Under Maintenance';
    }

    const themeColor = isMatchingCategory ? '#C9A15A' : '#3FD0C9';

    return (
      <Box
        key={room._id}
        onClick={() => !isDisabled && handleSelectRoomForSlot(room._id)}
        sx={{
          p: 1.5,
          borderRadius: 2,
          border: isSelectedInThisSlot
            ? `2px solid ${themeColor}`
            : isOccupied || isBooked
            ? '1px dashed rgba(242, 84, 91, 0.4)'
            : '1px solid #2A3547',
          backgroundColor: isSelectedInThisSlot
            ? isMatchingCategory
              ? 'rgba(201, 161, 90, 0.08)'
              : 'rgba(63, 208, 201, 0.08)'
            : isOccupied
            ? 'rgba(242, 84, 91, 0.06)'
            : isBooked
            ? 'rgba(232, 163, 61, 0.06)'
            : isClean
            ? '#1B2433'
            : 'rgba(242, 84, 91, 0.03)',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s',
          '&:hover': !isDisabled ? { borderColor: themeColor } : {},
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Radio
            checked={isSelectedInThisSlot}
            disabled={isDisabled}
            onChange={() => handleSelectRoomForSlot(room._id)}
            sx={{
              p: 0,
              color: '#2A3547',
              '&.Mui-checked': { color: themeColor },
            }}
          />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#ECEFF3' }}>
                Room #{room.roomNumber}
              </Typography>
              {!isMatchingCategory && (
                <Chip
                  size="small"
                  label={room.type?.toUpperCase()}
                  sx={{ height: 18, fontSize: '0.62rem', backgroundColor: '#2A3547', color: '#3FD0C9' }}
                />
              )}
              {allocatedInOtherSlot !== undefined && (
                <Chip
                  size="small"
                  label={`Used in Slot #${Number(allocatedInOtherSlot) + 1}`}
                  sx={{ height: 18, fontSize: '0.62rem', backgroundColor: '#2A3547', color: '#E8A33D' }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
              Cap: {room.capacity} Guests • ${room.pricePerNight}/night
            </Typography>
            {isOccupied && (
              <Typography variant="caption" sx={{ color: '#F2545B', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>
                • Occupied by In-House Guest {room.conflictGuest ? `(${room.conflictGuest})` : ''}
              </Typography>
            )}
            {isBooked && !isOccupied && (
              <Typography variant="caption" sx={{ color: '#E8A33D', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>
                • Reserved by {room.conflictGuest || 'Guest'} ({room.conflictRef || ''})
              </Typography>
            )}
          </Box>
        </Box>

        <Chip
          size="small"
          label={badgeLabel}
          sx={{
            height: 22,
            fontSize: '0.68rem',
            fontWeight: 700,
            backgroundColor: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
          }}
        />
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      maxWidth="md"
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
              backgroundColor: 'rgba(201, 161, 90, 0.15)',
              color: '#C9A15A',
              display: 'flex',
            }}
          >
            <Key className="w-5 h-5" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#ECEFF3', fontSize: '1.1rem' }}>
              Physical Room Allotment {numSlots > 1 ? `(${numSlots} Rooms)` : ''}
            </Typography>
            <Typography variant="caption" sx={{ color: '#8791A3' }}>
              Receptionist Authority: Assign clean available units & calculate dynamic rate adjustment
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

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

        {/* Guest & Reservation Quick Card */}
        <Box
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2,
            backgroundColor: '#1B2433',
            border: '1px solid #2A3547',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: '#8791A3', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Guest Name
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
              {booking?.guestInfo?.fullName || booking?.userId?.name || 'Valued Guest'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#3FD0C9' }}>
              Ref: {booking?.bookingReference}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: '#8791A3', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Stay Duration
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
              {diffDays} Night(s)
            </Typography>
            <Typography variant="caption" sx={{ color: '#8791A3' }}>
              {booking?.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : ''} -{' '}
              {booking?.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : ''}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: '#8791A3', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dynamic Rate Ledger
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#3ECF8E' }}>
                New Total: ${proposedTotal.toFixed(2)}
              </Typography>
              {priceDifference !== 0 && (
                <Chip
                  size="small"
                  label={`${priceDifference > 0 ? '+' : ''}$${priceDifference.toFixed(2)}`}
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    backgroundColor: priceDifference > 0 ? 'rgba(201, 161, 90, 0.2)' : 'rgba(62, 207, 142, 0.2)',
                    color: priceDifference > 0 ? '#C9A15A' : '#3ECF8E',
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: '#8791A3' }}>
              Original: ${(booking?.totalPrice ?? 0).toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Multi-Room Slot Tabs (if multiple rooms booked) */}
        {numSlots > 1 && (
          <Box sx={{ mb: 2.5, borderBottom: '1px solid #2A3547' }}>
            <Tabs
              value={activeSlot}
              onChange={(_e, v) => setActiveSlot(v)}
              TabIndicatorProps={{ style: { backgroundColor: '#C9A15A', height: 3 } }}
              sx={{
                minHeight: 40,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  color: '#8791A3',
                  '&.Mui-selected': { color: '#C9A15A' },
                },
              }}
            >
              {roomsList.map((rm, idx) => {
                const assignedId = slotAllocations[idx];
                const assignedRoom = availableRooms.find((r) => r._id === assignedId);
                const label = assignedRoom
                  ? `Room ${idx + 1}: #${assignedRoom.roomNumber} (${assignedRoom.type?.toUpperCase()})`
                  : `Room ${idx + 1}: Unassigned (${(rm.roomType || 'Suite').toUpperCase()})`;

                return (
                  <Tab
                    key={idx}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <BedDouble className="w-3.5 h-3.5" />
                        <span>{label}</span>
                        {assignedRoom && <CheckCircle className="w-3 h-3 text-[#3ECF8E]" />}
                      </Box>
                    }
                  />
                );
              })}
            </Tabs>
          </Box>
        )}

        {/* Active Slot Context Banner */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ECEFF3', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sparkles className="w-4 h-4 text-[#C9A15A]" />
            Select Room for Slot {activeSlot + 1} of {numSlots} ({reservedType.toUpperCase()} Suite requested)
          </Typography>
          {slotAllocations[activeSlot] && (
            <Chip
              size="small"
              icon={<CheckCircle className="w-3 h-3" />}
              label="Slot Assigned"
              sx={{
                height: 22,
                fontSize: '0.68rem',
                backgroundColor: 'rgba(62, 207, 142, 0.15)',
                color: '#3ECF8E',
                border: '1px solid #3ECF8E',
              }}
            />
          )}
        </Box>

        {loadingRooms ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
            <CircularProgress size={24} sx={{ color: '#C9A15A' }} />
            <Typography variant="body2" sx={{ color: '#8791A3' }}>
              Finding available clean rooms...
            </Typography>
          </Box>
        ) : availableRooms.length === 0 ? (
          <Alert severity="warning" sx={{ backgroundColor: 'rgba(201, 161, 90, 0.1)', color: '#C9A15A', border: '1px solid rgba(201, 161, 90, 0.2)' }}>
            No clean rooms are currently available for these dates.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Matching Category Section */}
            {matchingRooms.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ color: '#8791A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, display: 'block' }}>
                  Matching Category ({reservedType.toUpperCase()} SUITES)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  {matchingRooms.map((room) => renderRoomCard(room, true))}
                </Box>
              </Box>
            )}

            {/* Other Categories / Upgrades Section */}
            {otherRooms.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ color: '#8791A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1, display: 'block' }}>
                  Alternative Categories / Upgrades (Automatic Dynamic Recalculation)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  {otherRooms.map((room) => renderRoomCard(room, false))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid #2A3547', gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ color: '#8791A3', '&:hover': { color: '#ECEFF3' } }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmAllotment}
          disabled={submitting || !allSlotsAssigned || loadingRooms}
          startIcon={
            submitting ? (
              <CircularProgress size={16} sx={{ color: '#0A0F1A' }} />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )
          }
          sx={{
            backgroundColor: '#C9A15A',
            color: '#0A0F1A',
            fontWeight: 700,
            px: 2.5,
            '&:hover': { backgroundColor: '#B88E45' },
            '&.Mui-disabled': { backgroundColor: '#2A3547', color: '#8791A3' },
          }}
        >
          {submitting ? 'Allotting Rooms...' : `Confirm Allotment (${Object.keys(slotAllocations).length}/${numSlots})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AllotRoomDialog;
