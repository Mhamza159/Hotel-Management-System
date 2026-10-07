import React from 'react';
import { BOOKING_STATUS } from '../../config/constants';

const statusConfig = {
  [BOOKING_STATUS.PENDING]: {
    label: 'Pending',
    bg: 'bg-[#C9A15A]/10 border-[#C9A15A] text-[#C9A15A]',
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: 'Confirmed',
    bg: 'border-[#2B3A2A] text-[#2B3A2A] bg-transparent',
  },
  [BOOKING_STATUS.CHECKED_IN]: {
    label: 'Checked In',
    bg: 'bg-[#2B3A2A]/10 border-[#2B3A2A] text-[#2B3A2A]',
  },
  [BOOKING_STATUS.CHECKED_OUT]: {
    label: 'Checked Out',
    bg: 'border-[#8C8578] text-[#8C8578] bg-transparent',
  },
  [BOOKING_STATUS.CANCELLATION_REQUESTED]: {
    label: 'Cancel Requested',
    bg: 'border-[#C9A15A] text-[#C9A15A] bg-[#C9A15A]/10',
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: 'Cancelled',
    bg: 'border-[#B5533C] text-[#B5533C] bg-[#B5533C]/10',
  },
  [BOOKING_STATUS.COMPLETED]: {
    label: 'Completed',
    bg: 'border-[#8C8578] text-[#8C8578] bg-transparent',
  },
};

export const BookingStatusBadge = ({ status }) => {
  const config = statusConfig[status] || {
    label: status || 'Unknown',
    bg: 'border-[#8C8578] text-[#8C8578] bg-transparent',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-80" />
      {config.label}
    </span>
  );
};

export default BookingStatusBadge;
