import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Switch,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ShieldCheck,
  RotateCcw,
  Check,
  CalendarCheck,
  ConciergeBell,
  DollarSign,
  BedDouble,
  BarChart3,
  ArrowLeft,
  AlertCircle,
  Save,
  Undo2,
} from 'lucide-react';
import { staffService } from '../../services/staff.service';
import { useAuthStore } from '../../stores/useAuthStore';
import { PbacConfirmModal } from '../../components/admin/PbacConfirmModal';

/**
 * ============================================================================
 * PBAC PERMISSION MATRIX WITH BATCH SAVE & CONFIRMATION MODAL
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh component Super Admin ko staff permissions configure karne ka interface deta hai:
 * 1. Local Draft State (`draftPermissions`): Switches ko toggle karne par foran
 *    network call nahi jati, balkay state locally update hoti hai taake race conditions
 *    aur excessive API hits na hon.
 * 2. Visual Diffing Engine (`useMemo`): Automatically calculate karta hai ke kaunsi
 *    permissions nayi add hui hain (`addedPermissions`) aur kaunsi revoke hui hain (`removedPermissions`).
 * 3. Sticky Action Bar: Screen ke bottom par floating dock appear hota hai jisme
 *    unsaved changes ka counter, Discard button, aur Save button mojood hai.
 * 4. Confirmation Modal (`PbacConfirmModal`): Save button dabane par modal pop up
 *    karta hai jo green aur red pill badges mein diff breakdown dikhata hai.
 * 5. Loader & Atomic Save: "Confirm & Apply" dabane par animated spinner loader chalega
 *    aur single atomic PATCH call se MongoDB update ho jayegi.
 * 
 * [ENGLISH EXPLANATION]:
 * High-performance PBAC Permission Matrix featuring decoupled in-memory drafting,
 * sticky bottom save bar, visual diffing, transactional confirmation modal, and
 * asynchronous batch execution with animated loading state.
 */
