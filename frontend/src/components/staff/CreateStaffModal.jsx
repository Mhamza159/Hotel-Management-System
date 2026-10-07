import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { UserPlus, Shield } from 'lucide-react';
import { staffService } from '../../services/staff.service';

/**
 * Super-Admin modal for creating new staff accounts
 */
export const CreateStaffModal = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'receptionist',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Name, email, and password are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await staffService.createStaff({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        role: formData.role,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create staff account:', err);
      setError(err?.response?.data?.message || 'Failed to create staff account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <UserPlus className="w-5 h-5 text-[#3FD0C9]" />
        <span>Create New Staff Account</span>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ borderColor: '#2A3547' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              name="name"
              label="Full Name"
              placeholder="e.g. Tariq Mehmood"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              size="small"
              disabled={loading}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                name="email"
                type="email"
                label="Staff Email"
                placeholder="staff@grandhorizon.com"
                value={formData.email}
                onChange={handleChange}
                required
                fullWidth
                size="small"
                disabled={loading}
              />

              <TextField
                name="phone"
                label="Phone Number"
                placeholder="+92 300 1234567"
                value={formData.phone}
                onChange={handleChange}
                fullWidth
                size="small"
                disabled={loading}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                name="password"
                type="password"
                label="Initial Password"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                fullWidth
                size="small"
                disabled={loading}
              />

              <FormControl fullWidth size="small">
                <InputLabel id="role-select-label">Staff Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  name="role"
                  value={formData.role}
                  label="Staff Role"
                  onChange={handleChange}
                  disabled={loading}
                >
                  <MenuItem value="receptionist">Receptionist (Front Desk)</MenuItem>
                  <MenuItem value="housekeeping">Housekeeping Staff</MenuItem>
                  <MenuItem value="super-admin">Super Administrator</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderColor: '#2A3547' }}>
          <Button onClick={onClose} disabled={loading} sx={{ color: '#8791A3' }}>
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
              '&:hover': { backgroundColor: '#2DB9B2' },
            }}
          >
            {loading ? <CircularProgress size={18} sx={{ color: '#0A0F1A' }} /> : 'Create Account'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateStaffModal;
