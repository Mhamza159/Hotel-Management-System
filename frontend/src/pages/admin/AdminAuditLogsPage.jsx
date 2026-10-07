import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  Eye,
  Filter,
  Lock,
  Layers,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { AuditPayloadModal } from '../../components/admin/AuditPayloadModal';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');

  // Selected Log for inspection
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(targetTypeFilter ? { targetType: targetTypeFilter } : {}),
      };

      const res = await adminService.getAuditLogs(params);
      setLogs(res.logs || res.data || []);
      setTotalCount(res.pagination?.total || res.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err?.message || 'Failed to fetch immutable security audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, rowsPerPage, actionFilter, targetTypeFilter]);

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }} className="space-y-6">
      {/* Top Header with Illuminated Shield */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-aqua shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] shrink-0">
            <ShieldAlert className="w-6 h-6 text-aqua" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Security Audit Trail
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Append-Only Ledger</span>
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Cryptographically verifiable, immutable record of administrative actions, mutations, and settlements
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAuditLogs}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-aqua bg-aqua/10 hover:bg-aqua/20 border border-aqua/30 transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Double-Bezel Filter Controls Bar */}
      <div className="p-1 rounded-[22px] bg-white/[0.02] border border-white/[0.06]">
        <div className="p-3.5 rounded-[18px] bg-[#0A0F1D]/80 backdrop-blur-md flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <TextField
              fullWidth
              size="small"
              placeholder="Filter by Action (e.g. payment:record-cash, staff:permission-update)..."
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="w-4 h-4 text-text-muted" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  fontSize: '0.85rem',
                  color: '#ECEFF3',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(63, 208, 201, 0.4)',
                },
              }}
            />
          </div>

          <div className="min-w-[180px]">
            <TextField
              fullWidth
              size="small"
              placeholder="Filter by Target (e.g. Payment, Room, User)..."
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Filter className="w-3.5 h-3.5 text-text-muted" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  fontSize: '0.85rem',
                  color: '#ECEFF3',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(63, 208, 201, 0.4)',
                },
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert severity="error" sx={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '14px' }}>
          {error}
        </Alert>
      )}

      {/* Double-Bezel Audit Log Table Container */}
      <div className="p-1 rounded-[26px] bg-white/[0.02] border border-white/[0.06]">
        <div className="rounded-[22px] bg-[#080D18]/90 backdrop-blur-md overflow-hidden">
          <TableContainer component={Paper} sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#8791A3', fontWeight: 600, py: 2, px: 2.5 } }}>
                  <TableCell sx={{ textTransform: 'uppercase', fontMono: true, fontSize: '0.65rem', letterSpacing: '0.12em' }}>Timestamp</TableCell>
                  <TableCell sx={{ textTransform: 'uppercase', fontMono: true, fontSize: '0.65rem', letterSpacing: '0.12em' }}>Action Key</TableCell>
                  <TableCell sx={{ textTransform: 'uppercase', fontMono: true, fontSize: '0.65rem', letterSpacing: '0.12em' }}>Authorized Actor</TableCell>
                  <TableCell sx={{ textTransform: 'uppercase', fontMono: true, fontSize: '0.65rem', letterSpacing: '0.12em' }}>Target Entity</TableCell>
                  <TableCell sx={{ textTransform: 'uppercase', fontMono: true, fontSize: '0.65rem', letterSpacing: '0.12em' }}>Provenance IP</TableCell>
                  <TableCell align="right" sx={{ textTransform: 'uppercase', fontMono: true, fontSize: '0.65rem', letterSpacing: '0.12em' }}>Inspector</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10, borderBottom: 'none' }}>
                      <CircularProgress size={32} sx={{ color: '#3FD0C9' }} />
                      <p className="text-xs text-text-muted mt-2 font-mono">Synchronizing immutable ledger...</p>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10, color: '#8791A3', borderBottom: 'none' }}>
                      No audit trail records found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow
                      key={log._id}
                      hover
                      sx={{
                        '& td': { borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: '#ECEFF3', py: 1.75, px: 2.5 },
                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.02)' },
                      }}
                    >
                      <TableCell>
                        <span className="text-xs font-mono text-[#8791A3]">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-aqua/10 text-aqua border border-aqua/25">
                          {log.action}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {log.actorId?.name || 'Automated System'}
                          </p>
                          <span className="text-[10px] text-text-muted block font-mono">
                            {log.actorId?.email || 'System'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">{log.targetType || 'N/A'}</span>
                            {log.targetType === 'User' && (log.afterState?.role || log.beforeState?.role) && (
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-aqua font-bold">
                                {(log.afterState?.role || log.beforeState?.role)?.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-text-muted block font-mono truncate max-w-[200px]" title={log.targetId}>
                            {log.afterState?.name ? `${log.afterState.name} • ` : ''}
                            {log.afterState?.bookingReference ? `${log.afterState.bookingReference} • ` : ''}
                            {typeof log.targetId === 'string' ? log.targetId : log.targetId?._id || ''}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-mono text-text-muted">
                          {log.ipAddress || '127.0.0.1'}
                        </span>
                      </TableCell>

                      <TableCell align="right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-aqua/10 hover:bg-aqua/20 text-aqua border border-aqua/30 transition-all active:scale-[0.98]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 15, 25, 50]}
              sx={{
                color: '#8791A3',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                '& .MuiTablePagination-select': { color: '#ECEFF3' },
                '& .MuiTablePagination-actions button': { color: '#ECEFF3' },
              }}
            />
          </TableContainer>
        </div>
      </div>

      {/* Reusable Luxury Audit Payload Inspector Dialog */}
      <AuditPayloadModal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </Box>
  );
};

export default AdminAuditLogsPage;
