import React from 'react';

export const PriceBreakdown = ({
  rooms = [],
  nights = 1,
  taxRate = 0.1, // 10% hospitality tax
  discount = 0,
}) => {
  const roomSubtotal = rooms.reduce((acc, room) => acc + (room.pricePerNight || 0) * nights, 0);
  const taxes = Math.round(roomSubtotal * taxRate);
  const total = Math.max(0, roomSubtotal + taxes - discount);

  return (
    <div className="bg-[#FAF8F2] border border-[#E4DFD0] rounded-xl p-5 space-y-3 text-sm">
      <h4 className="font-semibold text-xs uppercase tracking-wider text-[#2A2A28]/70 border-b border-[#E4DFD0] pb-2">
        Reservation Pricing Summary
      </h4>

      <div className="space-y-2 text-xs">
        {rooms.map((room, idx) => (
          <div key={idx} className="flex justify-between text-[#2A2A28]">
            <span>
              {room.type?.toUpperCase() || 'LUXURY'} Suite ({nights} night{nights > 1 ? 's' : ''})
            </span>
            <span className="font-medium">${(room.pricePerNight || 0) * nights}</span>
          </div>
        ))}

        <div className="flex justify-between text-[#2A2A28]/70 pt-1">
          <span>Hospitality & Resort Tax (10%)</span>
          <span>${taxes}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-[#B5533C] font-medium">
            <span>Promotional / Loyalty Discount</span>
            <span>-${discount}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#E4DFD0] flex justify-between items-baseline">
        <span className="font-bold text-[#2A2A28] text-sm">Total Due</span>
        <div className="text-right">
          <span className="font-display font-bold text-xl text-[#C9A15A]">
            ${total}
          </span>
          <span className="text-[10px] text-[#2A2A28]/60 block">All taxes & fees included</span>
        </div>
      </div>
    </div>
  );
};

export default PriceBreakdown;
