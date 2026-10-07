import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  ShieldAlert,
  X,
  Copy,
  Check,
  Eye,
  Code2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  User,
  BedDouble,
  CalendarCheck,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Receipt,
  Phone,
  Mail,
  UserCheck,
  Lock,
  Sparkles,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

/**
 * ============================================================================
 * HUMAN-READABLE PERMISSION LABEL TAXONOMY
 * ============================================================================
 */
const PERMISSION_LABEL_MAP = {
  // Bookings & Reservations
  'bookings:view': 'View All Bookings',
  'bookings:create': 'Create Reservations',
  'bookings:confirm': 'Confirm Reservations',
  'bookings:cancel': 'Audit & Process Cancellations',
  // Front Desk & Cleanliness
  'checkin:manage': 'Guest Check-In',
  'checkout:manage': 'Guest Check-Out',
  'housekeeping:update': 'Housekeeping Cleanliness Board',
  // Financial Payments
  'payments:recordCash': 'Record Cash Payments',
  'payments:recordCard': 'Record POS Card Slips',
  'payments:refund': 'Execute Authoritative Refunds',
  // Physical Rooms
  'rooms:view': 'View Room Inventory',
  'rooms:create': 'Define Physical Suites',
  'rooms:update': 'Edit Room Specifications',
  'rooms:delete': 'Deactivate / Soft-Delete Rooms',
  'rooms:priceUpdate': 'Adjust Nightly Rates',
  // Administration & Oversight
  'staff:manage': 'Manage Staff & PBAC Matrix',
  'analytics:view': 'View Managerial Analytics & KPIs',
  'audit:view': 'View Security Audit Trail',
  'coupons:manage': 'Manage Promotion Codes',
  'waitlist:manage': 'Manage Room Waitlists',
};

/**
 * ============================================================================
 * HIGH-END MINIMALIST AUDIT PAYLOAD INSPECTOR MODAL
 * ============================================================================
 * 
 * Engineered with:
 * - Awwwards-Tier Double-Bezel (Doppelrand) Architecture
 * - Editorial Luxury & Utilitarian Minimalism
 * - Deep Obsidian Glass with ambient radial glow
 * - Dynamic Guest Profile Resolution for all historical & live logs
 * - Zero Layout Clutter, Zero 6-Line Wraps
 */
