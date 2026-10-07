import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, CheckCircle2, MessageSquare } from 'lucide-react';
import { engagementService } from '../../services/engagement.service';

/**
 * Verified Stay Guest Review Submission Modal
 */
export const SubmitReviewModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(() => {
    return booking?.rooms?.[0]?.roomId?._id || booking?.rooms?.[0]?.roomId || '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please write a few words about your stay experience.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await engagementService.createReview({
        bookingId: booking._id,
        roomId: selectedRoomId,
        rating,
        comment: comment.trim(),
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError(err?.response?.data?.message || 'Unable to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          className="fixed inset-0 bg-[#2B3A2A]/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl p-6 shadow-2xl z-10 text-[#2A2A28]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#2A2A28]/60 hover:text-[#2A2A28] hover:bg-[#F5F1E8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {submitted ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#2B3A2A]/10 border border-[#2B3A2A]/30 flex items-center justify-center mx-auto text-[#2B3A2A] mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#2A2A28]">
                Review Published
              </h3>
              <p className="text-sm text-[#2A2A28]/70 mt-2 max-w-xs mx-auto">
                Thank you for your valuable feedback! Your verified review helps other travelers discover Grand Horizon.
              </p>
              <div className="mt-6">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-sm font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A15A]/10 border border-[#C9A15A]/30 flex items-center justify-center text-[#C9A15A]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#2A2A28]">
                    Rate Your Experience
                  </h3>
                  <p className="text-xs text-[#2A2A28]/70">
                    Verified Stay Ref: <span className="font-mono text-[#2B3A2A] font-semibold">{booking.bookingReference}</span>
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs">
                  {error}
                </div>
              )}

              {/* Star Rating Selector */}
              <div className="p-4 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] text-center space-y-2">
                <span className="text-xs text-[#2A2A28]/70 uppercase tracking-wider font-semibold block">
                  Overall Score
                </span>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled
                              ? 'text-[#C9A15A] fill-[#C9A15A]'
                              : 'text-[#E4DFD0] hover:text-[#C9A15A]/50'
                          } transition-colors`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-semibold text-[#C9A15A]">
                  {rating === 5
                    ? 'Exceptional • 5 / 5'
                    : rating === 4
                    ? 'Very Good • 4 / 5'
                    : rating === 3
                    ? 'Average • 3 / 5'
                    : rating === 2
                    ? 'Below Expectations • 2 / 5'
                    : 'Disappointing • 1 / 5'}
                </span>
              </div>

              {/* Room selector if multiple rooms */}
              {booking.rooms && booking.rooms.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-[#2A2A28] mb-1.5">
                    Select Suite to Review
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] text-[#2A2A28] text-xs focus:outline-none focus:border-[#2B3A2A]"
                  >
                    {booking.rooms.map((r, i) => {
                      const id = r.roomId?._id || r.roomId;
                      const type = r.roomId?.type ? `${r.roomId.type.toUpperCase()} Suite` : 'Luxury Suite';
                      const num = r.roomId?.roomNumber ? ` (Room #${r.roomId.roomNumber})` : '';
                      return (
                        <option key={id} value={id}>
                          {type}{num}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Comment text */}
              <div>
                <label className="block text-xs font-medium text-[#2A2A28] mb-1.5">
                  Your Honest Thoughts <span className="text-[#B5533C]">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the view, comfort, amenities, and service during your stay?..."
                  rows={4}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] text-[#2A2A28] placeholder-[#2A2A28]/40 text-xs focus:outline-none focus:border-[#2B3A2A] transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2A2A28] border border-[#E4DFD0] bg-[#FAF8F2] hover:bg-[#F5F1E8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !comment.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] font-semibold text-xs shadow-sm disabled:opacity-50 transition-all duration-150 cursor-pointer"
                >
                  {loading ? 'Publishing...' : 'Submit Verified Review'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SubmitReviewModal;
