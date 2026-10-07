import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { BedDouble } from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { ROOM_TYPES } from '../../config/constants';

const AVAILABLE_AMENITIES = [
  'King Bed',
  'Queen Bed',
  'High-Speed Wi-Fi',
  'Ocean View',
  'City Skyline View',
  'Smart TV',
  'Mini Bar',
  'Espresso Machine',
  'Jacuzzi',
  'Private Balcony',
  'Marble Bath',
  'Work Desk',
  'In-Room Safe',
  '24/7 Room Service',
];

export const CreateEditRoomModal = ({ open, onClose, room, onSuccess }) => {
  const isEdit = Boolean(room?._id);

  const [formData, setFormData] = useState({
    roomNumber: '',
    type: 'deluxe',
    pricePerNight: '',
    capacity: 2,
    description: '',
    amenities: ['High-Speed Wi-Fi', 'Smart TV'],
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (room) {
      setFormData({
        roomNumber: room.roomNumber || '',
        type: room.type || 'deluxe',
        pricePerNight: room.pricePerNight || '',
        capacity: room.capacity || 2,
        description: room.description || '',
        amenities: room.amenities || [],
        isActive: room.isActive ?? true,
      });
    } else {
      setFormData({
        roomNumber: '',
        type: 'deluxe',
        pricePerNight: '',
        capacity: 2,
        description: '',
        amenities: ['High-Speed Wi-Fi', 'Smart TV'],
        isActive: true,
      });
    }
    setError(null);
  }, [room, open]);

  const toggleAmenity = (amenity) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.roomNumber.trim()) {
      setError('Room number is required');
      return;
    }
    if (!formData.pricePerNight || Number(formData.pricePerNight) <= 0) {
      setError('Valid price per night is required');
      return;
    }
    if (!formData.capacity || Number(formData.capacity) < 1) {
      setError('Capacity must be at least 1 guest');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        roomNumber: formData.roomNumber.trim(),
        type: formData.type,
        pricePerNight: Number(formData.pricePerNight),
        capacity: Number(formData.capacity),
        description: formData.description.trim() || `${formData.type ? formData.type.charAt(0).toUpperCase() + formData.type.slice(1) : 'Deluxe'} Suite with bespoke comfort and amenities.`,
        amenities: formData.amenities,
        isActive: formData.isActive,
      };

      if (isEdit) {
        await adminService.updateRoom(room._id, payload);
      } else {
        await adminService.createRoom(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save room specification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#131A26',
          border: '1px solid #2A3547',
          borderRadius: 2,
          color: '#ECEFF3',
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ borderBottom: '1px solid #2A3547', pb: 2 }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 flex items-center justify-center text-[#3FD0C9]">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#ECEFF3' }}>
                {isEdit ? `Edit Suite ${room?.roomNumber}` : 'Create Physical Suite / Room'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8791A3' }}>
                {isEdit ? 'Update inventory configuration and pricing' : 'Add new physical unit to inventory'}
              </Typography>
            </div>
          </div>
        </DialogTitle>

        <DialogContent sx={{ py: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#F87171' }}>
              {error}
            </Alert>
          )}

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Room Number"
                fullWidth
                size="small"
                disabled={isEdit}
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                placeholder="e.g. 402"
                required
              />

              <TextField
                select
                label="Suite Category"
                fullWidth
                size="small"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {Object.values(ROOM_TYPES).map((type) => (
                  <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>
                    {type.replace('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Price Per Night ($)"
                type="number"
                fullWidth
                size="small"
                value={formData.pricePerNight}
                onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
                placeholder="250"
                inputProps={{ min: 1, step: 'any' }}
                required
              />

              <TextField
                label="Max Guest Capacity"
                type="number"
                fullWidth
                size="small"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                inputProps={{ min: 1, max: 10 }}
                required
              />
            </div>

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Luxurious suite featuring panoramic views, artisan furniture, and bespoke amenities..."
            />

            <div>
              <Typography variant="caption" sx={{ color: '#8791A3', fontWeight: 600, mb: 1, display: 'block' }}>
                Select Amenities ({formData.amenities.length} selected)
              </Typography>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-[#0A0F1A] border border-[#2A3547] rounded-lg">
                {AVAILABLE_AMENITIES.map((amenity) => {
                  const selected = formData.amenities.includes(amenity);
                  return (
                    <button
                      type="button"
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        selected
                          ? 'bg-[#3FD0C9]/20 text-[#3FD0C9] border border-[#3FD0C9]/50 font-semibold'
                          : 'bg-[#1B2433] text-[#8791A3] border border-[#2A3547] hover:text-[#ECEFF3]'
                      }`}
                    >
                      {selected ? `✓ ${amenity}` : `+ ${amenity}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <div>
                  <Typography variant="body2" sx={{ color: '#ECEFF3', fontWeight: 600 }}>
                    Active in Inventory
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#8791A3' }}>
                    Inactive rooms are hidden from guest discovery and public booking
                  </Typography>
                </div>
              }
            />
          </div>
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #2A3547', p: 2 }}>
          <Button onClick={onClose} sx={{ color: '#8791A3' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              backgroundColor: '#3FD0C9',
              color: '#0A0F1A',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#34b3ad' },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : isEdit ? 'Save Changes' : 'Create Room'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