export const AuditPayloadModal = ({ open, onClose, log }) => {
  // Unconditionally declared top-level hooks strictly per React Rules of Hooks
  const [activeTab, setActiveTab] = useState('summary');
  const [copied, setCopied] = useState(false);
  const [resolvedGuest, setResolvedGuest] = useState(null);

  // Dynamic Guest Profile Auto-Resolver Hook
  useEffect(() => {
    let isMounted = true;
    const lookupGuestIfNeeded = async () => {
      if (!open || !log) {
        setResolvedGuest(null);
        return;
      }

      // Check if afterState or targetId already has a non-generic customer name
      const existingName = log.afterState?.guestName || log.targetId?.userId?.name;
      if (existingName && existingName !== 'Guest / Customer' && existingName !== 'Valued Guest') {
        setResolvedGuest(null);
        return;
      }

      const identifier =
        log.afterState?.bookingReference ||
        log.afterState?.bookingId ||
        (typeof log.targetId === 'string' ? log.targetId : log.targetId?._id);

      if (!identifier) return;

      try {
        const res = await adminService.searchPayment(identifier);
        if (isMounted && res?.payment) {
          const p = res.payment;
          const name = p.userId?.name || p.bookingId?.guestInfo?.fullName || null;
          const phone = p.userId?.phone || p.bookingId?.guestInfo?.phone || null;
          const email = p.userId?.email || p.bookingId?.guestInfo?.email || null;
          const id = p.userId?._id || null;
          if (name) {
            setResolvedGuest({ name, phone, email, id });
          }
        }
      } catch (err) {
        // Fallback silently without throwing unhandled exceptions
      }
    };

    lookupGuestIfNeeded();
    return () => {
      isMounted = false;
    };
  }, [open, log]);

  // Helper: Role Badge Color Resolver
  const getRoleBadgeStyle = (role) => {
    const roleStr = typeof role === 'string' ? role.toLowerCase() : '';
    switch (roleStr) {
      case 'super-admin':
      case 'super_admin':
        return { bg: 'rgba(201, 161, 90, 0.12)', border: 'rgba(201, 161, 90, 0.3)', text: '#C9A15A' };
      case 'receptionist':
        return { bg: 'rgba(63, 208, 201, 0.12)', border: 'rgba(63, 208, 201, 0.3)', text: '#3FD0C9' };
      case 'housekeeping':
        return { bg: 'rgba(62, 207, 142, 0.12)', border: 'rgba(62, 207, 142, 0.3)', text: '#3ECF8E' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: '#A1A1AA' };
    }
  };

  // Dynamic Target Entity Parser
  const targetInfo = useMemo(() => {
    if (!log) {
      return {
        isUser: false,
        entityType: 'N/A',
        role: null,
        name: 'No Record Selected',
        email: null,
        id: 'N/A',
        badgeStyle: { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: '#A1A1AA' },
      };
    }

    const isUser = log.targetType === 'User';

    if (isUser) {
      const role =
        log.afterState?.role ||
        log.beforeState?.role ||
        log.targetId?.role ||
        'user';
      const name =
        log.afterState?.name ||
        log.beforeState?.name ||
        log.targetId?.name ||
        null;
      const email =
        log.afterState?.email ||
        log.beforeState?.email ||
        log.targetId?.email ||
        null;

      const badgeStyle = getRoleBadgeStyle(role);
      const cleanRole = typeof role === 'string' ? role.replace('_', ' ') : 'user';

      return {
        isUser: true,
        entityType: 'Staff / User Account',
        role: cleanRole,
        name: name || `Staff User (${cleanRole})`,
        email: email,
        id: typeof log.targetId === 'string' ? log.targetId : log.targetId?._id ? String(log.targetId._id) : (log.targetId ? JSON.stringify(log.targetId) : 'N/A'),
        badgeStyle: badgeStyle || { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: '#A1A1AA' },
      };
    }

    if (log.targetType === 'Room') {
      const roomNum = log.afterState?.roomNumber || log.beforeState?.roomNumber;
      const roomType = log.afterState?.type || log.beforeState?.type;
      return {
        isUser: false,
        entityType: 'Physical Hotel Suite',
        role: roomType ? `Category: ${String(roomType).toUpperCase()}` : null,
        name: roomNum ? `Suite Room #${roomNum}` : 'Hotel Room Definition',
        email: null,
        id: typeof log.targetId === 'string' ? log.targetId : log.targetId?._id ? String(log.targetId._id) : (log.targetId ? JSON.stringify(log.targetId) : 'N/A'),
        badgeStyle: { bg: 'rgba(201, 161, 90, 0.12)', border: 'rgba(201, 161, 90, 0.3)', text: '#C9A15A' },
      };
    }

    if (log.targetType === 'Booking') {
      return {
        isUser: false,
        entityType: 'Guest Reservation',
        role: 'Booking Record',
        name: `Reservation Reference`,
        email: null,
        id: typeof log.targetId === 'string' ? log.targetId : log.targetId?._id ? String(log.targetId._id) : (log.targetId ? JSON.stringify(log.targetId) : 'N/A'),
        badgeStyle: { bg: 'rgba(63, 208, 201, 0.12)', border: 'rgba(63, 208, 201, 0.3)', text: '#3FD0C9' },
      };
    }

    if (log.targetType === 'Payment' || log.action?.startsWith('payment:') || log.action === 'desk:in-person-payment') {
      const amt = log.afterState?.amount ?? log.beforeState?.amount ?? log.targetId?.amount ?? 0;
      const curr = log.afterState?.currency ?? log.targetId?.currency ?? 'USD';
      const pMethod = log.afterState?.paymentMethod ?? log.targetId?.paymentMethod ?? 'CASH';
      const pStatus = log.afterState?.status ?? log.targetId?.status ?? 'PAID';
      const gName = log.afterState?.guestName || resolvedGuest?.name;
      return {
        isUser: false,
        isPayment: true,
        entityType: 'Financial Transaction',
        role: `${String(pMethod).toUpperCase()} • ${String(pStatus).toUpperCase()}`,
        name: gName && gName !== 'Guest / Customer' && gName !== 'Valued Guest'
          ? `${curr} ${Number(amt).toLocaleString()} — ${gName}`
          : `${curr} ${Number(amt).toLocaleString()}`,
        email: null,
        id: typeof log.targetId === 'string' ? log.targetId : log.targetId?._id ? String(log.targetId._id) : (log.targetId ? JSON.stringify(log.targetId) : 'N/A'),
        badgeStyle: { bg: 'rgba(62, 207, 142, 0.12)', border: 'rgba(62, 207, 142, 0.3)', text: '#3ECF8E' },
      };
    }

    return {
      isUser: false,
      entityType: log.targetType || 'System Entity',
      role: log.targetType || 'System',
      name: `${log.targetType || 'Entity'} Record`,
      email: null,
      id: typeof log.targetId === 'string' ? log.targetId : log.targetId?._id ? String(log.targetId._id) : (log.targetId ? JSON.stringify(log.targetId) : 'N/A'),
      badgeStyle: { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: '#A1A1AA' },
    };
  }, [log, resolvedGuest]);

  // Payment Breakdown Extraction
  const paymentDetails = useMemo(() => {
    if (!log) return null;
    const isPaymentAction =
      log.targetType === 'Payment' ||
      log.action?.startsWith('payment:') ||
      log.action === 'desk:in-person-payment' ||
      log.afterState?.amount !== undefined ||
      log.beforeState?.amount !== undefined;

    if (!isPaymentAction) return null;

    const after = log.afterState || {};
    const before = log.beforeState || {};
    const target = typeof log.targetId === 'object' && log.targetId !== null ? log.targetId : {};

    const amount = after.amount ?? before.amount ?? target.amount ?? 0;
    const currency = after.currency ?? target.currency ?? 'USD';
    const paymentMethod = after.paymentMethod ?? target.paymentMethod ?? 'cash';
    const status = after.status ?? target.status ?? 'paid';

    // Payer / Guest Details ("Kisne pay ki")
    const rawGuestName = after.guestName || target.userId?.name || after.guest?.name;
    const isGenericGuest = !rawGuestName || rawGuestName === 'Guest / Customer' || rawGuestName === 'Valued Guest';

    const guestName = (isGenericGuest && resolvedGuest?.name)
      ? resolvedGuest.name
      : (rawGuestName || 'Valued Guest');

    const guestEmail = resolvedGuest?.email || after.guestEmail || target.userId?.email || after.guest?.email || null;
    const guestPhone = resolvedGuest?.phone || after.guestPhone || target.userId?.phone || after.guest?.phone || null;
    const guestId = resolvedGuest?.id || after.userId || target.userId?._id || target.userId || null;

    // Receiver / Staff Details ("Kisne receive ki")
    const receiverName = after.receivedByStaffName || target.receivedByStaffId?.name || log.actorId?.name || 'Front Desk Staff';
    const receiverRole = after.receivedByStaffRole || target.receivedByStaffId?.role || log.actorId?.role || 'Staff';
    const receiverEmail = target.receivedByStaffId?.email || log.actorId?.email || null;
    const receiverId = after.receivedByStaffId || target.receivedByStaffId?._id || target.receivedByStaffId || log.actorId?._id || null;

    // Booking Details
    const bookingReference = after.bookingReference || target.bookingId?.bookingReference || after.bookingId || target.bookingId || null;
    const transactionReference = after.transactionReference || target.transactionReference || after.posSlipReference || null;
    const notes = after.notes || target.notes || null;

    return {
      amount,
      currency,
      paymentMethod,
      status,
      guestName,
      guestEmail,
      guestPhone,
      guestId,
      receiverName,
      receiverRole,
      receiverEmail,
      receiverId,
      bookingReference,
      transactionReference,
      notes,
    };
  }, [log, resolvedGuest]);

  // Permission Diff Calculation
  const permissionDiff = useMemo(() => {
    if (!log) return null;

    const isPermAction = log.action === 'staff:permission-update' || Boolean(log.beforeState?.permissions || log.afterState?.permissions);
    if (!isPermAction) return null;

    const beforeList = Array.isArray(log.beforeState?.permissions) ? log.beforeState.permissions : [];
    const afterList = Array.isArray(log.afterState?.permissions) ? log.afterState.permissions : [];

    const beforePerms = new Set(beforeList);
    const afterPerms = new Set(afterList);

    const added = [...afterPerms].filter((p) => !beforePerms.has(p));
    const removed = [...beforePerms].filter((p) => !afterPerms.has(p));
    const unchangedCount = [...afterPerms].filter((p) => beforePerms.has(p)).length;

    const roleChanged = log.beforeState?.role && log.afterState?.role && log.beforeState?.role !== log.afterState?.role;
    const statusChanged = log.beforeState?.isActive !== undefined && log.afterState?.isActive !== undefined && log.beforeState?.isActive !== log.afterState?.isActive;

    return {
      hasDiff: added.length > 0 || removed.length > 0 || roleChanged || statusChanged,
      added,
      removed,
      unchangedCount,
      roleChanged,
      beforeRole: log.beforeState?.role,
      afterRole: log.afterState?.role,
      statusChanged,
      afterIsActive: log.afterState?.isActive,
    };
  }, [log]);

  // JSON clipboard copy action
  const handleCopy = () => {
    if (!log) return;
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe early exit AFTER all hooks have executed:
  if (!open || !log || !targetInfo) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#070B14',
          backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(63, 208, 201, 0.08), transparent 70%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          color: '#ECEFF3',
          boxShadow: '0 30px 100px -20px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
          overflow: 'hidden',
        },
      }}
    >
      {/* 1. MODAL TITLE BAR (DOUBLE-BEZEL EMBEDDED HEADER) */}
      <DialogTitle
        sx={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          py: 2.25,
          px: 3.5,
          backgroundColor: 'transparent',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-aqua shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] shrink-0">
              <ShieldAlert className="w-5 h-5 text-aqua" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-white tracking-tight">
                  Audit Trail Event
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-aqua/10 text-aqua border border-aqua/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-aqua animate-pulse" />
                  <span>{log.action}</span>
                </span>
              </div>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                Recorded on {new Date(log.createdAt).toLocaleString()} &bull; IP: {log.ipAddress || '127.0.0.1'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-all flex items-center justify-center text-text-muted hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </DialogTitle>

      <DialogContent sx={{ p: 3.5, backgroundColor: 'transparent' }} className="space-y-4">
        {/* 2. ACTOR & ATTRIBUTED TARGET ENTITY CARDS (DOUBLE-BEZEL ARCHITECTURE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Actor (Authorized Staff) */}
          <div className="p-1 rounded-[20px] bg-white/[0.02] border border-white/[0.06]">
            <div className="p-3.5 rounded-[16px] bg-[#0A0F1D]/80 backdrop-blur-md h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-[0.15em] text-text-muted font-semibold">
                  Actor (Authorized Staff)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/[0.05] border border-white/[0.08] text-white/70">
                  {log.actorId?.role || 'Staff'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-bold text-xs text-white">
                  {(log.actorId?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-sm font-bold text-white truncate">
                    {log.actorId?.name || 'Automated System'}
                  </p>
                  <p className="text-xs text-text-muted font-mono truncate">
                    {log.actorId?.email || 'System Operation'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Target Entity */}
          <div className="p-1 rounded-[20px] bg-white/[0.02] border border-white/[0.06]">
            <div className="p-3.5 rounded-[16px] bg-[#0A0F1D]/80 backdrop-blur-md h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-[0.15em] text-text-muted font-semibold">
                  Target Entity
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border font-medium"
                  style={{
                    backgroundColor: targetInfo.badgeStyle.bg,
                    borderColor: targetInfo.badgeStyle.border,
                    color: targetInfo.badgeStyle.text,
                  }}
                >
                  {targetInfo.role || targetInfo.entityType}
                </span>
              </div>
              <div className="mt-2 truncate">
                <p className="text-sm font-bold text-white truncate">
                  {targetInfo.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <kbd className="font-mono text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] truncate">
                    ID: {targetInfo.id}
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. FLOATING ISLAND TAB CONTROLS */}
        <div className="flex items-center justify-between pt-1">
          <div className="p-1 rounded-full bg-white/[0.03] border border-white/[0.08] inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'summary'
                  ? 'bg-white/[0.12] text-white shadow-sm ring-1 ring-white/20'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Friendly Summary</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'json'
                  ? 'bg-white/[0.12] text-white shadow-sm ring-1 ring-white/20'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Developer JSON</span>
            </button>
          </div>

          {activeTab === 'json' && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-text-muted hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          )}
        </div>

        {/* 4. TAB 1: HUMAN-READABLE FRIENDLY SUMMARY VIEW */}
        {activeTab === 'summary' && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-150">
            {/* Event Narrative Header Banner */}
            <div className="p-3.5 rounded-[18px] bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-aqua/10 border border-aqua/20 flex items-center justify-center text-aqua shrink-0">
                <ShieldCheck className="w-4 h-4 text-aqua" />
              </div>
              <p className="text-xs text-white/90 leading-relaxed">
                <strong className="text-aqua font-semibold">Audit Overview:</strong>{' '}
                {paymentDetails ? (
                  <span>
                    <strong>{paymentDetails.receiverName}</strong> ({paymentDetails.receiverRole}) processed{' '}
                    <strong className="text-emerald-400 font-mono">
                      {paymentDetails.currency} {Number(paymentDetails.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>{' '}
                    ({paymentDetails.paymentMethod.toUpperCase()}) from{' '}
                    <strong className="text-white underline decoration-aqua/40 underline-offset-2">
                      {paymentDetails.guestName}
                    </strong>
                    {paymentDetails.bookingReference && (
                      <> for Reservation <strong className="font-mono text-aqua">{paymentDetails.bookingReference}</strong></>
                    )}.
                  </span>
                ) : log.action === 'staff:permission-update' ? (
                  `${log.actorId?.name || 'Administrator'} updated permissions and access matrix for ${targetInfo.role ? `target ${targetInfo.role} account` : 'staff member'} (${targetInfo.name}).`
                ) : (
                  `${log.actorId?.name || 'Authorized Staff'} performed action '${log.action}' on ${targetInfo.entityType}.`
                )}
              </p>
            </div>

            {/* A. Rich Payment Financial Breakdown (Double-Bezel Architecture) */}
            {paymentDetails && (
              <div className="space-y-3">
                {/* 1. Transaction Hero Card (Doppelrand) */}
                <div className="p-1.5 rounded-[24px] bg-gradient-to-r from-emerald-500/15 via-white/[0.02] to-aqua/15 border border-white/[0.1]">
                  <div className="p-5 rounded-[20px] bg-[#080D18]/95 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                        <DollarSign className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-[0.15em] text-text-muted block">
                          Settled Transaction Amount ({paymentDetails.currency})
                        </span>
                        <div className="text-3xl font-extrabold font-mono text-emerald-400 flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl text-emerald-500/70">{paymentDetails.currency === 'USD' ? '$' : paymentDetails.currency}</span>
                          <span>{Number(paymentDetails.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{paymentDetails.status}</span>
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase bg-white/[0.05] border border-white/[0.1] text-white">
                        {paymentDetails.paymentMethod}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-text-muted bg-white/[0.03] border border-white/[0.06]">
                        {log.action}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Side-by-side Payer vs Receiver Cards (Double-Bezel Architecture) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Payer Card (Guest / Customer) */}
                  <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                    <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                          <User className="w-3.5 h-3.5 text-aqua" />
                          <span>Paid By (Guest / Customer)</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-aqua/10 text-aqua border border-aqua/30 font-semibold uppercase">
                          Customer
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-aqua/10 border border-aqua/30 flex items-center justify-center font-bold text-sm text-aqua shrink-0">
                          {(paymentDetails.guestName || 'G').charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] text-text-muted uppercase font-mono block">Customer Full Name</span>
                          <p className="font-bold text-white text-sm truncate">{paymentDetails.guestName}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs">
                        {paymentDetails.guestPhone && (
                          <div className="flex items-center gap-2 text-text-muted">
                            <Phone className="w-3.5 h-3.5 text-aqua shrink-0" />
                            <span className="font-mono text-xs text-white/80">{paymentDetails.guestPhone}</span>
                          </div>
                        )}

                        {paymentDetails.guestEmail && (
                          <div className="flex items-center gap-2 text-text-muted">
                            <Mail className="w-3.5 h-3.5 text-aqua shrink-0" />
                            <span className="font-mono text-xs text-white/80 truncate">{paymentDetails.guestEmail}</span>
                          </div>
                        )}

                        {paymentDetails.guestId && (
                          <div className="pt-2 border-t border-white/[0.04]">
                            <kbd className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] block truncate">
                              Account ID: {String(paymentDetails.guestId)}
                            </kbd>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Receiver Card (Staff / Cashier) */}
                  <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                    <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                          <UserCheck className="w-3.5 h-3.5 text-gold" />
                          <span>Received By (Staff / Cashier)</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30 font-semibold uppercase">
                          Cashier
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center font-bold text-sm text-gold shrink-0">
                          {(paymentDetails.receiverName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] text-text-muted uppercase font-mono block">Staff Cashier Name</span>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm truncate">{paymentDetails.receiverName}</p>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-gold/10 border border-gold/30 text-gold font-semibold">
                              {paymentDetails.receiverRole}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs">
                        {paymentDetails.receiverEmail && (
                          <div className="flex items-center gap-2 text-text-muted">
                            <Mail className="w-3.5 h-3.5 text-gold shrink-0" />
                            <span className="font-mono text-xs text-white/80 truncate">{paymentDetails.receiverEmail}</span>
                          </div>
                        )}

                        {paymentDetails.receiverId && (
                          <div className="pt-2 border-t border-white/[0.04]">
                            <kbd className="font-mono text-[10px] text-text-muted px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] block truncate">
                              Staff ID: {String(paymentDetails.receiverId)}
                            </kbd>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Linked Reservation & POS Slip Metadata */}
                {(paymentDetails.bookingReference || paymentDetails.transactionReference || paymentDetails.notes) && (
                  <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                    <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-text-muted block">
                        Transaction References & Audit Proof
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {paymentDetails.bookingReference && (
                          <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl flex items-center gap-2.5">
                            <CalendarCheck className="w-4 h-4 text-aqua shrink-0" />
                            <div className="truncate">
                              <span className="text-[10px] uppercase font-mono text-text-muted block">Linked Reservation</span>
                              <span className="font-mono font-bold text-white text-xs">{paymentDetails.bookingReference}</span>
                            </div>
                          </div>
                        )}

                        {paymentDetails.transactionReference && (
                          <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl flex items-center gap-2.5">
                            <Receipt className="w-4 h-4 text-gold shrink-0" />
                            <div className="truncate">
                              <span className="text-[10px] uppercase font-mono text-text-muted block">POS Slip / Ref</span>
                              <span className="font-mono font-bold text-white text-xs">{paymentDetails.transactionReference}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {paymentDetails.notes && (
                        <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl">
                          <span className="text-[10px] uppercase font-mono text-text-muted block">Cashier / Staff Notes</span>
                          <p className="text-white/90 mt-0.5 text-xs italic font-serif">"{paymentDetails.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. Permission Diff Visual Breakdown */}
            {permissionDiff && (
              <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Detailed Access Modifications
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      {permissionDiff.unchangedCount} unchanged permission{permissionDiff.unchangedCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {permissionDiff.roleChanged && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
                      <span className="text-text-muted font-medium">Role Transition:</span>
                      <span className="font-mono text-rose-400 font-semibold">{permissionDiff.beforeRole}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                      <span className="font-mono text-emerald-400 font-semibold">{permissionDiff.afterRole}</span>
                    </div>
                  )}

                  {permissionDiff.added.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-400 mb-1.5 text-xs font-semibold">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Newly Granted Permissions (+{permissionDiff.added.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {permissionDiff.added.map((key) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{PERMISSION_LABEL_MAP[key] || key}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {permissionDiff.removed.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-rose-400 mb-1.5 text-xs font-semibold">
                        <Minus className="w-3.5 h-3.5" />
                        <span>Revoked Permissions (-{permissionDiff.removed.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {permissionDiff.removed.map((key) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium"
                          >
                            <Minus className="w-3 h-3" />
                            <span>{PERMISSION_LABEL_MAP[key] || key}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* C. Fallback Mutation Details */}
            {!paymentDetails && !permissionDiff && (
              <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
                    Mutation Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">Action Type</span>
                      <span className="font-semibold text-white font-mono mt-0.5 block">{log.action}</span>
                    </div>
                    <div className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">Target Entity</span>
                      <span className="font-semibold text-white mt-0.5 block">{targetInfo.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. TAB 2: DEVELOPER RAW IMMUTABLE JSON (MACOS WINDOW CHROME) */}
        {activeTab === 'json' && (
          <div className="rounded-[20px] border border-white/[0.08] bg-[#050811] overflow-hidden animate-in fade-in-50 duration-150 shadow-2xl">
            {/* macOS Window Top Chrome */}
            <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-xs text-text-muted">payload-snapshot.json</span>
              </div>
              <span className="text-[10px] font-mono text-text-muted uppercase">SHA256 Provenance</span>
            </div>

            <pre className="p-4 font-mono text-xs text-emerald-400/90 leading-relaxed overflow-x-auto max-h-80 selection:bg-aqua selection:text-black">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>

      {/* 6. MODAL FOOTER */}
      <DialogActions
        sx={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          px: 3.5,
          py: 2.25,
          backgroundColor: 'transparent',
          justifyContent: 'space-between',
        }}
      >
        <div className="flex items-center gap-2 text-text-muted text-xs font-mono">
          <Lock className="w-3.5 h-3.5 text-aqua/70" />
          <span>Tamper-Proof Audit Provenance Ledger</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-5 py-2 text-xs font-semibold text-white/90 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] transition-all active:scale-[0.98]"
        >
          Close Inspector
        </button>
      </DialogActions>
    </Dialog>
  );
};

export default AuditPayloadModal;
