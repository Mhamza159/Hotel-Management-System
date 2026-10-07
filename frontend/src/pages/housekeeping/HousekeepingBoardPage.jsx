import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  Wrench,
  BedDouble,
  SlidersHorizontal,
  MoreVertical,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { housekeepingService } from '../../services/housekeeping.service';
import { UpdateCleanlinessDialog } from '../../components/housekeeping/UpdateCleanlinessDialog';

const STATUS_CONFIG = {
  clean: {
    label: 'Clean',
    circleBg: '#B7CBA8', // --pastel-sage
    text: '#2A2A28',
    icon: CheckCircle2,
    nextAction: 'dirty',
    nextLabel: 'Set Dirty',
  },
  dirty: {
    label: 'Dirty',
    circleBg: '#E3B7A8', // --pastel-blush
    text: '#2A2A28',
    icon: AlertTriangle,
    nextAction: 'cleaning',
    nextLabel: 'Start Clean',
  },
  cleaning: {
    label: 'Cleaning',
    circleBg: '#BFDCC4', // --pastel-mint
    text: '#2A2A28',
    icon: Play,
    nextAction: 'clean',
    nextLabel: 'Mark Clean',
  },
  maintenance: {
    label: 'Maintenance',
    circleBg: '#D8CFC0', // --pastel-taupe
    text: '#2A2A28',
    icon: Wrench,
    nextAction: 'dirty',
    nextLabel: 'Release',
  },
};

