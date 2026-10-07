import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  Wrench,
  Loader2,
} from 'lucide-react';
import { housekeepingService } from '../../services/housekeeping.service';

const STATUS_OPTIONS = [
  {
    value: 'clean',
    label: 'Clean & Inspected',
    color: '#B7CBA8', // --pastel-sage
    description: 'Fresh linens, full amenities, guest-ready',
    icon: CheckCircle2,
  },
  {
    value: 'dirty',
    label: 'Dirty (Vacant)',
    color: '#E3B7A8', // --pastel-blush
    description: 'Requires full turnover and sanitization',
    icon: AlertTriangle,
  },
  {
    value: 'cleaning',
    label: 'In Progress (Cleaning)',
    color: '#BFDCC4', // --pastel-mint
    description: 'Housekeeper is actively working inside',
    icon: Play,
  },
  {
    value: 'maintenance',
    label: 'Under Maintenance',
    color: '#D8CFC0', // --pastel-taupe
    description: 'Repairs or engineering inspection scheduled',
    icon: Wrench,
  },
];

export const UpdateCleanlinessDialog = ({ open, onClose, room, onSuccess }) => {
  const [targetStatus, setTargetStatus] = useState('clean');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && room) {
      setTargetStatus(room.housekeepingStatus || 'clean');
      setNotes('');
      setError(null);
    }
  }, [open, room]);

  if (!open || !room) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!room?._id) return;

    try {
      setLoading(true);
      setError(null);

      await housekeepingService.updateStatus(room._id, {
        housekeepingStatus: targetStatus,
        notes: notes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update housekeeping status:', err);
      setError(err?.response?.data?.message || 'Status transition failed.');
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
          className="fixed inset-0 bg-[#2B3A2A]/40 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md bg-white border border-[#E4DFD0] rounded-3xl p-6 shadow-xl z-10 text-[#2A2A28]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E4DFD0]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#B7CBA8]/30 flex items-center justify-center text-[#2B3A2A]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#2A2A28] leading-tight">
                  Room Turnover Status
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#2A2A28]/60">
                  Update Cleanliness State
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-xl text-[#2A2A28]/60 hover:text-[#2A2A28] hover:bg-[#F3EFE7] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            {/* Room Identifier Card */}
            <div className="p-3.5 rounded-2xl bg-[#F3EFE7] border border-[#E4DFD0] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#2A2A28]/60 block">
                  Assigned Unit
                </span>
                <span className="font-serif text-base font-bold text-[#2A2A28]">
                  Room #{room.roomNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#2A2A28]/60 block">
                  Suite Type
                </span>
                <span className="text-xs font-semibold capitalize text-[#2B3A2A]">
                  {room.type} Suite
                </span>
              </div>
            </div>

            {/* Status Selectors */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#2A2A28]/70 font-semibold">
                Select New Cleanliness State
              </label>

              <div className="grid grid-cols-1 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = targetStatus === opt.value;
                  const Icon = opt.icon;

                  return (
                    <label
                      key={opt.value}
                      onClick={() => setTargetStatus(opt.value)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-[#2B3A2A] bg-[#2B3A2A]/5 shadow-xs'
                          : 'border-[#E4DFD0] hover:border-[#2B3A2A]/40 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs"
                          style={{ backgroundColor: opt.color }}
                        >
                          <Icon className="w-4 h-4 text-[#2A2A28]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2A2A28]">{opt.label}</p>
                          <p className="text-[10px] text-[#2A2A28]/60">{opt.description}</p>
                        </div>
                      </div>

                      <input
                        type="radio"
                        name="housekeepingStatus"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => setTargetStatus(opt.value)}
                        className="accent-[#2B3A2A] w-4 h-4 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#2A2A28]/70 font-semibold mb-1">
                Housekeeping Shift Notes <span className="text-[10px] text-[#2A2A28]/40 lowercase font-sans">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Linen refreshed, mini-bar restocked, terrace inspected."
                rows={2}
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3EFE7] border border-[#E4DFD0] text-xs text-[#2A2A28] placeholder-[#2A2A28]/40 focus:outline-none focus:border-[#2B3A2A] transition-colors resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2A2A28] border border-[#E4DFD0] bg-white hover:bg-[#F3EFE7] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F3EFE7] text-xs font-semibold shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F3EFE7]" />
                    <span>Committing...</span>
                  </>
                ) : (
                  <span>Commit Status Change</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpdateCleanlinessDialog;
