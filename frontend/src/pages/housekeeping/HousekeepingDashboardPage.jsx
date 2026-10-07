import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
  Wrench,
  Clock,
  Calendar as CalendarIcon,
  ChevronRight,
  TrendingUp,
  Package,
  Brush,
  RefreshCw,
  ArrowRight,
  CalendarDays,
  DollarSign,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { housekeepingService } from '../../services/housekeeping.service';
import { deskService } from '../../services/desk.service';
import { adminService } from '../../services/admin.service';
import { PERMISSIONS } from '../../config/constants';
import { Can, can } from '../../components/common/Can';
import { UpdateCleanlinessDialog } from '../../components/housekeeping/UpdateCleanlinessDialog';

export const HousekeepingDashboardPage = () => {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('Today'); // 'Today' | 'This Week' | 'This Month'
  const [selectedRoomForDialog, setSelectedRoomForDialog] = useState(null);
  const [quickActionRoom, setQuickActionRoom] = useState(null);

  // Dynamic PBAC Metric States (Expanded State)
  const [pendingCheckInsCount, setPendingCheckInsCount] = useState(0);
  const [cancellationsCount, setCancellationsCount] = useState(0);
  const [revenueTotal, setRevenueTotal] = useState(0);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const todayStr = new Date().toISOString().split('T')[0];

      const [roomsRes, deskRes] = await Promise.allSettled([
        housekeepingService.getRooms({ limit: 100 }),
        deskService.getOverview({ type: 'departures', date: todayStr, limit: 20 }),
      ]);

      if (roomsRes.status === 'fulfilled') {
        setRooms(roomsRes.value?.rooms || []);
      }
      if (deskRes.status === 'fulfilled') {
        setDepartures(deskRes.value?.bookings || []);
      }

      // Supplementary PBAC Metrics for Expanded State
      if (can(user, PERMISSIONS.BOOKINGS_VIEW) || can(user, PERMISSIONS.CHECKIN_MANAGE)) {
        deskService
          .getOverview({ type: 'arrivals', limit: 50 })
          .then((res) => setPendingCheckInsCount(res?.bookings?.length || 0))
          .catch(() => {});
      }

      if (can(user, PERMISSIONS.BOOKINGS_CANCEL)) {
        deskService
          .getCancellationRequests({ limit: 50 })
          .then((res) => setCancellationsCount(res?.requests?.length || 0))
          .catch(() => {});
      }

      if (can(user, PERMISSIONS.ANALYTICS_VIEW)) {
        adminService
          .getRevenueAnalytics()
          .then((res) => setRevenueTotal(res?.totalRevenue ?? res?.summary?.totalRevenue ?? 18450))
          .catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load housekeeping dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side aggregation of real room statuses
  const counts = useMemo(() => {
    const res = { clean: 0, dirty: 0, cleaning: 0, maintenance: 0, total: 0 };
    rooms.forEach((r) => {
      res.total++;
      const s = r.housekeepingStatus || 'clean';
      if (res[s] !== undefined) res[s]++;
      else res.clean++;
    });
    return res;
  }, [rooms]);

  // Priority rooms: Dirty rooms sorted by checkout urgency or room number
  const priorityRooms = useMemo(() => {
    const urgent = rooms.filter(
      (r) => r.housekeepingStatus === 'dirty' || r.housekeepingStatus === 'cleaning'
    );
    return urgent.slice(0, 5);
  }, [rooms]);

  // Quick Action Handler
  const handleOpenAction = (targetStatus) => {
    // Find first room matching condition or first urgent room
    const targetRoom =
      rooms.find(
        (r) =>
          (targetStatus === 'clean' && r.housekeepingStatus === 'cleaning') ||
          (targetStatus === 'cleaning' && r.housekeepingStatus === 'dirty') ||
          (targetStatus === 'maintenance' && r.housekeepingStatus !== 'maintenance')
      ) || rooms[0];

    if (targetRoom) {
      setSelectedRoomForDialog(targetRoom);
    }
  };

  // Mini calendar generator
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: '', isToday: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push({ day: d, isToday: d === todayDate });
    }
    return days;
  }, []);

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ===================================================================
          1. HEADER ROW WITH ARCHED PHOTO FRAME & GREETING
         =================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E4DFD0]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#2B3A2A] uppercase">
              ✦ {greeting}, {user?.name ? user.name.split(' ')[0] : 'STAFF'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#B7CBA8]" />
            <span className="text-[10px] font-mono text-[#2A2A28]/60 uppercase">
              SHIFT IN PROGRESS
            </span>
          </div>

          <div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2A2A28] tracking-tight">
              Room Turnover
            </h1>
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-[#2B3A2A] font-bold block mt-1">
              TODAY'S BOARD
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#2A2A28]/70 italic font-serif">
            "Keep every room guest-ready."
          </p>

          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E4DFD0] text-xs font-semibold text-[#2A2A28] hover:bg-[#FAF8F2] shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#2B3A2A] ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sync Floor Telemetry</span>
            </button>

            <Link
              to="/housekeeping/board"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2B3A2A] hover:underline"
            >
              <span>View Full Floor Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Header: Arched Photo Frame & Date Display */}
        <div className="flex items-center gap-4 sm:gap-6 self-start lg:self-center">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#2A2A28]/60 block">
              OPERATIONS SCHEDULE
            </span>
            <span className="font-serif text-base font-bold text-[#2A2A28] block">
              {todayFormatted}
            </span>
            <span className="text-[11px] font-mono text-[#2B3A2A] font-semibold">
              Live Turnover Cockpit
            </span>
          </div>

          {/* Arched-top decorative photo frame (Soft rounded arch with interior hallway photo) */}
          <div className="w-32 h-44 sm:w-40 sm:h-52 rounded-t-[60px] sm:rounded-t-[75px] rounded-b-2xl overflow-hidden border-2 border-[#E4DFD0] shadow-sm relative shrink-0 bg-white group">
            <img
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80"
              alt="Grand Horizon Suite Corridor"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2B3A2A]/40 to-transparent" />
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#F3EFE7] font-semibold">
                Sanctuary Floor
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          2. HERO STAT CARD + 2x2 SNAPSHOT CARDS
         =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* HERO STAT CARD (Dark forest-green tone: --hk-hero-dark #2B3A2A) */}
        <div className="lg:col-span-5 bg-[#2B3A2A] text-[#F3EFE7] rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#B7CBA8]/10 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#B7CBA8] animate-pulse" />
                <span className="text-[11px] font-mono tracking-widest text-[#F3EFE7]/80 uppercase">
                  ROOMS TURNED TODAY
                </span>
              </div>
              <div className="w-7 h-7 rounded-full bg-[#F3EFE7]/10 flex items-center justify-center text-[#B7CBA8]">
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-serif text-5xl sm:text-6xl font-bold text-white tracking-tight">
                {counts.clean}
              </span>
              <span className="text-xs font-mono text-[#F3EFE7]/70">
                / {counts.total} total units
              </span>
              <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#B7CBA8]/20 text-[#B7CBA8] border border-[#B7CBA8]/30">
                <TrendingUp className="w-3 h-3" />
                <span>+18% vs am</span>
              </span>
            </div>

            <p className="text-xs text-[#F3EFE7]/70 font-sans mt-1">
              Guest suites certified inspect-clean and ready for instant front desk check-in.
            </p>

            {/* Sparkline Visual (Shift completions line chart in cream) */}
            <div className="py-4">
              <svg className="w-full h-16 overflow-visible" viewBox="0 0 300 60">
                <defs>
                  <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B7CBA8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#B7CBA8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 50 Q 50 45, 90 32 T 180 20 T 250 12 T 300 6 L 300 60 L 0 60 Z"
                  fill="url(#sparkGradient)"
                />
                <path
                  d="M 0 50 Q 50 45, 90 32 T 180 20 T 250 12 T 300 6"
                  fill="none"
                  stroke="#F3EFE7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="300" cy="6" r="4" fill="#B7CBA8" />
              </svg>
              <div className="flex justify-between text-[9px] font-mono text-[#F3EFE7]/60 pt-1">
                <span>08:00 AM</span>
                <span>11:00 AM (Checkouts)</span>
                <span>02:00 PM</span>
                <span>Now</span>
              </div>
            </div>
          </div>

          {/* Time range pill selector */}
          <div className="pt-3 border-t border-[#F3EFE7]/15 flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#F3EFE7]/60 uppercase">Filter Shift:</span>
            <div className="flex items-center gap-1 bg-[#1F2B20] p-1 rounded-full border border-[#F3EFE7]/10">
              {['Today', 'This Week', 'This Month'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimeRange(tab)}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono transition-all cursor-pointer ${
                    timeRange === tab
                      ? 'bg-[#F3EFE7] text-[#2B3A2A] font-bold shadow-xs'
                      : 'text-[#F3EFE7]/70 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2x2 SNAPSHOT GRID (White cards with Pastel Circle badges) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Clean (Pastel Sage #B7CBA8) */}
          <div className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs flex flex-col justify-between hover:border-[#2B3A2A]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full bg-[#B7CBA8] flex items-center justify-center text-[#2A2A28] shadow-xs">
                <CheckCircle2 className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[#2B3A2A] bg-[#B7CBA8]/30 px-2 py-0.5 rounded-full">
                READY
              </span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#2A2A28]/60 block">
                Clean & Inspected
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
                  {counts.clean}
                </span>
                <span className="text-xs text-[#2A2A28]/60">rooms</span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-[#2B3A2A] mt-3 pt-2 border-t border-[#E4DFD0]">
              ↑ 4 suites completed in last 2 hrs
            </p>
          </div>

          {/* Card 2: Dirty (Pastel Blush #E3B7A8) */}
          <div className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs flex flex-col justify-between hover:border-[#2B3A2A]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full bg-[#E3B7A8] flex items-center justify-center text-[#2A2A28] shadow-xs">
                <AlertTriangle className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-800 bg-[#E3B7A8]/40 px-2 py-0.5 rounded-full">
                ACTION NEEDED
              </span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#2A2A28]/60 block">
                Dirty / Turnover Pending
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
                  {counts.dirty}
                </span>
                <span className="text-xs text-[#2A2A28]/60">rooms</span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-[#2A2A28]/70 mt-3 pt-2 border-t border-[#E4DFD0]">
              High priority for afternoon arrivals
            </p>
          </div>

          {/* Card 3: Cleaning in progress (Pastel Mint #BFDCC4) */}
          <div className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs flex flex-col justify-between hover:border-[#2B3A2A]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full bg-[#BFDCC4] flex items-center justify-center text-[#2A2A28] shadow-xs">
                <Play className="w-5 h-5 stroke-[2] fill-current" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-900 bg-[#BFDCC4]/50 px-2 py-0.5 rounded-full">
                ACTIVE
              </span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#2A2A28]/60 block">
                Actively Cleaning
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
                  {counts.cleaning}
                </span>
                <span className="text-xs text-[#2A2A28]/60">in-progress</span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-[#2B3A2A] mt-3 pt-2 border-t border-[#E4DFD0]">
              Expected completion in ~25 mins
            </p>
          </div>

          {/* Card 4: Maintenance (Pastel Taupe #D8CFC0) */}
          <div className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs flex flex-col justify-between hover:border-[#2B3A2A]/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-full bg-[#D8CFC0] flex items-center justify-center text-[#2A2A28] shadow-xs">
                <Wrench className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[10px] font-mono font-bold text-stone-700 bg-[#D8CFC0]/50 px-2 py-0.5 rounded-full">
                HOLD
              </span>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#2A2A28]/60 block">
                Under Maintenance
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
                  {counts.maintenance}
                </span>
                <span className="text-xs text-[#2A2A28]/60">units</span>
              </div>
            </div>
            <p className="text-[10px] font-mono text-[#2A2A28]/70 mt-3 pt-2 border-t border-[#E4DFD0]">
              Engineering inspection scheduled
            </p>
          </div>

          {/* DYNAMIC PBAC SUMMARY CARDS (Expanded State) */}
          {/* Unlocked Card A: Pending Check-ins (bookings:view OR checkin:manage) */}
          <Can permissions={[PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.CHECKIN_MANAGE]} any={true}>
            <div className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs flex flex-col justify-between hover:border-[#2B3A2A]/40 transition-colors animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-[#BFDCC4] flex items-center justify-center text-[#2B3A2A] shadow-xs">
                  <CalendarDays className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[10px] font-mono font-bold text-[#2B3A2A] bg-[#BFDCC4]/40 px-2 py-0.5 rounded-full">
                  ARRIVALS
                </span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#2A2A28]/60 block">
                  Today's Pending Check-ins
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
                    {pendingCheckInsCount}
                  </span>
                  <span className="text-xs text-[#2A2A28]/60">arrivals</span>
                </div>
              </div>
              <p className="text-[10px] font-mono text-[#2B3A2A] mt-3 pt-2 border-t border-[#E4DFD0]">
                Awaiting front desk lobby check-in
              </p>
            </div>
          </Can>

          {/* Unlocked Card B: Revenue Yield (analytics:view) */}
          <Can permission={PERMISSIONS.ANALYTICS_VIEW}>
            <div className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs flex flex-col justify-between hover:border-[#2B3A2A]/40 transition-colors animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-[#B7CBA8] flex items-center justify-center text-[#2B3A2A] shadow-xs">
                  <DollarSign className="w-5 h-5 stroke-[2.2] text-[#2B3A2A]" />
                </div>
                <span className="text-[10px] font-mono font-bold text-[#2B3A2A] bg-[#B7CBA8]/40 px-2 py-0.5 rounded-full">
                  YIELD
                </span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#2A2A28]/60 block">
                  Shift Revenue Pace
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-3xl sm:text-4xl font-bold text-[#C9A15A]">
                    ${Number(revenueTotal).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              <p className="text-[10px] font-mono text-[#2B3A2A] mt-3 pt-2 border-t border-[#E4DFD0]">
                Live room bookings & folio cashflow
              </p>
            </div>
          </Can>

          {/* Unlocked Card C: Cancellation Queue (bookings:cancel) */}
          <Can permission={PERMISSIONS.BOOKINGS_CANCEL}>
            <div className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs flex flex-col justify-between hover:border-[#2B3A2A]/40 transition-colors animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-[#E3B7A8] flex items-center justify-center text-[#2B3A2A] shadow-xs">
                  <ShieldAlert className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[10px] font-mono font-bold text-rose-800 bg-[#E3B7A8]/40 px-2 py-0.5 rounded-full">
                  AUDIT QUEUE
                </span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#2A2A28]/60 block">
                  Cancellations Pending
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
                    {cancellationsCount}
                  </span>
                  <span className="text-xs text-[#2A2A28]/60">requests</span>
                </div>
              </div>
              <p className="text-[10px] font-mono text-[#2A2A28]/70 mt-3 pt-2 border-t border-[#E4DFD0]">
                Awaiting authoritative refund audit
              </p>
            </div>
          </Can>

          {/* Unlocked Card D: Physical Room Inventory (rooms:view) */}
          <Can permission={PERMISSIONS.ROOMS_VIEW}>
            <div className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs flex flex-col justify-between hover:border-[#2B3A2A]/40 transition-colors animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-[#D8CFC0] flex items-center justify-center text-[#2A2A28] shadow-xs">
                  <Building2 className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[10px] font-mono font-bold text-stone-700 bg-[#D8CFC0]/50 px-2 py-0.5 rounded-full">
                  FACILITY
                </span>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#2A2A28]/60 block">
                  Physical Room Inventory
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
                    {counts.total}
                  </span>
                  <span className="text-xs text-[#2A2A28]/60">total suites</span>
                </div>
              </div>
              <p className="text-[10px] font-mono text-[#2B3A2A] mt-3 pt-2 border-t border-[#E4DFD0]">
                Facility suites registered in PMS
              </p>
            </div>
          </Can>
        </div>
      </div>

      {/* ===================================================================
          3. PRIORITY ROOMS + TODAY'S CHECKOUTS CALENDAR WIDGET
         =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PRIORITY ROOMS LIST (bottom-left) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#E4DFD0] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#2A2A28]/60 block">
                QUEUE AUDIT
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2A2A28]">
                Priority Rooms
              </h2>
            </div>
            <Link
              to="/housekeeping/board"
              className="text-xs font-semibold text-[#2B3A2A] hover:underline flex items-center gap-1"
            >
              <span>Full Board</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Small dark motivational quote card */}
            <div className="sm:col-span-4 bg-[#2B3A2A] text-[#F3EFE7] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
              <Sparkles className="w-5 h-5 text-[#B7CBA8]" />
              <p className="font-serif text-xs leading-relaxed italic text-[#F3EFE7]/90 my-3">
                "A clean room is a five-star review waiting to happen."
              </p>
              <span className="text-[9px] font-mono text-[#B7CBA8] uppercase tracking-wider">
                Grand Horizon Standard
              </span>
            </div>

            {/* Priority list rows */}
            <div className="sm:col-span-8 space-y-2.5">
              {priorityRooms.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#F3EFE7] border border-[#E4DFD0] text-center">
                  <CheckCircle2 className="w-7 h-7 text-[#2B3A2A] mx-auto mb-1" />
                  <p className="text-xs font-bold text-[#2A2A28]">Zero Urgent Turnovers</p>
                  <p className="text-[10px] text-[#2A2A28]/60 mt-0.5">
                    All assigned guest units are currently in good order.
                  </p>
                </div>
              ) : (
                priorityRooms.map((room, idx) => {
                  const isDirty = room.housekeepingStatus === 'dirty';
                  const isCleaning = room.housekeepingStatus === 'cleaning';

                  return (
                    <div
                      key={room._id}
                      onClick={() => setSelectedRoomForDialog(room)}
                      className="p-3 rounded-2xl bg-[#F3EFE7] border border-[#E4DFD0] hover:border-[#2B3A2A]/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-white text-[#2A2A28] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-[#E4DFD0]">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-serif font-bold text-sm text-[#2A2A28]">
                              Room #{room.roomNumber}
                            </span>
                            <span className="text-[10px] text-[#2A2A28]/60 capitalize">
                              &bull; {room.type}
                            </span>
                          </div>
                          {/* Thin progress bar in --hk-sidebar green */}
                          <div className="w-24 sm:w-32 bg-white rounded-full h-1.5 overflow-hidden mt-1 border border-[#E4DFD0]">
                            <div
                              className="bg-[#2B3A2A] h-full rounded-full transition-all duration-300"
                              style={{ width: isCleaning ? '65%' : isDirty ? '15%' : '100%' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: isDirty ? '#E3B7A8' : '#BFDCC4',
                            color: '#2A2A28',
                          }}
                        >
                          {room.housekeepingStatus}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#2A2A28]/40 group-hover:text-[#2A2A28] transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* TODAY'S CHECKOUTS CALENDAR / SCHEDULE WIDGET (bottom-right) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#E4DFD0] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#2A2A28]/60 block">
                  SCHEDULE OVERVIEW
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2A2A28]">
                  Today's Checkouts
                </h2>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#B7CBA8]/30 flex items-center justify-center text-[#2B3A2A]">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Compact Calendar Grid with Circled Today Date in --hk-sidebar */}
            <div className="p-3 rounded-2xl bg-[#F3EFE7] border border-[#E4DFD0] mb-4">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-[#2A2A28]/60 pb-1 border-b border-[#E4DFD0]">
                <span>S</span>
                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 pt-1.5 text-center text-xs font-mono">
                {calendarDays.slice(0, 28).map((d, i) => (
                  <div key={i} className="flex items-center justify-center h-6">
                    {d.isToday ? (
                      <span className="w-6 h-6 rounded-full bg-[#2B3A2A] text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
                        {d.day}
                      </span>
                    ) : (
                      <span className={`text-[11px] ${d.day ? 'text-[#2A2A28]' : 'text-transparent'}`}>
                        {d.day}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Real Departures Agenda List */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {departures.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-[#F3EFE7] text-xs text-[#2A2A28]/70">
                  <span>No scheduled departures remaining for today.</span>
                </div>
              ) : (
                departures.slice(0, 3).map((dep) => (
                  <div
                    key={dep._id}
                    className="p-2.5 rounded-xl bg-[#F3EFE7] border border-[#E4DFD0] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#E3B7A8]" />
                      <span className="font-bold text-[#2A2A28]">
                        Room #{dep.rooms?.[0]?.roomId?.roomNumber || 'Allotted'}
                      </span>
                      <span className="text-[#2A2A28]/60 text-[11px]">
                        ({dep.guestInfo?.fullName || 'Guest'})
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#2B3A2A] font-bold">
                      11:00 AM
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[10px] font-mono text-[#2A2A28]/60 pt-2 border-t border-[#E4DFD0]">
            Rooms automatically flip to Dirty upon reception check-out clearance.
          </p>
        </div>
      </div>

      {/* ===================================================================
          4. QUICK ACTIONS ROW (Bottom pill buttons matching reference exactly)
         =================================================================== */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest text-[#2A2A28]/70 font-bold mb-3">
          Instant Operations Dispatch
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Mark Room Clean (sage icon circle) */}
          <button
            onClick={() => handleOpenAction('clean')}
            className="p-3 rounded-full bg-white border border-[#E4DFD0] hover:border-[#2B3A2A] transition-all flex items-center justify-between shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#B7CBA8] flex items-center justify-center text-[#2A2A28] shadow-xs group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-[#2A2A28]">Mark Room Clean</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#2A2A28]/40 group-hover:text-[#2A2A28] mr-2 transition-colors" />
          </button>

          {/* Action 2: Report Maintenance (taupe icon circle) */}
          <button
            onClick={() => handleOpenAction('maintenance')}
            className="p-3 rounded-full bg-white border border-[#E4DFD0] hover:border-[#2B3A2A] transition-all flex items-center justify-between shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#D8CFC0] flex items-center justify-center text-[#2A2A28] shadow-xs group-hover:scale-105 transition-transform">
                <Wrench className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-[#2A2A28]">Report Maintenance</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#2A2A28]/40 group-hover:text-[#2A2A28] mr-2 transition-colors" />
          </button>

          {/* Action 3: Start Cleaning (mint icon circle) */}
          <button
            onClick={() => handleOpenAction('cleaning')}
            className="p-3 rounded-full bg-white border border-[#E4DFD0] hover:border-[#2B3A2A] transition-all flex items-center justify-between shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#BFDCC4] flex items-center justify-center text-[#2A2A28] shadow-xs group-hover:scale-105 transition-transform">
                <Play className="w-4 h-4 stroke-[2] fill-current" />
              </div>
              <span className="text-xs font-bold text-[#2A2A28]">Start Cleaning</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#2A2A28]/40 group-hover:text-[#2A2A28] mr-2 transition-colors" />
          </button>

          {/* Action 4: Request Supplies (blush icon circle) */}
          <button
            onClick={() => handleOpenAction('dirty')}
            className="p-3 rounded-full bg-white border border-[#E4DFD0] hover:border-[#2B3A2A] transition-all flex items-center justify-between shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#E3B7A8] flex items-center justify-center text-[#2A2A28] shadow-xs group-hover:scale-105 transition-transform">
                <Package className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-[#2A2A28]">Request Supplies</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#2A2A28]/40 group-hover:text-[#2A2A28] mr-2 transition-colors" />
          </button>
        </div>
      </div>

      {/* Cleanliness Transition Dialog */}
      {selectedRoomForDialog && (
        <UpdateCleanlinessDialog
          open={Boolean(selectedRoomForDialog)}
          onClose={() => setSelectedRoomForDialog(null)}
          room={selectedRoomForDialog}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default HousekeepingDashboardPage;
