import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  MenuItem,
  TextField,
  Button,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  DollarSign,
  TrendingUp,
  Percent,
  BedDouble,
  Receipt,
  Calendar,
  RefreshCw,
  Award,
  Search,
  X,
  User,
  UserCheck,
  CalendarCheck,
  ShieldCheck,
  Clock,
  CreditCard,
  Eye,
  Check,
  Copy,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { AuditPayloadModal } from '../../components/admin/AuditPayloadModal';

export const AdminAnalyticsPage = () => {
  const [periodDays, setPeriodDays] = useState(30);
  const [revenueData, setRevenueData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment Transaction Search & Provenance State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const [revRes, occRes] = await Promise.all([
        adminService.getRevenueAnalytics({ from, to }),
        adminService.getOccupancyAnalytics({ date: to }),
      ]);

      setRevenueData(revRes);
      setOccupancyData(occRes);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err?.message || 'Failed to load executive analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [periodDays]);

  const handleSearchPayment = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchError('Please enter a Payment ID, Booking Reference, or POS Slip.');
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);
      setSearchResult(null);
      const res = await adminService.searchPayment(query);
      if (res?.payment) {
        setSearchResult(res);
      } else {
        setSearchError(`No payment transaction found matching "${query}".`);
      }
    } catch (err) {
      console.error('Payment search failed:', err);
      setSearchError(err?.response?.data?.message || err?.message || 'Failed to search payment transaction.');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResult(null);
    setSearchError(null);
  };

  const handleCopyPaymentId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const financials = revenueData?.financials || {
    totalRevenue: 0,
    totalRefunded: 0,
    netRevenue: 0,
    completedTransactions: 0,
  };

  const hospitality = revenueData?.hospitalityMetrics || {
    totalActiveRooms: 0,
    totalRoomsSold: 0,
    adr: 0,
    revPAR: 0,
  };

  const occupancy = occupancyData || {
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    occupancyRate: 0,
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      {/* Top Controls Bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 4,
          pb: 2,
          borderBottom: '1px solid #2A3547',
        }}
      >
        <div>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#ECEFF3' }}>
            Managerial Analytics & KPIs
          </Typography>
          <Typography variant="caption" sx={{ color: '#8791A3' }}>
            Authoritative revenue aggregation, RevPAR, and physical occupancy tracking
          </Typography>
        </div>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            select
            size="small"
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value={7}>Last 7 Days</MenuItem>
            <MenuItem value={30}>Last 30 Days</MenuItem>
            <MenuItem value={90}>Last 90 Days</MenuItem>
          </TextField>

          <Button
            variant="outlined"
            size="small"
            onClick={fetchAnalytics}
            startIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            sx={{
              color: '#3FD0C9',
              borderColor: 'rgba(63, 208, 201, 0.3)',
              '&:hover': { borderColor: '#3FD0C9', backgroundColor: 'rgba(63, 208, 201, 0.1)' },
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
          {error}
        </Alert>
      )}

      {loading && !revenueData ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress sx={{ color: '#3FD0C9' }} />
        </Box>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Collected Revenue */}
            <div className="p-4 rounded-xl bg-[#131A26] border border-[#2A3547] shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8791A3]">Total Gross Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-[#1B2433] border border-[#2A3547] flex items-center justify-center text-[#C9A15A]">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-white mt-2">
                ${financials.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-[#3ECF8E] font-medium block mt-1">
                {financials.completedTransactions} settled transactions
              </span>
            </div>

            {/* Net Revenue */}
            <div className="p-4 rounded-xl bg-[#131A26] border border-[#2A3547] shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8791A3]">Net Realized Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-[#1B2433] border border-[#2A3547] flex items-center justify-center text-[#3FD0C9]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-[#3FD0C9] mt-2">
                ${financials.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-[#8791A3] block mt-1">
                Refunds: ${financials.totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* ADR (Average Daily Rate) */}
            <div className="p-4 rounded-xl bg-[#131A26] border border-[#2A3547] shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8791A3]">Average Daily Rate (ADR)</span>
                <div className="w-8 h-8 rounded-lg bg-[#1B2433] border border-[#2A3547] flex items-center justify-center text-[#C9A15A]">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-[#C9A15A] mt-2">
                ${hospitality.adr.toFixed(2)}
              </p>
              <span className="text-[11px] text-[#8791A3] block mt-1">
                {hospitality.totalRoomsSold} room nights sold
              </span>
            </div>

            {/* RevPAR */}
            <div className="p-4 rounded-xl bg-[#131A26] border border-[#2A3547] shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8791A3]">RevPAR</span>
                <div className="w-8 h-8 rounded-lg bg-[#1B2433] border border-[#2A3547] flex items-center justify-center text-[#3FD0C9]">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-white mt-2">
                ${hospitality.revPAR.toFixed(2)}
              </p>
              <span className="text-[11px] text-[#8791A3] block mt-1">
                Across {hospitality.totalActiveRooms} active suites
              </span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Financial Breakdown Chart (2 Cols) */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-[#131A26] border border-[#2A3547] shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                    Revenue & Financial Aggregation
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#8791A3' }}>
                    Gross collections, refund deductions, and net yield
                  </Typography>
                </div>
              </div>

              <Box sx={{ width: '100%', height: 300 }}>
                <BarChart
                  xAxis={[
                    {
                      scaleType: 'band',
                      data: ['Gross Revenue', 'Refunded', 'Net Revenue'],
                      tickLabelStyle: { fill: '#8791A3', fontSize: 12 },
                    },
                  ]}
                  series={[
                    {
                      data: [financials.totalRevenue, financials.totalRefunded, financials.netRevenue],
                      color: '#C9A15A',
                    },
                  ]}
                  height={280}
                  slotProps={{
                    legend: { hidden: true },
                  }}
                  sx={{
                    '& .MuiChartsAxis-bottom .MuiChartsAxis-line': { stroke: '#2A3547' },
                    '& .MuiChartsAxis-bottom .MuiChartsAxis-tick': { stroke: '#2A3547' },
                    '& .MuiChartsAxis-left .MuiChartsAxis-line': { stroke: '#2A3547' },
                    '& .MuiChartsAxis-left .MuiChartsAxis-tick': { stroke: '#2A3547' },
                    '& .MuiChartsAxis-tickLabel': { fill: '#8791A3' },
                  }}
                />
              </Box>
            </div>

            {/* Live Occupancy Gauge & Breakdown (1 Col) */}
            <div className="p-6 rounded-xl bg-[#131A26] border border-[#2A3547] shadow-xl flex flex-col justify-between">
              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                  Live Daily Occupancy
                </Typography>
                <Typography variant="caption" sx={{ color: '#8791A3' }}>
                  Physical inventory utilization for today
                </Typography>

                <div className="my-6 text-center">
                  <div className="inline-flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold font-mono text-[#3FD0C9]">
                      {occupancy.occupancyRate}%
                    </span>
                  </div>
                  <p className="text-xs text-[#8791A3] mt-1 font-medium">Occupancy Rate</p>

                  {/* Progress Bar Gauge */}
                  <div className="w-full bg-[#1B2433] rounded-full h-3 mt-4 overflow-hidden p-0.5 border border-[#2A3547]">
                    <div
                      className="bg-gradient-to-r from-[#3FD0C9] to-[#C9A15A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, occupancy.occupancyRate))}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#1E293B]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8791A3]">Total Active Suites:</span>
                    <span className="font-bold text-white font-mono">{occupancy.totalRooms} Suites</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8791A3]">Occupied / Booked:</span>
                    <span className="font-bold text-[#3FD0C9] font-mono">{occupancy.occupiedRooms} Suites</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8791A3]">Ready / Available:</span>
                    <span className="font-bold text-[#3ECF8E] font-mono">{occupancy.availableRooms} Suites</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 bg-[#1B2433] border border-[#2A3547] rounded-lg text-center">
                <span className="text-[11px] text-[#8791A3]">Evaluation Target Date</span>
                <p className="text-xs font-mono font-semibold text-[#C9A15A] mt-0.5">{occupancy.date}</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAYMENT TRANSACTION & AUDIT PROVENANCE CONSOLE (DOUBLE-BEZEL LUXURY)     */}
          {/* ========================================================================= */}
          <div className="p-1 rounded-[26px] bg-white/[0.02] border border-white/[0.06]">
            <div className="p-6 rounded-[22px] bg-[#0A0F1D]/85 backdrop-blur-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-aqua shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] shrink-0">
                    <CreditCard className="w-5 h-5 text-aqua" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white tracking-tight">
                        Payment Transaction & Audit Provenance Console
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-aqua/10 text-aqua border border-aqua/20 font-semibold">
                        Financial Audit
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Search any transaction by Payment ID, Booking Ref (GH-XXXXX), or POS Slip to audit who paid, how much, and who received it
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Input Bar (Double-Bezel Input Container) */}
              <form onSubmit={handleSearchPayment} className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 p-1 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <TextField
                    fullWidth
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter Payment ID (e.g. 6745fa9...), Booking Ref (GH-49204), or POS Slip Ref..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search className="w-4 h-4 text-text-muted" />
                        </InputAdornment>
                      ),
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={handleClearSearch} sx={{ color: 'var(--text-muted)' }}>
                            <X className="w-3.5 h-3.5" />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        fontSize: '0.875rem',
                        color: '#ECEFF3',
                      },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(63, 208, 201, 0.3)' },
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-[#0A0F1A] bg-aqua hover:bg-aqua-hover transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(63,208,201,0.2)] shrink-0 self-stretch sm:self-auto"
                >
                  {searching ? (
                    <CircularProgress size={16} sx={{ color: '#0A0F1A' }} />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>{searching ? 'Searching...' : 'Search Payment'}</span>
                </button>
              </form>

              {/* Error Message */}
              {searchError && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                  <span className="font-semibold font-mono">[Notice]:</span>
                  <span>{searchError}</span>
                </div>
              )}

              {/* Search Results Display */}
              {searchResult?.payment && (
                <div className="space-y-4 pt-2">
                  {/* 1. Transaction Overview Banner (Doppelrand) */}
                  <div className="p-1 rounded-[22px] bg-gradient-to-r from-emerald-500/15 via-white/[0.02] to-aqua/15 border border-white/[0.1]">
                    <div className="p-5 rounded-[18px] bg-[#080D18]/95 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl font-bold font-mono text-emerald-400">
                              {searchResult.payment.currency === 'USD' ? '$' : searchResult.payment.currency}{' '}
                              {Number(searchResult.payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>{searchResult.payment.status}</span>
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono uppercase bg-white/[0.05] text-white/80 border border-white/[0.1]">
                              {searchResult.payment.paymentMethod}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <kbd className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                              ID: {searchResult.payment._id}
                            </kbd>
                            <button
                              type="button"
                              onClick={() => handleCopyPaymentId(searchResult.payment._id)}
                              className="text-[11px] text-aqua hover:underline flex items-center gap-1 font-mono transition-colors"
                            >
                              {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-xs text-text-muted font-mono space-y-0.5">
                        <div>Recorded: {new Date(searchResult.payment.createdAt).toLocaleString()}</div>
                        {searchResult.payment.transactionReference && (
                          <div className="text-gold">Ref: {searchResult.payment.transactionReference}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Three-Column Breakdown Grid: Payer, Receiver, Reservation (Double-Bezel) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Payer Card (Kisne Pay Ki) */}
                    <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                      <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-2 h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                              <User className="w-3.5 h-3.5 text-aqua" />
                              <span>Payer (Customer)</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-aqua/10 text-aqua border border-aqua/30 font-semibold uppercase">
                              Guest
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-aqua/10 border border-aqua/30 flex items-center justify-center font-bold text-xs text-aqua shrink-0">
                              {(searchResult.payment.userId?.name || searchResult.payment.bookingId?.guestInfo?.fullName || 'G').charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-white text-sm truncate">
                                {searchResult.payment.userId?.name || searchResult.payment.bookingId?.guestInfo?.fullName || 'Walk-in Guest'}
                              </p>
                              {searchResult.payment.userId?.phone && (
                                <p className="text-text-muted font-mono text-xs">{searchResult.payment.userId.phone}</p>
                              )}
                              {searchResult.payment.userId?.email && (
                                <p className="text-text-muted font-mono text-xs truncate">{searchResult.payment.userId.email}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.04]">
                          <kbd className="text-[10px] text-text-muted font-mono truncate block">
                            Guest ID: {searchResult.payment.userId?._id || String(searchResult.payment.userId)}
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Receiver Card (Kisne Receive Ki) */}
                    <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                      <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-2 h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                              <UserCheck className="w-3.5 h-3.5 text-gold" />
                              <span>Receiver (Staff Cashier)</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30 font-semibold uppercase">
                              Cashier
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center font-bold text-xs text-gold shrink-0">
                              {(searchResult.payment.receivedByStaffId?.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-white text-sm truncate">
                                  {searchResult.payment.receivedByStaffId?.name || 'Front Desk Staff'}
                                </p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-gold/10 text-gold border border-gold/30 font-semibold">
                                  {searchResult.payment.receivedByStaffId?.role || 'Staff'}
                                </span>
                              </div>
                              {searchResult.payment.receivedByStaffId?.email && (
                                <p className="text-text-muted font-mono text-xs truncate">
                                  {searchResult.payment.receivedByStaffId.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.04]">
                          <kbd className="text-[10px] text-text-muted font-mono truncate block">
                            Staff ID: {searchResult.payment.receivedByStaffId?._id || String(searchResult.payment.receivedByStaffId || 'System')}
                          </kbd>
                        </div>
                      </div>
                    </div>

                    {/* Reservation Card */}
                    <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                      <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-2 h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                              <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Linked Reservation</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold uppercase">
                              Stay
                            </span>
                          </div>
                          <div className="mt-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-aqua">
                                {searchResult.payment.bookingId?.bookingReference || 'N/A'}
                              </span>
                              {searchResult.payment.bookingId?.status && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                  {searchResult.payment.bookingId.status}
                                </span>
                              )}
                            </div>
                            {searchResult.payment.bookingId?.checkInDate && (
                              <p className="text-text-muted text-xs font-mono mt-1">
                                Stay: {searchResult.payment.bookingId.checkInDate} &rarr; {searchResult.payment.bookingId.checkOutDate}
                              </p>
                            )}
                            {searchResult.payment.bookingId?.roomIds?.length > 0 && (
                              <p className="text-text-muted text-xs mt-0.5">
                                Suites: {searchResult.payment.bookingId.roomIds.map((r) => r.roomNumber ? `#${r.roomNumber}` : String(r)).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.04]">
                          <kbd className="text-[10px] text-text-muted font-mono truncate block">
                            Booking ID: {searchResult.payment.bookingId?._id || 'N/A'}
                          </kbd>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Chronological Audit Provenance Timeline (Double-Bezel) */}
                  <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
                    <div className="p-4 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-aqua" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Immutable Security Audit Trail ({searchResult.timeline?.length || 0} Events)
                          </span>
                        </div>
                        <span className="text-[11px] text-text-muted font-mono">Tamper-Proof Audit Provenance</span>
                      </div>

                      {searchResult.timeline?.length > 0 ? (
                        <div className="space-y-2">
                          {searchResult.timeline.map((item) => (
                            <div
                              key={item._id}
                              className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-aqua/40 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-aqua/10 text-aqua border border-aqua/30">
                                    {item.action}
                                  </span>
                                  <span className="text-xs font-semibold text-white">
                                    By: {item.actorId?.name || 'System'} ({item.actorId?.role || 'authorized'})
                                  </span>
                                  <span className="text-[11px] font-mono text-text-muted">
                                    {new Date(item.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-text-muted">
                                  Entity: <strong className="text-white">{item.targetType}</strong>
                                  {item.ipAddress && <span className="ml-2 font-mono">IP: {item.ipAddress}</span>}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedAuditLog(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-aqua bg-aqua/10 hover:bg-aqua/20 border border-aqua/30 transition-all active:scale-[0.98] self-start sm:self-auto shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect Payload</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted italic py-2 text-center">
                          No additional audit logs recorded for this transaction reference.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Immutable Audit Log Event Payload Inspector Dialog */}
      <AuditPayloadModal
        open={Boolean(selectedAuditLog)}
        onClose={() => setSelectedAuditLog(null)}
        log={selectedAuditLog}
      />
    </Box>
  );
};

export default AdminAnalyticsPage;
