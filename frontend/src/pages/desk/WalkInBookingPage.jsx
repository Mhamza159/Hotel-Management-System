import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import {
  CalendarPlus,
  ArrowLeft,
  ConciergeBell,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { WalkInBookingDialog } from '../../components/staff/WalkInBookingDialog';

/**
 * ============================================================================
 * WALK-IN BOOKING STANDALONE PAGE (/desk/walk-in)
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh page Front Desk Navigation Sidebar se directly open hota hai jab Receptionist
 * 'Walk-In Booking' tab par click karta hai.
 * Yeh dedicated screen provide karta hai jisme walk-in guest reservation dialog
 * automatically active hota hai aur user lobby bookings execute kar sakta hai.
 * 
 * [ENGLISH EXPLANATION]:
 * Standalone front desk console page for walk-in guest reservations.
 * Gated by PBAC permission `bookings:create`.
 */
export const WalkInBookingPage = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(true);

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Top Breadcrumb & Navigation Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Button
          startIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/desk')}
          sx={{
            color: 'var(--text-muted)',
            textTransform: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            '&:hover': { color: 'var(--text)' },
          }}
        >
          Back to Front Desk Dashboard
        </Button>

        <Button
          variant="contained"
          startIcon={<CalendarPlus className="w-4 h-4" />}
          onClick={() => setDialogOpen(true)}
          sx={{
            backgroundColor: '#3FD0C9',
            color: '#0A0F1A',
            textTransform: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            borderRadius: '10px',
            px: 2.5,
            '&:hover': { backgroundColor: '#32B3AD' },
          }}
        >
          Launch Walk-In Console
        </Button>
      </Box>

      {/* Main Feature Banner Card */}
      <Paper
        sx={{
          p: 4,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-aqua/10 border border-aqua/30 text-aqua text-xs font-semibold font-mono">
              <ConciergeBell className="w-3.5 h-3.5" />
              <span>Front Desk Operations</span>
            </div>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)' }}>
              Walk-In Guest Registration & Keycard Allotment
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Book rooms on behalf of walk-in guests arriving physically at the hotel lobby.
              Check real-time clean room inventory, record Cash or POS Card settlement, and issue
              instant room keys in a single streamlined workflow.
            </Typography>

            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="contained"
                startIcon={<CalendarPlus className="w-4 h-4" />}
                onClick={() => setDialogOpen(true)}
                sx={{
                  backgroundColor: '#3FD0C9',
                  color: '#0A0F1A',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  px: 3,
                  py: 1,
                  boxShadow: '0 4px 14px 0 rgba(63, 208, 201, 0.35)',
                  '&:hover': { backgroundColor: '#32B3AD' },
                }}
              >
                Open Walk-In Booking Dialog
              </Button>
            </div>
          </div>

          {/* Quick Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
            <div className="p-3 bg-surface-2 border border-border rounded-xl">
              <div className="flex items-center gap-2 text-aqua mb-1 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Clean Room Verification</span>
              </div>
              <p className="text-[11px] text-text-muted">
                Only rooms currently inspected and marked clean by Housekeeping can be checked in instantly.
              </p>
            </div>

            <div className="p-3 bg-surface-2 border border-border rounded-xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-1 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Audited Settlement</span>
              </div>
              <p className="text-[11px] text-text-muted">
                In-person Cash and POS Card slips are permanently stamped with your staff ID for financial accountability.
              </p>
            </div>
          </div>
        </div>
      </Paper>

      {/* Walk-In Booking Modal Dialog */}
      <WalkInBookingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          navigate('/desk');
        }}
      />
    </Box>
  );
};

export default WalkInBookingPage;
