import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  BedDouble,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Image as ImageIcon,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { CreateEditRoomModal } from '../../components/admin/CreateEditRoomModal';
import { RoomImagesModal } from '../../components/admin/RoomImagesModal';
import { ROOM_TYPES, HOUSEKEEPING_STATUS } from '../../config/constants';

const HOUSEKEEPING_CHIP_COLORS = {
  clean: { bg: 'rgba(62, 207, 142, 0.1)', text: '#3ECF8E', border: 'rgba(62, 207, 142, 0.3)' },
  dirty: { bg: 'rgba(239, 68, 68, 0.1)', text: '#F87171', border: 'rgba(239, 68, 68, 0.3)' },
  cleaning: { bg: 'rgba(63, 208, 201, 0.1)', text: '#3FD0C9', border: 'rgba(63, 208, 201, 0.3)' },
  maintenance: { bg: 'rgba(201, 161, 90, 0.1)', text: '#C9A15A', border: 'rgba(201, 161, 90, 0.3)' },
};

export const AdminRoomsPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Pagination & Filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [typeFilter, setTypeFilter] = useState('');
  const [housekeepingFilter, setHousekeepingFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [imagesRoom, setImagesRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(housekeepingFilter ? { housekeepingStatus: housekeepingFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      };

      const res = await adminService.getAdminRooms(params);
      setRooms(res.rooms || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load room inventory:', err);
      setError(err?.message || 'Failed to fetch room inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [page, rowsPerPage, typeFilter, housekeepingFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchRooms();
  };

  const handleDeleteRoom = async () => {
    if (!deletingRoom) return;

    try {
      setDeletingInProgress(true);
      setError(null);
      await adminService.deleteRoom(deletingRoom._id);
      setSuccessMsg(`Suite ${deletingRoom.roomNumber} has been safely retired from inventory.`);
      setDeletingRoom(null);
      fetchRooms();
    } catch (err) {
      setError(err?.message || 'Cannot delete room with active bookings.');
    } finally {
      setDeletingInProgress(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      {/* Top Header */}
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
            Physical Room Inventory
          </Typography>
          <Typography variant="caption" sx={{ color: '#8791A3' }}>
            Manage room definitions, suite configurations, pricing, and Cloudinary media
          </Typography>
        </div>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => setCreateModalOpen(true)}
            startIcon={<Plus className="w-4 h-4" />}
            sx={{
              backgroundColor: '#3FD0C9',
              color: '#0A0F1A',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#34b3ad' },
            }}
          >
            Add New Suite
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={fetchRooms}
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

      {/* Filter Controls Bar */}
      <Box
        component="form"
        onSubmit={handleSearchSubmit}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 4,
          p: 2,
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          borderRadius: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by Room Number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: '1 1 200px' }}
          InputProps={{
            startAdornment: <Search className="w-4 h-4 text-[#8791A3] mr-2" />,
          }}
        />

        <TextField
          select
          size="small"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(0);
          }}
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All Suite Types</MenuItem>
          {Object.values(ROOM_TYPES).map((t) => (
            <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
              {t.replace('_', ' ')}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          value={housekeepingFilter}
          onChange={(e) => {
            setHousekeepingFilter(e.target.value);
            setPage(0);
          }}
          displayEmpty
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="">All Cleanliness Statuses</MenuItem>
          {Object.values(HOUSEKEEPING_STATUS).map((hk) => (
            <MenuItem key={hk} value={hk} sx={{ textTransform: 'capitalize' }}>
              {hk}
            </MenuItem>
          ))}
        </TextField>

        <Button
          type="submit"
          variant="contained"
          size="small"
          sx={{
            backgroundColor: '#3FD0C9',
            color: '#0A0F1A',
            fontWeight: 700,
            '&:hover': { backgroundColor: '#34b3ad' },
          }}
        >
          Search
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, backgroundColor: 'rgba(62, 207, 142, 0.1)', color: '#3ECF8E' }}>
          {successMsg}
        </Alert>
      )}

      {/* Rooms Table */}
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          borderRadius: 2,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { borderBottom: '1px solid #2A3547', color: '#8791A3', fontWeight: 600, py: 1.5 } }}>
              <TableCell>Room</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Rate / Night</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Housekeeping</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Gallery</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={32} sx={{ color: '#3FD0C9' }} />
                </TableCell>
              </TableRow>
            ) : rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8, color: '#8791A3' }}>
                  No suites found in inventory.
                </TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => {
                const hkStyle = HOUSEKEEPING_CHIP_COLORS[room.housekeepingStatus] || HOUSEKEEPING_CHIP_COLORS.clean;
                return (
                  <TableRow
                    key={room._id}
                    hover
                    sx={{
                      '& td': { borderBottom: '1px solid #2A3547', color: '#ECEFF3', py: 1.5 },
                      '&:hover': { backgroundColor: '#1B2433' },
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 flex items-center justify-center text-[#3FD0C9]">
                          <BedDouble className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-[#ECEFF3]">Suite {room.roomNumber}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-semibold capitalize text-[#ECEFF3]">
                        {room.type?.replace('_', ' ')}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono font-bold text-[#C9A15A]">
                        ${room.pricePerNight?.toFixed(2)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-[#8791A3]">
                        <Users className="w-3.5 h-3.5" />
                        <span>{room.capacity} Guests</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={room.housekeepingStatus}
                        size="small"
                        sx={{
                          backgroundColor: hkStyle.bg,
                          color: hkStyle.text,
                          border: `1px solid ${hkStyle.border}`,
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          height: 20,
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      {room.isActive ? (
                        <div className="flex items-center gap-1 text-xs text-[#3ECF8E] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-rose-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <button
                        onClick={() => setImagesRoom(room)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0A0F1A] border border-[#2A3547] text-xs text-[#3FD0C9] hover:border-[#3FD0C9] transition-colors"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>{room.images?.length || 0} photos</span>
                      </button>
                    </TableCell>

                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          size="small"
                          onClick={() => setEditingRoom(room)}
                          title="Edit Specs"
                          sx={{ color: '#3FD0C9', '&:hover': { backgroundColor: 'rgba(63, 208, 201, 0.1)' } }}
                        >
                          <Edit className="w-4 h-4" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setDeletingRoom(room)}
                          title="Retire / Soft Delete"
                          sx={{ color: '#F87171', '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' } }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
          sx={{
            borderTop: '1px solid #2A3547',
            color: '#8791A3',
            '& .MuiTablePagination-select': { color: '#ECEFF3' },
            '& .MuiTablePagination-actions button': { color: '#ECEFF3' },
          }}
        />
      </TableContainer>

      {/* Create / Edit Room Modal */}
      <CreateEditRoomModal
        open={createModalOpen || Boolean(editingRoom)}
        room={editingRoom}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingRoom(null);
        }}
        onSuccess={() => {
          fetchRooms();
          setSuccessMsg(editingRoom ? 'Suite updated successfully.' : 'New suite created successfully.');
        }}
      />

      {/* Cloudinary Gallery Modal */}
      <RoomImagesModal
        open={Boolean(imagesRoom)}
        room={imagesRoom}
        onClose={() => setImagesRoom(null)}
        onImagesUpdated={() => {
          fetchRooms();
        }}
      />

      {/* Soft-Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingRoom)}
        onClose={() => setDeletingRoom(null)}
        PaperProps={{
          sx: {
            backgroundColor: '#131A26',
            border: '1px solid #2A3547',
            color: '#ECEFF3',
          },
        }}
      >
        <DialogTitle sx={{ color: '#F87171', fontWeight: 700 }}>
          Retire Suite {deletingRoom?.roomNumber} from Inventory?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#8791A3', fontSize: '0.875rem' }}>
            Are you sure you want to retire Suite {deletingRoom?.roomNumber}? This marks the suite as soft-deleted. The system will prevent deletion if there are active, non-completed bookings on this unit.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeletingRoom(null)} sx={{ color: '#8791A3' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deletingInProgress}
            onClick={handleDeleteRoom}
            sx={{ fontWeight: 700 }}
          >
            {deletingInProgress ? <CircularProgress size={20} color="inherit" /> : 'Confirm Retirement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminRoomsPage;
