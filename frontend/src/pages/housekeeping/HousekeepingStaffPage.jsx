import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Search,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Save,
  UserCheck,
} from 'lucide-react';
import { staffService } from '../../services/staff.service';

/**
 * ============================================================================
 * HOUSEKEEPING STAFF & PBAC DIRECTORY (WARM MINIMAL PLANNER)
 * ============================================================================
 * 
 * Unlocked when Housekeeping user has staff:manage.
 * Restyled with toggle-switch pattern in warm palette (--hk-bg, --hk-card, --border-soft).
 */
export const HousekeepingStaffPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await staffService.getStaff();
      const list = res?.staff || res?.data || [];
      setStaffList(list);
      if (list.length > 0 && !selectedStaff) {
        setSelectedStaff(list[0]);
        setPermissions(list[0].permissions || []);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve staff directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSelectStaff = (member) => {
    setSelectedStaff(member);
    setPermissions(member.permissions || []);
    setSuccessMsg('');
    setError(null);
  };

  const togglePermission = (permKey) => {
    setPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff) return;
    try {
      setSaving(true);
      setError(null);
      await staffService.updatePermissions(selectedStaff._id, {
        permissions,
      });
      setSuccessMsg(`Permissions updated successfully for ${selectedStaff.name}.`);
      fetchStaff();
    } catch (err) {
      console.error('Failed to update staff permissions:', err);
      setError(err?.response?.data?.message || 'Failed to update permissions.');
    } finally {
      setSaving(false);
    }
  };

  const permissionCategories = [
    {
      name: 'Housekeeping & Operations',
      perms: [
        { key: 'housekeeping:update', label: 'Housekeeping Cleanliness Updates' },
        { key: 'checkin:manage', label: 'Front Desk Check-In Authority' },
        { key: 'checkout:manage', label: 'Front Desk Check-Out Authority' },
      ],
    },
    {
      name: 'Bookings & Cancellations',
      perms: [
        { key: 'bookings:view', label: 'View All Reservations' },
        { key: 'bookings:cancel', label: 'Audit & Process Cancellations' },
        { key: 'payments:recordCash', label: 'Accept In-Person Cash Payments' },
        { key: 'payments:recordCard', label: 'Accept Offline POS Card Payments' },
      ],
    },
    {
      name: 'Facility & Administration',
      perms: [
        { key: 'rooms:view', label: 'View Room Inventory' },
        { key: 'rooms:update', label: 'Edit Room Specifications' },
        { key: 'analytics:view', label: 'View Managerial Analytics' },
        { key: 'audit:view', label: 'View Security Audit Logs' },
        { key: 'staff:manage', label: 'Manage Staff PBAC Access' },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4DFD0] pb-6">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#2B3A2A] uppercase font-bold flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-[#2B3A2A]" />
            <span>ROLE-BASED & PBAC GOVERNANCE</span>
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#2A2A28] mt-1">
            Staff & Permissions Matrix
          </h1>
          <p className="text-xs font-serif italic text-[#2A2A28]/70 mt-0.5">
            Fine-grained access rights management across operational and administrative domains.
          </p>
        </div>

        <button
          onClick={fetchStaff}
          className="self-start sm:self-auto inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-mono uppercase tracking-wider text-[#2A2A28] hover:bg-[#FAF8F2] shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Staff</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-[#B7CBA8]/30 border border-[#B7CBA8] rounded-2xl flex items-center space-x-3 text-xs text-[#2B3A2A]">
          <CheckCircle2 className="w-4 h-4 text-[#2B3A2A] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Two Column Layout: Staff List Left, Permission Matrix Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Staff Directory List */}
        <div className="bg-white border border-[#E4DFD0] rounded-3xl p-5 shadow-2xs space-y-4">
          <h3 className="font-serif font-bold text-base text-[#2A2A28]">Active Staff Directory</h3>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {staffList.map((member) => {
              const isSelected = selectedStaff?._id === member._id;
              return (
                <button
                  key={member._id}
                  onClick={() => handleSelectStaff(member)}
                  className={`w-full p-3 rounded-2xl text-left transition-all border cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#2B3A2A] bg-[#B7CBA8]/20 shadow-xs'
                      : 'border-[#E4DFD0] bg-[#FAF8F2]/60 hover:bg-[#FAF8F2]'
                  }`}
                >
                  <div>
                    <span className="font-serif font-bold text-sm text-[#2A2A28] block">
                      {member.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#2A2A28]/60 block">
                      {member.email}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-white border border-[#E4DFD0] text-[#2A2A28]">
                    {member.role}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Permission Matrix Editor */}
        <div className="lg:col-span-2 bg-white border border-[#E4DFD0] rounded-3xl p-6 shadow-2xs space-y-6">
          {selectedStaff ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DFD0] pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2A2A28]">
                    Permissions for {selectedStaff.name}
                  </h3>
                  <p className="text-xs font-mono text-[#2A2A28]/60">
                    Role: {selectedStaff.role} • {permissions.length} active permissions granted
                  </p>
                </div>

                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#2B3A2A] hover:bg-[#1F2B20] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-[#B7CBA8]" />
                  <span>{saving ? 'Saving Changes...' : 'Save Matrix'}</span>
                </button>
              </div>

              {/* Category Switches */}
              <div className="space-y-6">
                {permissionCategories.map((cat) => (
                  <div key={cat.name} className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[#2B3A2A] border-b border-[#E4DFD0]/60 pb-1">
                      {cat.name}
                    </h4>

                    <div className="space-y-2">
                      {cat.perms.map((perm) => {
                        const isGranted = permissions.includes(perm.key);
                        return (
                          <div
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            className="p-3 bg-[#FAF8F2] border border-[#E4DFD0] rounded-2xl flex items-center justify-between cursor-pointer hover:border-[#2B3A2A]/40 transition-colors"
                          >
                            <div>
                              <span className="text-xs font-sans font-medium text-[#2A2A28] block">
                                {perm.label}
                              </span>
                              <span className="text-[10px] font-mono text-[#2A2A28]/50 block">
                                {perm.key}
                              </span>
                            </div>

                            {/* Warm Toggle Switch */}
                            <div
                              className={`w-11 h-6 flex items-center rounded-full p-1 duration-200 cursor-pointer ${
                                isGranted ? 'bg-[#2B3A2A]' : 'bg-[#E4DFD0]'
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                                  isGranted ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs font-mono text-[#2A2A28]/60">
              Select a staff member from the left to view and modify PBAC privileges.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HousekeepingStaffPage;
