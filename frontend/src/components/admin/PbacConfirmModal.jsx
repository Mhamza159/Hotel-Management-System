import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import { ShieldCheck, Plus, Minus, AlertTriangle, UserCheck, X } from 'lucide-react';

/**
 * ============================================================================
 * PBAC PERMISSION BATCH CONFIRMATION MODAL
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh modal Super Admin ke permissions save karne se pehle confirmation dialog show karta hai:
 * 1. Target Staff User details (Name, Email, Role) display karta hai.
 * 2. Added vs Removed Permissions Diff:
 *    - Nayi add hone wali permissions green badges mein aati hain (+).
 *    - Revoke hone wali permissions red badges mein aati hain (-).
 * 3. Loading State: Jab save chal raha hota hai (`isSaving`), button par animated
 *    spinner loader chalta hai aur user dubara click nahi kar sakta (double-submit prevention).
 * 4. Theme Support: Light aur Dark modes dono ke tokens (var(--surface), var(--border))
 *    ke mutabiq adapt hota hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Confirmation Dialog for Batch PBAC Permission Mutations.
 * Presents a clear visual diff of granted vs revoked permissions,
 * provides security advisory context, and manages the async save loader.
 */
export const PbacConfirmModal = ({
  open,
  onClose,
  onConfirm,
  staffMember,
  addedPermissions = [],
  removedPermissions = [],
  permissionLabels = {},
  isSaving = false,
  error = null,
}) => {
  if (!staffMember) return null;

  const totalChanges = addedPermissions.length + removedPermissions.length;

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        },
      }}
    >
      {/* 1. DIALOG HEADER WITH USER INFO */}
      <DialogTitle
        sx={{
          borderBottom: '1px solid var(--border)',
          py: 2.5,
          px: 3,
          backgroundColor: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 flex items-center justify-center text-[#3FD0C9]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
              Confirm Permission Updates
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Review proposed access changes before committing to database
            </Typography>
          </div>
        </div>

        {!isSaving && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </DialogTitle>

      {/* 2. DIALOG BODY: DIFF BREAKDOWN */}
      <DialogContent sx={{ p: 3, backgroundColor: 'var(--surface)' }}>
        {/* Error message display agar API fail ho jaye */}
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
            {error}
          </Alert>
        )}

        {/* Staff Member Card */}
        <div className="p-3.5 bg-surface-2 border border-border rounded-xl mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center font-bold text-text text-sm">
              {staffMember.name ? staffMember.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-sm font-bold text-text leading-tight">{staffMember.name}</p>
              <p className="text-xs text-text-muted">{staffMember.email}</p>
            </div>
          </div>
          <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-lg bg-surface border border-border text-aqua font-semibold">
            {staffMember.role?.replace('_', ' ')}
          </span>
        </div>

        {/* Changes Summary Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-text uppercase tracking-wider">
            Permission Deltas ({totalChanges} change{totalChanges !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Added Permissions Group (+) */}
        {addedPermissions.length > 0 && (
          <div className="mb-3.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 text-emerald-400 mb-2 font-semibold text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Granting Access (+{addedPermissions.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {addedPermissions.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>{permissionLabels[key] || key}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Revoked Permissions Group (-) */}
        {removedPermissions.length > 0 && (
          <div className="mb-3.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <div className="flex items-center gap-1.5 text-rose-400 mb-2 font-semibold text-xs">
              <Minus className="w-3.5 h-3.5" />
              <span>Revoking Access (-{removedPermissions.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {removedPermissions.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium"
                >
                  <Minus className="w-3 h-3" />
                  <span>{permissionLabels[key] || key}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Security Warning Notice */}
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-text-muted mt-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-amber-400">Security Advisory:</strong> Modifying permissions grants immediate operational authority. Updated permissions synchronize with the staff member's active session upon their next request.
          </p>
        </div>
      </DialogContent>

      {/* 3. DIALOG ACTIONS WITH LOADER */}
      <DialogActions
        sx={{
          borderTop: '1px solid var(--border)',
          py: 2,
          px: 3,
          backgroundColor: 'var(--surface-2)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onClose}
          disabled={isSaving}
          sx={{
            color: 'var(--text-muted)',
            textTransform: 'none',
            fontSize: '0.85rem',
            fontWeight: 500,
            '&:hover': {
              color: 'var(--text)',
              backgroundColor: 'var(--border)',
            },
          }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isSaving || totalChanges === 0}
          startIcon={
            isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )
          }
          sx={{
            backgroundColor: '#3FD0C9',
            color: '#0A0F1A',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.875rem',
            px: 2.5,
            py: 1,
            borderRadius: '8px',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#2DB9B2',
              boxShadow: 'none',
            },
            '&:disabled': {
              backgroundColor: 'rgba(63, 208, 201, 0.3)',
              color: 'rgba(10, 15, 26, 0.5)',
            },
          }}
        >
          {isSaving ? 'Applying Changes...' : `Confirm & Apply (${totalChanges})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PbacConfirmModal;
