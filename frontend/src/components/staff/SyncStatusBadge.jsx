import React, { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, AlertTriangle, X } from 'lucide-react';
import { syncService } from '../../services/sync.service';

/**
 * ============================================================================
 * SYNC STATUS BADGE (Staff header)
 * ============================================================================
 * Desktop app (hub): cloud sync chal raha hai ya internet band hai.
 * Website (cloud):   hotel hub connected hai ya online booking band hai.
 * Dono jagah: website ki wo bookings jo hotel ki booking se takrayin (conflict) —
 * front desk ko naya room allot karna ya cancel karna hai.
 */
const POLL_MS = 30000;

const timeAgo = (value) => {
  if (!value) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
};

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));

const describe = (status) => {
  if (status.node === 'hub') {
    if (!status.enabled) {
      return { tone: 'muted', label: 'Cloud sync off', title: 'Cloud sync is not set up on the Hub (configure-sync.ps1). Online booking stays closed.' };
    }
    if (status.online) {
      return { tone: 'ok', label: 'Cloud synced', title: `Last sync ${timeAgo(status.lastSuccessAt)}` };
    }
    const pending = status.pendingChanges ? ` · ${status.pendingChanges} waiting` : '';
    return {
      tone: 'warn',
      label: `Offline${pending}`,
      title: `No internet sync since ${timeAgo(status.lastSuccessAt)}. Work continues; changes upload when the internet is back. Online booking is paused.${status.lastError ? `\nLast error: ${status.lastError}` : ''}`,
    };
  }
  if (!status.enabled) return null; // cloud bina hub ke: pehle jaisa, kuch na dikhao
  if (status.onlineBooking?.available) {
    return { tone: 'ok', label: 'Hotel hub online', title: `Hub last seen ${timeAgo(status.onlineBooking.lastHubContactAt)}` };
  }
  return {
    tone: 'warn',
    label: 'Hub offline · booking paused',
    title: `Hotel hub last seen ${timeAgo(status.onlineBooking?.lastHubContactAt)}. Online booking is paused until it reconnects.`,
  };
};

const TONES = {
  ok: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  warn: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300',
  muted: 'bg-[#F4F6F4] dark:bg-[#0A140F] border-[#E3EAE5] dark:border-[#264334] text-[#7C8B84]',
};

export const SyncStatusBadge = () => {
  const [status, setStatus] = useState(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      syncService
        .getStatus()
        .then((res) => active && setStatus(res))
        .catch(() => active && setStatus(null));
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!showConflicts) return undefined;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowConflicts(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showConflicts]);

  if (!status) return null;
  const view = describe(status);
  const conflicts = status.conflictBookings || [];
  if (!view && conflicts.length === 0) return null;

  return (
    <div className="relative flex items-center gap-2" ref={panelRef}>
      {view && (
        <div
          title={view.title}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium ${TONES[view.tone]}`}
        >
          {view.tone === 'ok' ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
          <span>{view.label}</span>
        </div>
      )}

      {conflicts.length > 0 && (
        <button
          type="button"
          onClick={() => setShowConflicts((open) => !open)}
          title="Online bookings that clash with hotel bookings"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-semibold"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>
            {conflicts.length} booking conflict{conflicts.length > 1 ? 's' : ''}
          </span>
        </button>
      )}

      {showConflicts && conflicts.length > 0 && (
        <div className="absolute right-0 top-10 w-80 z-30 rounded-xl border border-[#E3EAE5] dark:border-[#264334] bg-white dark:bg-[#14241C] shadow-lg p-4 text-xs text-[#4A5550] dark:text-[#E8EFEA]">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-semibold text-[#143D2B] dark:text-white">Online bookings needing a room</p>
            <button type="button" onClick={() => setShowConflicts(false)} aria-label="Close">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="mb-3 text-[11px] text-[#7C8B84]">
            These website bookings arrived after the hotel had already given their room to someone else.
            Allot another free room from the booking's desk view, or cancel and inform the guest.
          </p>
          <ul className="space-y-1.5 max-h-60 overflow-y-auto">
            {conflicts.map((booking) => (
              <li key={booking._id} className="flex items-center justify-between rounded-lg bg-[#F4F6F4] dark:bg-[#0A140F] px-2.5 py-1.5">
                <span className="font-mono font-semibold">{booking.bookingReference}</span>
                <span className="text-[11px]">
                  {formatDate(booking.checkInDate)} – {formatDate(booking.checkOutDate)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SyncStatusBadge;
