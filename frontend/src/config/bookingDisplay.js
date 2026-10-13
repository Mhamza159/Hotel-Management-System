/**
 * Booking API documents se mehmaan aur room ki maloomat nikalna (sab staff screens ke liye ek jaisa).
 * Backend booking me mehmaan `guestInfo` (walk-in) ya populated `userId` me hota hai, aur
 * kamre `rooms[].roomId` me (populated ho to roomNumber/type ke saath).
 */

export const bookingGuestName = (b) =>
  b?.guestInfo?.fullName || b?.userId?.name || b?.user?.name || b?.guestName || '';

export const bookingGuestEmail = (b) =>
  b?.guestInfo?.email || b?.userId?.email || b?.user?.email || b?.guestEmail || '';

export const bookingRoomNumbers = (b) =>
  (b?.rooms || [])
    .map((r) => r?.roomId?.roomNumber || r?.roomNumber)
    .filter(Boolean)
    .join(', ') ||
  b?.room?.roomNumber ||
  '';

export const bookingRoomType = (b) => b?.rooms?.[0]?.roomId?.type || b?.room?.type || '';
