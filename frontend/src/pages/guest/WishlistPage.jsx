import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, BedDouble, Users, ArrowRight } from 'lucide-react';
import { engagementService } from '../../services/engagement.service';
import { Navbar } from '../../components/guest/Navbar';
import { Footer } from '../../components/guest/Footer';

/**
 * Guest Saved Suites Wishlist Page
 * Route: /wishlist
 */
export const WishlistPage = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await engagementService.getWishlist();
      setWishlist(res?.wishlist || []);
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (roomId) => {
    try {
      // Optimistic removal
      setWishlist((prev) => prev.filter((r) => r._id !== roomId));
      await engagementService.removeFromWishlist(roomId);
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
      fetchWishlist();
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="border-b border-[#E4DFD0] pb-6">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-[#B5533C] fill-[#B5533C]" />
            <span className="text-xs uppercase tracking-wider text-[#B5533C] font-bold font-mono">
              Curated Collection
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-[#2A2A28]">
            Saved Suites & Wishlist
          </h1>
          <p className="text-xs text-[#2A2A28]/70 mt-1">
            Rooms you have saved for your future luxury getaways
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-[#2B3A2A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#2A2A28]/70">Retrieving your wishlist...</p>
          </div>
        ) : wishlist.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] space-y-4">
            <Heart className="w-12 h-12 text-[#2B3A2A] mx-auto stroke-1" />
            <div>
              <p className="text-base font-semibold text-[#2A2A28]">
                Your wishlist is empty
              </p>
              <p className="text-xs text-[#2A2A28]/70 mt-1">
                Explore our catalog of luxury suites and tap the heart icon to save your favorites.
              </p>
            </div>
            <Link
              to="/rooms"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold transition-all shadow-sm"
            >
              Explore Resort Suites
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlist.map((room) => {
              const image = room.images?.[0] || 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80';

              return (
                <div
                  key={room._id}
                  className="rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] overflow-hidden flex flex-col justify-between group hover:border-[#2B3A2A]/50 transition-all"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={image}
                      alt={`${room.type} Suite`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={() => handleRemove(room._id)}
                      title="Remove from Wishlist"
                      className="absolute top-3 right-3 p-2 rounded-xl bg-[#FAF8F2]/90 backdrop-blur-sm text-[#B5533C] hover:bg-[#B5533C] hover:text-[#F5F1E8] transition-colors cursor-pointer border border-[#E4DFD0]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-[#FAF8F2]/90 backdrop-blur-sm text-[11px] font-semibold text-[#2B3A2A] uppercase border border-[#E4DFD0]">
                      {room.type} Suite
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-lg font-bold text-[#2A2A28]">
                          {room.type ? `${room.type.toUpperCase()} Suite` : 'Luxury Suite'}
                        </h3>
                        <span className="text-sm font-bold text-[#C9A15A]">
                          ${room.pricePerNight}/night
                        </span>
                      </div>
                      <p className="text-xs text-[#2A2A28]/70 mt-1 line-clamp-2">
                        {room.description || 'Experience ultimate serenity, premium linens, and breathtaking horizon views.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#E4DFD0] flex items-center justify-between">
                      <span className="text-xs text-[#2A2A28]/70 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#2B3A2A]" />
                        <span>Up to {room.capacity || 2} Guests</span>
                      </span>

                      <Link
                        to={`/rooms/${room._id}`}
                        className="flex items-center gap-1 text-xs font-bold text-[#2B3A2A] hover:underline"
                      >
                        <span>Reserve</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default WishlistPage;