export const HousekeepingBoardPage = () => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'clean' | 'dirty' | 'cleaning' | 'maintenance'
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickActionId, setQuickActionId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [alertInfo, setAlertInfo] = useState(null);

  // Dialog State
  const [selectedRoomForDialog, setSelectedRoomForDialog] = useState(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await housekeepingService.getRooms({ limit: 100 });
      setRooms(res?.rooms || []);
    } catch (err) {
      console.error('Failed to load housekeeping rooms:', err);
      setAlertInfo({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to fetch rooms.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Derived counts
  const counts = useMemo(() => {
    const res = { all: rooms.length, clean: 0, dirty: 0, cleaning: 0, maintenance: 0 };
    rooms.forEach((r) => {
      const s = r.housekeepingStatus || 'clean';
      if (res[s] !== undefined) res[s]++;
      else res.clean++;
    });
    return res;
  }, [rooms]);

  // Unique floors
  const floors = useMemo(() => {
    const set = new Set();
    rooms.forEach((r) => {
      if (r.floor !== undefined && r.floor !== null) set.add(r.floor);
      else if (r.roomNumber) {
        // Fallback: extract floor from room number (e.g. 101 -> Floor 1)
        const fl = String(r.roomNumber)[0];
        set.add(Number(fl) || 1);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  // Quick 1-click status advance
  const handleQuickAdvance = async (room, nextStatus) => {
    try {
      setQuickActionId(room._id);
      setAlertInfo(null);
      await housekeepingService.updateStatus(room._id, { housekeepingStatus: nextStatus });
      setAlertInfo({
        type: 'success',
        message: `Room #${room.roomNumber} updated to '${nextStatus}'.`,
      });
      fetchRooms();
    } catch (err) {
      console.error('Quick advance failed:', err);
      setAlertInfo({
        type: 'error',
        message: err?.response?.data?.message || 'Status transition failed.',
      });
    } finally {
      setQuickActionId(null);
    }
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesStatus =
        activeTab === 'all' ? true : (r.housekeepingStatus || 'clean') === activeTab;

      const roomFloor =
        r.floor !== undefined && r.floor !== null
          ? r.floor
          : Number(String(r.roomNumber)[0]) || 1;

      const matchesFloor =
        selectedFloor === 'all' ? true : String(roomFloor) === String(selectedFloor);

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery = q
        ? String(r.roomNumber).includes(q) || (r.type || '').toLowerCase().includes(q)
        : true;

      return matchesStatus && matchesFloor && matchesQuery;
    });
  }, [rooms, activeTab, selectedFloor, searchQuery]);

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ===================================================================
          HEADER & ACTIONS
         =================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4DFD0]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#2B3A2A] font-bold block mb-1">
            ✦ ROOM INVENTORY TURNOVER
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2A28]">
            Room Status Board
          </h1>
          <p className="text-xs text-[#2A2A28]/70 mt-1">
            Real-time floor cleanliness status and one-tap housekeeping transitions
          </p>
        </div>

        <button
          onClick={fetchRooms}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E4DFD0] text-xs font-semibold text-[#2A2A28] hover:bg-[#FAF8F2] transition-colors self-start sm:self-center cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#2B3A2A] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Board</span>
        </button>
      </div>

      {/* Alert Notification */}
      {alertInfo && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            alertInfo.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{alertInfo.message}</span>
          <button
            onClick={() => setAlertInfo(null)}
            className="text-xs font-bold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ===================================================================
          SEGMENT / FILTER PILL TABS + SEARCH ROW
         =================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Pill Tabs for Statuses */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Units', count: counts.all, dot: null },
            { id: 'clean', label: 'Clean', count: counts.clean, dot: '#B7CBA8' },
            { id: 'dirty', label: 'Dirty', count: counts.dirty, dot: '#E3B7A8' },
            { id: 'cleaning', label: 'Cleaning', count: counts.cleaning, dot: '#BFDCC4' },
            { id: 'maintenance', label: 'Maintenance', count: counts.maintenance, dot: '#D8CFC0' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-mono transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#2B3A2A] text-[#F3EFE7] font-bold shadow-xs'
                    : 'bg-white border border-[#E4DFD0] text-[#2A2A28] hover:border-[#2B3A2A]/40'
                }`}
              >
                {tab.dot && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tab.dot }}
                  />
                )}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-[#FAF8F2]/20 text-white' : 'bg-[#F3EFE7] text-[#2A2A28]/70'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Floor Select */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#2A2A28]/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room # or suite..."
              className="w-full pl-9 pr-3 py-2 rounded-full bg-white border border-[#E4DFD0] text-xs text-[#2A2A28] placeholder-[#2A2A28]/40 focus:outline-none focus:border-[#2B3A2A] transition-colors shadow-xs"
            />
          </div>

          {floors.length > 1 && (
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-3 py-2 rounded-full bg-white border border-[#E4DFD0] text-xs text-[#2A2A28] focus:outline-none focus:border-[#2B3A2A] transition-colors shadow-xs cursor-pointer"
            >
              <option value="all">All Floors</option>
              {floors.map((fl) => (
                <option key={fl} value={fl}>
                  Floor {fl}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ===================================================================
          ROOM CARDS GRID
         =================================================================== */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-[#2B3A2A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#2A2A28]/70 font-mono">Synchronizing room cleanliness matrix...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        /* Empty / Filtered-Empty State (Directive copy in --text-dark, no stock illustrations) */
        <div className="p-12 text-center rounded-3xl bg-white border border-[#E4DFD0] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[#F3EFE7] border border-[#E4DFD0] flex items-center justify-center text-[#2B3A2A] mx-auto">
            <BedDouble className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-[#2A2A28]">
            No rooms match the selected criteria
          </h3>
          <p className="text-xs text-[#2A2A28]/70 max-w-sm mx-auto">
            Try adjusting your status filter or clearing your search query to inspect other guest suites.
          </p>
          {(activeTab !== 'all' || searchQuery || selectedFloor !== 'all') && (
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setSelectedFloor('all');
              }}
              className="px-4 py-1.5 rounded-full bg-[#2B3A2A] text-[#F3EFE7] text-xs font-semibold hover:bg-[#1F2B20] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const statusKey = room.housekeepingStatus || 'clean';
            const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.clean;
            const Icon = cfg.icon;
            const isActing = quickActionId === room._id;

            return (
              <div
                key={room._id}
                className="p-5 rounded-3xl bg-white border border-[#E4DFD0] shadow-xs hover:border-[#2B3A2A]/40 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header: Room Number + Pastel Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#2A2A28]/50 block">
                      Suite {room.type}
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-[#2A2A28] tracking-tight">
                      Room #{room.roomNumber}
                    </h3>
                  </div>

                  {/* Pastel Status Badge (Circular icon background only) */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3EFE7] border border-[#E4DFD0]">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cfg.circleBg }}
                    >
                      <Icon className="w-2.5 h-2.5 text-[#2A2A28]" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#2A2A28] uppercase tracking-wider">
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Middle: Details & Notes */}
                <div className="space-y-1.5 text-xs text-[#2A2A28]/70">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#2A2A28]/50">Floor Level:</span>
                    <span className="font-mono font-semibold text-[#2A2A28]">
                      Floor {room.floor || String(room.roomNumber)[0] || 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#2A2A28]/50">Occupancy:</span>
                    <span className="font-mono font-semibold text-[#2A2A28] capitalize">
                      {room.isOccupied ? 'Occupied' : 'Vacant'}
                    </span>
                  </div>
                  {room.notes && (
                    <p className="text-[10px] italic text-[#2A2A28]/60 bg-[#F3EFE7] p-2 rounded-xl border border-[#E4DFD0]/60 line-clamp-2">
                      "{room.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Controls: Single-tap status change + Dialog trigger */}
                <div className="pt-3 border-t border-[#E4DFD0] flex items-center justify-between gap-2">
                  {/* Single-tap fast advance button */}
                  <button
                    onClick={() => handleQuickAdvance(room, cfg.nextAction)}
                    disabled={isActing}
                    className="flex-1 py-2 px-3 rounded-full bg-[#2B3A2A] hover:bg-[#1F2B20] text-[#F3EFE7] text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isActing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>{cfg.nextLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>

                  {/* Open custom status dialog button */}
                  <button
                    onClick={() => setSelectedRoomForDialog(room)}
                    title="Change status or add shift notes"
                    className="p-2 rounded-full bg-white border border-[#E4DFD0] hover:border-[#2B3A2A] text-[#2A2A28] transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cleanliness Transition Dialog */}
      {selectedRoomForDialog && (
        <UpdateCleanlinessDialog
          open={Boolean(selectedRoomForDialog)}
          onClose={() => setSelectedRoomForDialog(null)}
          room={selectedRoomForDialog}
          onSuccess={() => {
            fetchRooms();
          }}
        />
      )}
    </div>
  );
};

export default HousekeepingBoardPage;
