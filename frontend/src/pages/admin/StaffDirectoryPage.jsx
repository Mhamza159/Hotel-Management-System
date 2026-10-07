import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { staffService } from '../../services/staff.service';
import { CreateStaffModal } from '../../components/staff/CreateStaffModal';

/**
 * Staff Directory Management Page
 * Route: /admin/staff
 */
export const StaffDirectoryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await staffService.getStaff(params);
      setStaffList(res?.staff || []);
    } catch (err) {
      console.error('Failed to load staff directory:', err);
      setAlertInfo({
        severity: 'error',
        message: err?.response?.data?.message || 'Failed to fetch staff directory.',
      });
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchQuery]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super-admin':
        return '#C9A15A'; // Gold
      case 'receptionist':
        return '#3FD0C9'; // Live Aqua
      case 'housekeeping':
        return '#3ECF8E'; // Green
      default:
        return '#8791A3';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Top Header & Actions Strip */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ECEFF3' }}>
            Staff & Access Management
          </Typography>
          <Typography variant="caption" sx={{ color: '#8791A3' }}>
            Hotel staff directory, roles, and granular Permission-Based Access Control (PBAC)
          </Typography>
        </div>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/staff/pbac')}
            startIcon={<KeyRound className="w-4 h-4" />}
            sx={{
              borderColor: '#2A3547',
              color: '#ECEFF3',
              '&:hover': { borderColor: '#3FD0C9', backgroundColor: 'rgba(63, 208, 201, 0.05)' },
            }}
          >
            Permission Matrix
          </Button>

          <Button
            variant="contained"
            onClick={() => setCreateModalOpen(true)}
            startIcon={<UserPlus className="w-4 h-4" />}
            sx={{
              backgroundColor: '#3FD0C9',
              color: '#0A0F1A',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#2DB9B2' },
            }}
          >
            Create Staff Member
          </Button>
        </Box>
      </Box>

      {/* Alert Banner */}
      {alertInfo && (
        <Alert
          severity={alertInfo.severity}
          onClose={() => setAlertInfo(null)}
          sx={{ borderRadius: 2 }}
        >
          {alertInfo.message}
        </Alert>
      )}

      {/* Main Table Card */}
      <Paper sx={{ border: '1px solid #2A3547', borderRadius: 2, overflow: 'hidden' }}>
        {/* Filter Toolbar */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid #2A3547',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, flex: 1, maxWidth: 480 }}>
            <TextField
              size="small"
              placeholder="Search staff by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="w-4 h-4 text-[#8791A3]" />
                  </InputAdornment>
                ),
              }}
              fullWidth
              sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', color: '#ECEFF3', py: 0.75 } }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                displayEmpty
                sx={{ fontSize: '0.8rem', color: '#ECEFF3', py: 0.25 }}
              >
                <MenuItem value="">All Staff Roles</MenuItem>
                <MenuItem value="receptionist">Receptionist</MenuItem>
                <MenuItem value="housekeeping">Housekeeping</MenuItem>
                <MenuItem value="super-admin">Super Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Tooltip title="Refresh Directory">
            <IconButton
              onClick={fetchStaff}
              disabled={loading}
              sx={{ color: '#8791A3', border: '1px solid #2A3547', borderRadius: 1.5 }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Staff Table */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Staff Member</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Contact Phone</TableCell>
                <TableCell>PBAC Scope</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#3FD0C9', mb: 1 }} />
                    <Typography variant="body2" sx={{ color: '#8791A3' }}>
                      Retrieving staff accounts...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : staffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" sx={{ color: '#8791A3' }}>
                      No staff accounts found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                staffList.map((member) => {
                  const roleColor = getRoleBadgeColor(member.role);
                  const isSuper = member.role === 'super-admin';
                  const permsCount = isSuper ? 'Full Bypass' : `${member.permissions?.length || 0} Permissions`;

                  return (
                    <TableRow key={member._id} hover>
                      {/* Name & Email with Avatar */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              w: 32,
                              h: 32,
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: `${roleColor}22`,
                              border: `1px solid ${roleColor}44`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: roleColor,
                            }}
                          >
                            {member.name ? member.name.charAt(0).toUpperCase() : 'S'}
                          </Box>
                          <div>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#ECEFF3' }}>
                              {member.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#8791A3', display: 'block' }}>
                              {member.email}
                            </Typography>
                          </div>
                        </Box>
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell>
                        <Chip
                          size="small"
                          label={member.role?.replace('_', ' ')}
                          sx={{
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            fontSize: '0.65rem',
                            color: roleColor,
                            backgroundColor: `${roleColor}15`,
                            border: `1px solid ${roleColor}33`,
                          }}
                        />
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#ECEFF3' }}>
                          {member.phone || 'N/A'}
                        </Typography>
                      </TableCell>

                      {/* PBAC Scope */}
                      <TableCell>
                        <Chip
                          size="small"
                          label={permsCount}
                          variant="outlined"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            color: isSuper ? '#C9A15A' : '#8791A3',
                            borderColor: isSuper ? '#C9A15A' : '#2A3547',
                          }}
                        />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              member.isActive !== false ? 'bg-[#3ECF8E]' : 'bg-[#F2545B]'
                            }`}
                          />
                          <Typography variant="caption" sx={{ color: member.isActive !== false ? '#3ECF8E' : '#F2545B' }}>
                            {member.isActive !== false ? 'Active' : 'Deactivated'}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Action */}
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/admin/staff/${member._id}/pbac`)}
                          startIcon={<KeyRound className="w-3.5 h-3.5" />}
                          sx={{
                            height: 28,
                            fontSize: '0.72rem',
                            borderColor: '#2A3547',
                            color: '#3FD0C9',
                            '&:hover': {
                              borderColor: '#3FD0C9',
                              backgroundColor: 'rgba(63, 208, 201, 0.1)',
                            },
                          }}
                        >
                          Configure PBAC
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Staff Modal */}
      {createModalOpen && (
        <CreateStaffModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setAlertInfo({
              severity: 'success',
              message: 'New staff account created successfully.',
            });
            fetchStaff();
          }}
        />
      )}
    </Box>
  );
};

export default StaffDirectoryPage;