export const StaffPbacMatrixPage = () => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const currentAuthUser = useAuthStore((state) => state.user);

  // Authoritative server state
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  // In-Memory Draft & Modal State
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Grouped Permission Taxonomy
  const categories = useMemo(
    () => [
      {
        id: 'bookings',
        title: 'Reservations & Bookings',
        icon: CalendarCheck,
        permissions: [
          { key: 'bookings:view', label: 'View All Bookings', desc: 'Browse guest bookings and stay details' },
          { key: 'bookings:create', label: 'Create Reservations', desc: 'Create own online reservations (walk-ins use Guest Check-In)' },
          { key: 'bookings:confirm', label: 'Confirm Reservations', desc: 'Finalize and approve pending bookings' },
          { key: 'bookings:cancel', label: 'Audit & Process Cancellations', desc: 'Approve or reject guest cancellation requests' },
        ],
      },
      {
        id: 'desk',
        title: 'Front Desk & Cleanliness',
        icon: ConciergeBell,
        permissions: [
          { key: 'checkin:manage', label: 'Guest Check-In', desc: 'Perform physical check-in, issue room keys, and register walk-in guests' },
          { key: 'checkout:manage', label: 'Guest Check-Out', desc: 'Perform check-out and flag rooms as dirty' },
          { key: 'housekeeping:update', label: 'Housekeeping Cleanliness Board', desc: 'Transition room cleanliness (clean, dirty, cleaning)' },
        ],
      },
      {
        id: 'payments',
        title: 'Payments & Financial Audits',
        icon: DollarSign,
        permissions: [
          { key: 'payments:recordCash', label: 'Record Cash Payments', desc: 'Attributed intake of physical cash at front desk drawer' },
          { key: 'payments:recordCard', label: 'Record POS Card Slips', desc: 'Attributed intake of offline credit/debit card slips' },
          { key: 'payments:refund', label: 'Authoritative Refunds', desc: 'Execute authoritative refund reversals' },
        ],
      },
      {
        id: 'rooms',
        title: 'Physical Room Inventory',
        icon: BedDouble,
        permissions: [
          { key: 'rooms:view', label: 'View Room Inventory', desc: 'Browse room catalogue and specifications' },
          { key: 'rooms:create', label: 'Define New Rooms', desc: 'Create physical room numbers and suites' },
          { key: 'rooms:update', label: 'Edit Room Specs', desc: 'Modify room descriptions and amenities' },
          { key: 'rooms:delete', label: 'Deactivate / Soft-Delete Rooms', desc: 'Archive rooms from active hotel inventory' },
          { key: 'rooms:priceUpdate', label: 'Adjust Room Pricing', desc: 'Change nightly rates on rooms' },
        ],
      },
      {
        id: 'oversight',
        title: 'Managerial Intelligence & Security',
        icon: BarChart3,
        permissions: [
          { key: 'analytics:view', label: 'View Revenue & Occupancy Charts', desc: 'Access high-level management financial metrics' },
          { key: 'audit:view', label: 'Security Audit Trail', desc: 'Inspect immutable system event audit logs' },
          { key: 'staff:manage', label: 'Manage Staff & Roles', desc: 'Create accounts and modify PBAC matrix' },
          { key: 'coupons:manage', label: 'Manage Promotion Codes', desc: 'Configure discounts and promo campaigns' },
          { key: 'waitlist:manage', label: 'Manage Room Waitlists', desc: 'Inspect waitlist requests for sold-out dates' },
        ],
      },
    ],
    []
  );

  // Flat lookup map of key -> label for clean modal diff rendering
  const permissionLabels = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      cat.permissions.forEach((p) => {
        map[p.key] = `${p.label} (${p.key})`;
      });
    });
    return map;
  }, [categories]);

  // Initial Load: Fetch Staff + Permissions Taxonomy
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [staffRes, metaRes] = await Promise.all([
          staffService.getStaff(),
          staffService.getPermissionsMetadata(),
        ]);

        const list = staffRes?.staff || [];
        setStaffList(list);
        setMetadata(metaRes);

        // Determine currently active staff member
        let activeMember = null;
        if (paramId) {
          activeMember = list.find((s) => s._id === paramId);
        }
        if (!activeMember && list.length > 0) {
          activeMember = list[0];
        }

        setSelectedStaff(activeMember);
        // Initialize draft permissions from database state
        setDraftPermissions(activeMember?.permissions || []);
      } catch (err) {
        console.error('Failed to initialize PBAC matrix:', err);
        setAlertInfo({
          severity: 'error',
          message: 'Unable to load staff directory and permission taxonomy.',
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [paramId]);

  // Diffing Engine: Compute added, removed, and dirty state
  const { addedPermissions, removedPermissions, hasUnsavedChanges } = useMemo(() => {
    if (!selectedStaff) {
      return { addedPermissions: [], removedPermissions: [], hasUnsavedChanges: false };
    }

    const savedSet = new Set(selectedStaff.permissions || []);
    const draftSet = new Set(draftPermissions || []);

    const added = [...draftSet].filter((p) => !savedSet.has(p));
    const removed = [...savedSet].filter((p) => !draftSet.has(p));
    const isDirty = added.length > 0 || removed.length > 0;

    return {
      addedPermissions: added,
      removedPermissions: removed,
      hasUnsavedChanges: isDirty,
    };
  }, [selectedStaff, draftPermissions]);

  // Handle Staff Selection from Left Panel with Unsaved Guard
  const handleSelectStaff = (member) => {
    if (selectedStaff?._id === member._id) return;

    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        `You have unsaved permission changes for ${selectedStaff.name}. Discard changes and switch to ${member.name}?`
      );
      if (!confirmLeave) return;
    }

    setSelectedStaff(member);
    setDraftPermissions(member.permissions || []);
    navigate(`/admin/staff/${member._id}/pbac`, { replace: true });
    setAlertInfo(null);
  };

  // Toggle Single Permission in Local Draft (Zero Network Calls)
  const handleTogglePermission = (permKey) => {
    if (!selectedStaff) return;
    if (selectedStaff.role === 'super-admin') {
      setAlertInfo({
        severity: 'info',
        message: 'Super-Admin has implicit system-wide bypass for all permissions.',
      });
      return;
    }

    setDraftPermissions((prev) => {
      const exists = prev.includes(permKey);
      if (exists) {
        return prev.filter((k) => k !== permKey);
      } else {
        return [...prev, permKey];
      }
    });
  };

  // Discard In-Memory Draft Changes
  const handleDiscardChanges = () => {
    if (!selectedStaff) return;
    setDraftPermissions(selectedStaff.permissions || []);
    setAlertInfo({
      severity: 'info',
      message: 'Draft permission changes discarded. Reverted to saved database state.',
    });
  };

  // Open Confirmation Modal
  const handleOpenConfirmModal = () => {
    if (!hasUnsavedChanges) return;
    setSaveError(null);
    setIsConfirmModalOpen(true);
  };

  // Atomic Batch Save Execution Handler
  const handleConfirmSave = async () => {
    if (!selectedStaff) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      // Single atomic PATCH request to update role & permissions
      const res = await staffService.updatePermissions(selectedStaff._id, {
        role: selectedStaff.role,
        permissions: draftPermissions,
      });

      const updatedUser = res?.user || { ...selectedStaff, permissions: draftPermissions };

      // 1. Update authoritative state
      setSelectedStaff(updatedUser);
      setDraftPermissions(updatedUser.permissions || []);
      setStaffList((prev) => prev.map((s) => (s._id === updatedUser._id ? updatedUser : s)));

      // 2. Synchronize active session if current logged-in user was modified
      if (currentAuthUser?._id === updatedUser._id) {
        useAuthStore.getState().updateUser(updatedUser);
      }

      // 3. Close modal & display success alert
      setIsConfirmModalOpen(false);
      setAlertInfo({
        severity: 'success',
        message: `Permissions successfully saved and applied for ${updatedUser.name} (${updatedUser.role}).`,
      });
    } catch (err) {
      console.error('Failed to save permissions batch:', err);
      setSaveError(err?.response?.data?.message || err?.message || 'Failed to save permissions to database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Role on the Fly
  const handleRoleChange = async (newRole) => {
    if (!selectedStaff || selectedStaff.role === newRole) return;

    try {
      setRoleUpdating(true);
      setAlertInfo(null);

      // Template default permissions for new role
      const defaultPerms = metadata?.roleDefaultPermissions?.[newRole] || selectedStaff.permissions || [];

      const res = await staffService.updatePermissions(selectedStaff._id, {
        role: newRole,
        permissions: defaultPerms,
      });

      const updatedUser = res?.user || { ...selectedStaff, role: newRole, permissions: defaultPerms };
      setSelectedStaff(updatedUser);
      setDraftPermissions(updatedUser.permissions || []);
      setStaffList((prev) => prev.map((s) => (s._id === updatedUser._id ? updatedUser : s)));
      setAlertInfo({
        severity: 'success',
        message: `Role changed to '${newRole}' and permissions synced to default template.`,
      });
    } catch (err) {
      console.error('Failed to update role:', err);
      setAlertInfo({
        severity: 'error',
        message: err?.response?.data?.message || 'Failed to update staff role.',
      });
    } finally {
      setRoleUpdating(false);
    }
  };

  // Reset to Role Defaults in Draft
  const handleResetToDefaults = () => {
    if (!selectedStaff) return;
    const defaults = metadata?.roleDefaultPermissions?.[selectedStaff.role] || [];
    setDraftPermissions(defaults);
    setAlertInfo({
      severity: 'info',
      message: `Permissions reset to default template for role '${selectedStaff.role}'. Click 'Save Permissions' to apply.`,
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12, gap: 1.5 }}>
        <CircularProgress size={40} sx={{ color: 'var(--aqua)' }} />
        <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
          Loading staff directory and PBAC taxonomy...
        </Typography>
      </Box>
    );
  }

  const isSelectedSuper = selectedStaff?.role === 'super-admin';
  const totalDeltas = addedPermissions.length + removedPermissions.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: hasUnsavedChanges ? 12 : 3 }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/admin/staff')}
            startIcon={<ArrowLeft className="w-4 h-4" />}
            sx={{
              borderColor: 'var(--border)',
              color: 'var(--text)',
              height: 34,
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { borderColor: 'var(--text-muted)', backgroundColor: 'var(--surface-2)' },
            }}
          >
            Staff Directory
          </Button>
          <div>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.25rem' }}>
              Granular PBAC Permission Matrix
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
              Configure and batch-save fine-grained module access for hotel staff
            </Typography>
          </div>
        </Box>
      </Box>

      {/* Alert Banner */}
      {alertInfo && (
        <Alert
          severity={alertInfo.severity}
          onClose={() => setAlertInfo(null)}
          sx={{ borderRadius: '10px' }}
        >
          {alertInfo.message}
        </Alert>
      )}

      {/* Split-View Cockpit */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        {/* Left Panel: Staff List */}
        <Paper
          sx={{
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'var(--surface)',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)' }}>
            <Typography variant="caption" sx={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Select Staff Member ({staffList.length})
            </Typography>
          </Box>

          <Box sx={{ maxHeight: 650, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {staffList.map((member) => {
              const isSelected = selectedStaff?._id === member._id;
              const isSuper = member.role === 'super-admin';
              const roleBadgeColor = isSuper ? '#C9A15A' : member.role === 'receptionist' ? '#3FD0C9' : '#3ECF8E';

              return (
                <Box
                  key={member._id}
                  onClick={() => handleSelectStaff(member)}
                  sx={{
                    p: 1.5,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: isSelected ? 'var(--surface-2)' : 'transparent',
                    border: isSelected ? '1px solid #3FD0C9' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': {
                      backgroundColor: 'var(--surface-2)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: `${roleBadgeColor}22`,
                        border: `1px solid ${roleBadgeColor}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: roleBadgeColor,
                        shrink: 0,
                      }}
                    >
                      {member.name ? member.name.charAt(0).toUpperCase() : 'S'}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500, color: 'var(--text)' }} noWrap>
                        {member.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: roleBadgeColor, textTransform: 'capitalize', display: 'block', fontWeight: 600 }}>
                        {member.role?.replace('_', ' ')}
                      </Typography>
                    </Box>
                  </Box>

                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#3FD0C9] shrink-0" />}
                </Box>
              );
            })}
          </Box>
        </Paper>

        {/* Right Panel: Permission Matrix */}
        {selectedStaff ? (
          <Paper
            sx={{
              p: 3,
              border: '1px solid var(--border)',
              borderRadius: '12px',
              backgroundColor: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {/* Staff Profile Header & Dynamic Role Selector */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: '10px',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                  Configuring Access For:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text)' }}>
                  {selectedStaff.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                  {selectedStaff.email} &bull; ID: <span className="font-mono text-[11px]">{selectedStaff._id}</span>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="role-change-label">Role</InputLabel>
                  <Select
                    labelId="role-change-label"
                    value={selectedStaff.role}
                    label="Role"
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={roleUpdating}
                    sx={{ fontSize: '0.8rem', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
                  >
                    <MenuItem value="receptionist">Receptionist</MenuItem>
                    <MenuItem value="housekeeping">Housekeeping</MenuItem>
                    <MenuItem value="super-admin">Super Admin</MenuItem>
                  </Select>
                </FormControl>

                {!isSelectedSuper && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetToDefaults}
                    disabled={roleUpdating}
                    startIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    sx={{
                      borderColor: 'var(--border)',
                      color: 'var(--text-muted)',
                      height: 38,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      borderRadius: '8px',
                      '&:hover': { color: 'var(--text)', borderColor: 'var(--text-muted)', backgroundColor: 'var(--surface)' },
                    }}
                  >
                    Reset Defaults
                  </Button>
                )}
              </Box>
            </Box>

            {/* Super Admin Notice */}
            {isSelectedSuper && (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                <strong>Super-Admin Account:</strong> This user bypasses all permission checks automatically and has unconstrained read/write access across all system modules.
              </Alert>
            )}

            {/* Category Groups */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {categories.map((cat) => {
                const IconComponent = cat.icon;

                return (
                  <Paper
                    key={cat.id}
                    sx={{
                      p: 2.5,
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      backgroundColor: 'var(--surface-2)',
                    }}
                  >
                    {/* Category Title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1, borderBottom: '1px solid var(--border)' }}>
                      <IconComponent className="w-4 h-4 text-[#3FD0C9]" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text)' }}>
                        {cat.title}
                      </Typography>
                    </Box>

                    {/* Permissions List */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 1.5 }}>
                      {cat.permissions.map((p) => {
                        const isGrantedInDraft = isSelectedSuper || draftPermissions.includes(p.key);
                        const isOriginal = selectedStaff.permissions?.includes(p.key);
                        // Check if this switch is modified in draft
                        const isModified = !isSelectedSuper && isGrantedInDraft !== isOriginal;

                        return (
                          <Box
                            key={p.key}
                            sx={{
                              p: 1.5,
                              borderRadius: '8px',
                              backgroundColor: 'var(--surface)',
                              border: isModified
                                ? '1px solid #C9A15A'
                                : isGrantedInDraft
                                ? '1px solid rgba(63, 208, 201, 0.4)'
                                : '1px solid var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease',
                              position: 'relative',
                            }}
                          >
                            <Box sx={{ pr: 1 }}>
                              <div className="flex items-center gap-1.5">
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.82rem' }}>
                                  {p.label}
                                </Typography>
                                {isModified && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold">
                                    {isGrantedInDraft ? '+ Added' : '- Removed'}
                                  </span>
                                )}
                              </div>
                              <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>
                                {p.desc}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#3FD0C9', fontFamily: 'monospace', fontSize: '0.65rem' }}>
                                {p.key}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Switch
                                size="small"
                                checked={isGrantedInDraft}
                                disabled={isSelectedSuper}
                                onChange={() => handleTogglePermission(p.key)}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#3FD0C9',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#3FD0C9',
                                  },
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid var(--border)' }}>
            <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
              Select a staff member from the left panel to configure their permission matrix.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* ======================================================================
          STICKY SAVE ACTION BAR (VIEWPORT BOTTOM DOCK)
          Bilingual: Jab bhi Super Admin koi permission toggle karta hai, yeh
          floating action bar appear hoti hai taake save button hamesha samne rahe.
          ====================================================================== */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#131A26]/95 backdrop-blur-md border border-[#C9A15A]/40 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
            {/* Left: Unsaved Changes Badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  {totalDeltas} Unsaved Permission Change{totalDeltas !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-[#8791A3]">
                  Changes are pending local review and not yet written to database.
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outlined"
                onClick={handleDiscardChanges}
                startIcon={<Undo2 className="w-4 h-4" />}
                sx={{
                  borderColor: '#2A3547',
                  color: '#8791A3',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  px: 2,
                  py: 0.8,
                  '&:hover': {
                    borderColor: '#8791A3',
                    color: '#ECEFF3',
                    backgroundColor: '#1B2433',
                  },
                }}
              >
                Discard
              </Button>

              <Button
                variant="contained"
                onClick={handleOpenConfirmModal}
                startIcon={<Save className="w-4 h-4" />}
                sx={{
                  backgroundColor: '#3FD0C9',
                  color: '#0A0F1A',
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  borderRadius: '8px',
                  px: 3,
                  py: 0.9,
                  boxShadow: '0 4px 14px 0 rgba(63, 208, 201, 0.39)',
                  '&:hover': {
                    backgroundColor: '#2DB9B2',
                    boxShadow: '0 6px 20px 0 rgba(63, 208, 201, 0.45)',
                  },
                }}
              >
                Save Permissions ({totalDeltas})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <PbacConfirmModal
        open={isConfirmModalOpen}
        onClose={() => !isSaving && setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSave}
        staffMember={selectedStaff}
        addedPermissions={addedPermissions}
        removedPermissions={removedPermissions}
        permissionLabels={permissionLabels}
        isSaving={isSaving}
        error={saveError}
      />
    </Box>
  );
};

export default StaffPbacMatrixPage;
