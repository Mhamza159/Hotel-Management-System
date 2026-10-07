import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Bed, ArrowRight, Heart } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { engagementService } from '../../services/engagement.service';

export const RoomCard = ({ room, searchParams = '' }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [isSaved, setIsSaved] = useState(false);

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      if (isSaved) {
        await engagementService.removeFromWishlist(room._id);
        setIsSaved(false);
      } else {
        await engagementService.addToWishlist(room._id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Wishlist click error:', err);
    }
  };

  const photoUrl =
    room.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';

  return (
    <motion.div
      layoutId={`room-card-${room._id}`}
      className="bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl overflow-hidden hover:border-[#2B3A2A]/40 transition-all duration-300 shadow-sm group flex flex-col justify-between"
    >
      <div>
        {/* Photo Container with Shared Motion */}
        <div className="relative h-60 overflow-hidden bg-[#FAF8F2] m-2.5 rounded-xl">
          <motion.img
            layoutId={`room-img-${room._id}`}
            src={photoUrl}
            alt={`${room.type} Suite`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

          {/* Room Type Pill */}
          <div className="absolute top-3 left-3 bg-[#FAF8F2]/95 border border-[#2B3A2A]/30 px-3 py-1 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider text-[#2B3A2A]">
            {room.type}
          </div>

          {/* Top Right Actions: Wishlist */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleWishlistClick}
              title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
              className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isSaved
                  ? 'bg-rose-500 border-rose-500 text-white'
                  : 'bg-[#FAF8F2]/90 border-[#E4DFD0] text-[#2A2A28] hover:text-rose-500'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 pt-2">
          <div className="flex items-baseline justify-between mb-1.5">
            <h3 className="font-playfair text-lg font-normal text-[#2A2A28] group-hover:text-[#2B3A2A] transition-colors capitalize">
              {room.description || `${room.type} Room`}
            </h3>
          </div>

          <p className="text-xs text-[#2A2A28]/70 line-clamp-2 mb-3 leading-relaxed">
            Acoustic isolation, climate zoning, and bespoke organic linens with scenic vistas.
          </p>

          {/* Quick Specs */}
          <div className="flex items-center space-x-4 text-xs text-[#2A2A28]/70 mb-3">
            <span className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-[#2B3A2A]" />
              <span>Up to {room.capacity} Guests</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Bed className="w-3.5 h-3.5 text-[#2B3A2A]" />
              <span className="capitalize">{room.type}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Price & CTA */}
      <div className="px-5 pb-5 pt-3 border-t border-[#E4DFD0] flex items-center justify-between">
        <div>
          <span className="text-[10px] font-sans font-medium text-[#2A2A28]/60 uppercase tracking-wider block">From</span>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className="font-playfair font-bold text-xl text-[#2B3A2A]">
              ${room.pricePerNight}
            </span>
            <span className="text-[11px] text-[#2A2A28]/60 font-medium">/ night</span>
          </div>
        </div>

        <Link
          to={`/rooms/${room._id}${searchParams ? `?${searchParams}` : ''}`}
          className="px-4 py-2 bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold rounded-xl shadow-sm transition-all duration-200 flex items-center space-x-1.5 group/btn"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};

export default RoomCard;
