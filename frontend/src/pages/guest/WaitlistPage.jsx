import React, { useState, useEffect } from 'react';
import { Clock, Bell, Trash2, Plus, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { engagementService } from '../../services/engagement.service';
import { Navbar } from '../../components/guest/Navbar';
import { Footer } from '../../components/guest/Footer';

/**
 * Guest Sold-Out Dates Availability Alerts & Waitlist Page
 * Route: /waitlist
 */
export const WaitlistPage = () => {
  const [waitlists, setWaitlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [formData, setFormData] = useState({
    roomType: 'deluxe',
    checkIn: '',
    checkOut: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchWaitlists = async () => {
    try {
      setLoading(true);
      const res = await engagementService.getWaitlists();
      setWaitlists(res?.waitlists || []);
    } catch (err) {
      console.error('Failed to load waitlists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlists();
  }, []);

  const handleCancel = async (id) => {
    try {
      setWaitlists((prev) => prev.filter((w) => w._id !== id));
      await engagementService.cancelWaitlist(id);
      setMessage({ type: 'success', text: 'Waitlist alert subscription cancelled.' });
    } catch (err) {
      console.error('Failed to cancel waitlist:', err);
      fetchWaitlists();
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!formData.checkIn || !formData.checkOut) {
      setMessage({ type: 'error', text: 'Please select both check-in and check-out dates.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      await engagementService.joinWaitlist({
        roomType: formData.roomType,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
      });

      setMessage({
        type: 'success',
        text: `Subscribed! We will notify you immediately if a ${formData.roomType} suite becomes available.`,
      });
      setShowJoinForm(false);
      setFormData({ roomType: 'deluxe', checkIn: '', checkOut: '' });
      fetchWaitlists();
    } catch (err) {
      console.error('Failed to join waitlist:', err);
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Unable to join waitlist.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2A2A28] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DFD0] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-[#2B3A2A]" />
              <span className="text-xs uppercase tracking-wider text-[#2B3A2A] font-bold font-mono">
                Instant Availability Alerts
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold text-[#2A2A28]">
              Sold-Out Date Waitlists
            </h1>
            <p className="text-xs text-[#2A2A28]/70 mt-1">
              Never miss a reservation — receive automatic email alerts when guest cancellations free up dates
            </p>
          </div>

          <button
            onClick={() => setShowJoinForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold transition-all shadow-sm self-start cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showJoinForm ? 'Close Form' : 'New Availability Alert'}</span>
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              message.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs font-bold underline ml-2 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Join Waitlist Form Dropdown */}
        {showJoinForm && (
          <form
            onSubmit={handleJoin}
            className="p-6 rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] space-y-4 shadow-sm"
          >
            <h3 className="font-display text-base font-bold text-[#2A2A28]">
              Set Availability Alert
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#2A2A28]/70 mb-1">
                  Desired Suite Category
                </label>
                <select
                  value={formData.roomType}
                  onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] text-[#2A2A28] text-xs focus:outline-none focus:border-[#2B3A2A]"
                >
                  <option value="single">Single Suite</option>
                  <option value="double">Double Suite</option>
                  <option value="deluxe">Deluxe Horizon Suite</option>
                  <option value="presidential">Presidential Suite</option>
                  <option value="suite">Executive Suite</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2A28]/70 mb-1">
                  Desired Check-In Date
                </label>
                <input
                  type="date"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] text-[#2A2A28] text-xs focus:outline-none focus:border-[#2B3A2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2A2A28]/70 mb-1">
                  Desired Check-Out Date
                </label>
                <input
                  type="date"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] text-[#2A2A28] text-xs focus:outline-none focus:border-[#2B3A2A]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2A2A28]/70 hover:text-[#2A2A28] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F5F1E8] text-xs font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5F1E8]" />
                    <span>Setting Alert...</span>
                  </>
                ) : (
                  <span>Subscribe to Alerts</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Active Waitlists */}
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-[#2B3A2A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#2A2A28]/70">Checking your active alerts...</p>
          </div>
        ) : waitlists.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#FAF8F2] border border-[#E4DFD0] space-y-3">
            <Bell className="w-10 h-10 text-[#2B3A2A] mx-auto stroke-1" />
            <p className="text-sm font-semibold text-[#2A2A28]">
              No active availability alerts
            </p>
            <p className="text-xs text-[#2A2A28]/70">
              If a suite is fully booked on your dates, set an alert and we'll notify you the moment a room opens up.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {waitlists.map((w) => (
              <div
                key={w._id}
                className="p-5 rounded-xl bg-[#FAF8F2] border border-[#E4DFD0] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#F5F1E8] border border-[#E4DFD0] text-[#2B3A2A]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#2A2A28] capitalize">
                        {w.roomType} Suite
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2B3A2A]/10 text-[#2B3A2A] border border-[#2B3A2A]/30">
                        {w.status || 'Active Alert'}
                      </span>
                    </div>
                    <span className="text-xs text-[#2A2A28]/70 block mt-0.5">
                      Dates: {new Date(w.checkIn).toLocaleDateString()} &rarr; {new Date(w.checkOut).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleCancel(w._id)}
                  title="Cancel Alert"
                  className="p-2 rounded-lg text-[#2A2A28]/60 hover:text-[#B5533C] hover:bg-[#B5533C]/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default WaitlistPage;
