import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Image,
  DollarSign,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { PERMISSIONS } from '../../config/constants';
import { can } from '../../components/common/Can';

/**
 * ============================================================================
 * HOUSEKEEPING ROOMS MANAGEMENT (WARM MINIMAL PLANNER)
 * ============================================================================
 * 
 * Unlocked when Housekeeping user has rooms:view or room write permissions.
 * Consistent pastel badges:
 * - clean: --pastel-sage (#B7CBA8)
 * - dirty: --pastel-blush (#E3B7A8)
 * - cleaning: --pastel-mint (#BFDCC4)
 * - maintenance: --pastel-taupe (#D8CFC0)
 */
export const HousekeepingRoomsPage = () => {
  const user = useAuthStore((state) => state.user);

  const canCreate = can(user, PERMISSIONS.ROOMS_CREATE);
  const canUpdate = can(user, PERMISSIONS.ROOMS_UPDATE);
  const canDelete = can(user, PERMISSIONS.ROOMS_DELETE);
  const canPrice = can(user, PERMISSIONS.ROOMS_PRICE_UPDATE);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  // Edit / Create modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    type: 'deluxe',
    pricePerNight: '',
    capacity: 2,
    description: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getAdminRooms({ search: search || undefined });
      setRooms(res?.rooms || res || []);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setError(err?.response?.data?.message || 'Failed to load physical room inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData({
      roomNumber: '',
      type: 'deluxe',
      pricePerNight: '250',
      capacity: 2,
      description: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber || '',
      type: room.type || 'deluxe',
      pricePerNight: room.pricePerNight?.toString() || '0',
      capacity: room.capacity || 2,
      description: room.description || '',
      isActive: room.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingRoom) {
        await adminService.updateRoom(editingRoom._id, {
          pricePerNight: parseFloat(formData.pricePerNight),
          capacity: parseInt(formData.capacity, 10),
          type: formData.type,
          description: formData.description,
          isActive: formData.isActive,
        });
      } else {
        await adminService.createRoom({
          roomNumber: formData.roomNumber,
          pricePerNight: parseFloat(formData.pricePerNight),
          capacity: parseInt(formData.capacity, 10),
          type: formData.type,
          description: formData.description,
          isActive: formData.isActive,
        });
      }
      setModalOpen(false);
      fetchRooms();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to save room specification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, roomNumber) => {
    if (!window.confirm(`Are you sure you want to retire room #${roomNumber}?`)) return;
    try {
      await adminService.deleteRoom(id);
      fetchRooms();
    } catch (err) {
      alert(err?.response?.data?.message || 'Cannot delete room with active bookings.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'clean':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-[#B7CBA8]/30 text-[#2B3A2A] border border-[#B7CBA8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B7CBA8]" />
            <span>Clean</span>
          </span>
        );
      case 'dirty':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-[#E3B7A8]/30 text-[#2B3A2A] border border-[#E3B7A8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E3B7A8]" />
            <span>Dirty</span>
          </span>
        );
      case 'cleaning':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-[#BFDCC4]/40 text-[#2B3A2A] border border-[#BFDCC4]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BFDCC4]" />
            <span>Cleaning</span>
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-[#D8CFC0]/40 text-[#2A2A28] border border-[#D8CFC0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D8CFC0]" />
            <span>Maintenance</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-stone-100 text-stone-600">
            {status}
          </span>
        );
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.roomNumber || '').toString().includes(q) ||
      (r.type || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4DFD0] pb-6">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#2B3A2A] uppercase font-bold flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#2B3A2A]" />
            <span>FACILITY INVENTORY</span>
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#2A2A28] mt-1">
            Room Inventory Management
          </h1>
          <p className="text-xs font-serif italic text-[#2A2A28]/70 mt-0.5">
            Configure hotel suites, rates, guest capacity, and cleanliness readiness.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchRooms}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-mono uppercase tracking-wider text-[#2A2A28] hover:bg-[#FAF8F2] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-[#2B3A2A] hover:bg-[#1F2B20] text-white rounded-xl text-xs font-mono uppercase tracking-wider font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#B7CBA8]" />
              <span>New Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="w-full md:w-80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2A2A28]/40" />
          <input
            type="text"
            placeholder="Search room number or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-sans text-[#2A2A28] placeholder-[#2A2A28]/40 focus:outline-hidden focus:border-[#2B3A2A]"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-[#E4DFD0]">
          <div className="w-8 h-8 border-3 border-[#2B3A2A] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#2A2A28]/60">Loading room inventory...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const price = room.pricePerNight ?? 0;
            return (
              <div
                key={room._id}
                className="p-6 bg-white border border-[#E4DFD0] rounded-3xl shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-2xl font-bold text-[#2A2A28]">
                      #{room.roomNumber}
                    </span>
                    {getStatusBadge(room.housekeepingStatus)}
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-[#2A2A28]/70">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#2A2A28]/50">Category</span>
                      <strong className="capitalize text-[#2A2A28]">{room.type}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#2A2A28]/50">Capacity</span>
                      <span>{room.capacity} Guests</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#2A2A28]/50">Rate / Night</span>
                      <span className="font-mono font-bold text-sm text-[#C9A15A]">
                        ${Number(price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-[#E4DFD0]">
                  <span
                    className={`text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full ${
                      room.isActive ? 'bg-[#B7CBA8]/20 text-[#2B3A2A]' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {room.isActive ? 'Operational' : 'Retired'}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenEdit(room)}
                        className="p-2 text-[#2A2A28]/70 hover:text-[#2A2A28] hover:bg-[#FAF8F2] rounded-xl transition-colors cursor-pointer"
                        title="Edit Room"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(room._id, room.roomNumber)}
                        className="p-2 text-[#D97757]/70 hover:text-[#D97757] hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Room */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E4DFD0] rounded-3xl shadow-xl w-full max-w-md overflow-hidden text-[#2A2A28]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4DFD0] bg-[#FAF8F2]">
              <h3 className="font-serif text-lg font-bold">
                {editingRoom ? `Edit Room #${editingRoom.roomNumber}` : 'Create New Room'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#E4DFD0]/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingRoom && (
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#E4DFD0] rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#2B3A2A]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1">
                  Room Category
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3.5 py-2 border border-[#E4DFD0] rounded-xl text-xs font-sans focus:outline-hidden focus:border-[#2B3A2A]"
                >
                  <option value="deluxe">Deluxe Room</option>
                  <option value="suite">Executive Suite</option>
                  <option value="ocean-view">Ocean View Villa</option>
                  <option value="presidential">Presidential Suite</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1">
                    Price / Night ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={editingRoom && !canPrice}
                    value={formData.pricePerNight}
                    onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#E4DFD0] rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#2B3A2A] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#E4DFD0] rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#2B3A2A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase text-[#2A2A28]/70 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-[#E4DFD0] rounded-xl text-xs font-sans focus:outline-hidden focus:border-[#2B3A2A]"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[#2B3A2A] focus:ring-[#2B3A2A]"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-mono text-[#2A2A28]">
                  Active & Available for Booking Allotment
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E4DFD0]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase text-[#2A2A28]/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#2B3A2A] text-white rounded-xl text-xs font-mono uppercase font-bold tracking-wider hover:bg-[#1F2B20] transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HousekeepingRoomsPage;
