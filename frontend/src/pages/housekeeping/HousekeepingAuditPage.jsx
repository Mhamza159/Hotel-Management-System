import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertCircle,
  User,
  Clock,
  Laptop,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

/**
 * ============================================================================
 * HOUSEKEEPING AUDIT LOG VIEW (WARM MINIMAL PLANNER)
 * ============================================================================
 * 
 * Unlocked when Housekeeping user has audit:view.
 * Restyled: white-card table row list instead of MUI DataGrid's dark styling.
 */
export const HousekeepingAuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getAuditLogs({ limit: 50 });
      setLogs(res?.logs || res?.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve immutable security trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const actor = (log.actor?.name || log.actorName || '').toLowerCase();
    const action = (log.action || '').toLowerCase();
    const target = (log.targetType || '').toLowerCase();
    return actor.includes(q) || action.includes(q) || target.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4DFD0] pb-6">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#2B3A2A] uppercase font-bold flex items-center space-x-1.5">
            <ScrollText className="w-3.5 h-3.5 text-[#2B3A2A]" />
            <span>IMMUTABLE SECURITY LEDGER</span>
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#2A2A28] mt-1">
            Audit Activity Trail
          </h1>
          <p className="text-xs font-serif italic text-[#2A2A28]/70 mt-0.5">
            Cryptographic, tamper-evident record of all staff operations, status transitions, and PBAC adjustments.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto inline-flex items-center space-x-2 px-4 py-2 bg-white border border-[#E4DFD0] rounded-xl text-xs font-mono uppercase tracking-wider text-[#2A2A28] hover:bg-[#FAF8F2] shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Search */}
      <div className="w-full md:w-80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2A2A28]/40" />
          <input
            type="text"
            placeholder="Search actor, action, target..."
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
          <span className="text-xs font-mono text-[#2A2A28]/60">Verifying audit signatures...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E4DFD0] space-y-2">
          <p className="font-serif text-lg text-[#2A2A28]">No activity records found.</p>
          <p className="text-xs font-mono text-[#2A2A28]/60">Activity records will appear here as staff perform actions.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log, idx) => {
            const actorName = log.actor?.name || log.actorName || 'System Service';
            const action = log.action || 'TRANSACTION';
            const targetType = log.targetType || 'ENTITY';
            const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now';

            return (
              <div
                key={log._id || idx}
                className="p-4 bg-white border border-[#E4DFD0] rounded-2xl shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF8F2] border border-[#E4DFD0] text-[#2B3A2A] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#2B3A2A]" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#2A2A28]">{actorName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold bg-[#B7CBA8]/30 text-[#2B3A2A] border border-[#B7CBA8]">
                        {action}
                      </span>
                      <span className="text-[10px] font-mono text-[#2A2A28]/50 uppercase">
                        [{targetType}]
                      </span>
                    </div>

                    <p className="text-[11px] text-[#2A2A28]/70 mt-0.5 font-sans">
                      {log.details || log.description || `Performed ${action} on ${targetType}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-[10px] font-mono text-[#2A2A28]/50 shrink-0 self-end sm:self-auto">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{timeStr}</span>
                  </div>
                  {log.ipAddress && (
                    <div className="flex items-center space-x-1">
                      <Laptop className="w-3 h-3" />
                      <span>{log.ipAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HousekeepingAuditPage;
