import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Star,
  Trash2,
  MessageSquare,
  BedDouble,
  Calendar,
  User,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { roomService } from '../../services/room.service';
import { engagementService } from '../../services/engagement.service';

/**
 * ============================================================================
 * ADMIN REVIEWS MODERATION PAGE
 * ============================================================================
 * Allows staff to inspect verified guest reviews per room and soft-delete/moderate.
 */
export const AdminReviewsPage = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, review: null });
  const [feedback, setFeedback] = useState(null);

  // Fetch all rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoadingRooms(true);
        const res = await adminService.getAdminRooms({ limit: 50 });
        const roomList = Array.isArray(res?.rooms) ? res.rooms : Array.isArray(res) ? res : [];
        setRooms(roomList);
        if (roomList.length > 0) {
          setSelectedRoomId(roomList[0]._id);
        }
      } catch (err) {
        setFeedback({ type: 'error', message: err?.message || 'Failed to load rooms' });
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []);

  // Fetch reviews whenever selected room changes
  useEffect(() => {
    if (!selectedRoomId) return;

    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const res = await roomService.getRoomReviews(selectedRoomId);
        const reviewList = Array.isArray(res?.reviews) ? res.reviews : Array.isArray(res) ? res : [];
        setReviews(reviewList);
      } catch (err) {
        setFeedback({ type: 'error', message: err?.message || 'Failed to fetch reviews for this room' });
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [selectedRoomId]);

  const handleDeleteReview = async () => {
    const review = deleteConfirmDialog.review;
    if (!review) return;

    try {
      setActionLoadingId(review._id);
      await engagementService.deleteReview(review._id);
      setReviews((prev) => prev.filter((r) => r._id !== review._id));
      setFeedback({ type: 'success', message: 'Review successfully removed from public catalog' });
      setDeleteConfirmDialog({ open: false, review: null });
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to delete review' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Box className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Box className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A3547]">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#3FD0C9]" />
            <Typography variant="h5" className="font-bold text-[#ECEFF3]">
              Guest Reviews Moderation
            </Typography>
          </div>
          <Typography variant="body2" className="text-[#8791A3] mt-1">
            Inspect room reviews, verify guest feedback, and moderate content violating hotel policies.
          </Typography>
        </div>

        {/* Room Selector */}
        <Box className="flex items-center gap-3">
          <FormControl size="small" className="min-w-[240px]">
            <InputLabel id="select-room-label" sx={{ color: '#8791A3' }}>
              Select Room
            </InputLabel>
            <Select
              labelId="select-room-label"
              value={selectedRoomId}
              label="Select Room"
              onChange={(e) => setSelectedRoomId(e.target.value)}
              disabled={loadingRooms}
              sx={{
                backgroundColor: '#131A26',
                color: '#ECEFF3',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#2A3547' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3FD0C9' },
                '.MuiSvgIcon-root': { color: '#8791A3' },
              }}
            >
              {rooms.map((room) => (
                <MenuItem key={room._id} value={room._id}>
                  Room {room.roomNumber} — {room.type} (${room.pricePerNight}/night)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Feedback Alert */}
      {feedback && (
        <Alert
          severity={feedback.type}
          onClose={() => setFeedback(null)}
          sx={{
            backgroundColor: feedback.type === 'error' ? '#2A181A' : '#142921',
            color: feedback.type === 'error' ? '#F2545B' : '#3ECF8E',
            border: `1px solid ${feedback.type === 'error' ? '#F2545B40' : '#3ECF8E40'}`,
          }}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Content Area */}
      {loadingReviews ? (
        <Box className="flex items-center justify-center py-20">
          <CircularProgress size={32} sx={{ color: '#3FD0C9' }} />
        </Box>
      ) : reviews.length === 0 ? (
        <Paper
          elevation={0}
          className="p-12 text-center rounded-xl border border-[#2A3547] bg-[#131A26]"
        >
          <MessageSquare className="w-12 h-12 text-[#8791A3]/40 mx-auto mb-3" />
          <Typography variant="h6" className="text-[#ECEFF3] font-semibold">
            No Reviews Found
          </Typography>
          <Typography variant="body2" className="text-[#8791A3] mt-1">
            This room currently has no guest reviews submitted.
          </Typography>
        </Paper>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <Paper
              key={review._id}
              elevation={0}
              className="p-5 rounded-xl border border-[#2A3547] bg-[#131A26] flex flex-col justify-between hover:border-[#3FD0C9]/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#1B2433] border border-[#2A3547] flex items-center justify-center text-[#3FD0C9]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <Typography variant="subtitle2" className="text-[#ECEFF3] font-semibold">
                        {review.user?.name || review.guestName || 'Verified Guest'}
                      </Typography>
                      <Typography variant="caption" className="text-[#8791A3]">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Typography>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 bg-[#1B2433] px-2 py-1 rounded-md border border-[#2A3547]">
                    <Star className="w-3.5 h-3.5 fill-[#C9A15A] text-[#C9A15A]" />
                    <span className="text-xs font-bold text-[#C9A15A]">{review.rating} / 5</span>
                  </div>
                </div>

                {/* Comment Body */}
                <Typography variant="body2" className="text-[#ECEFF3]/90 leading-relaxed italic bg-[#0A0F1A]/40 p-3 rounded-lg border border-[#1B2433]">
                  "{review.comment}"
                </Typography>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 mt-3 border-t border-[#1B2433]">
                <Chip
                  size="small"
                  icon={<ShieldCheck className="w-3 h-3 text-[#3ECF8E]" />}
                  label="Verified Stay"
                  sx={{
                    backgroundColor: '#142921',
                    color: '#3ECF8E',
                    borderColor: '#3ECF8E30',
                    border: '1px solid',
                    fontSize: '10px',
                  }}
                />

                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={actionLoadingId === review._id}
                  onClick={() => setDeleteConfirmDialog({ open: true, review })}
                  startIcon={
                    actionLoadingId === review._id ? (
                      <CircularProgress size={12} color="inherit" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )
                  }
                  sx={{
                    textTransform: 'none',
                    borderColor: '#F2545B40',
                    color: '#F2545B',
                    '&:hover': {
                      borderColor: '#F2545B',
                      backgroundColor: '#F2545B15',
                    },
                  }}
                >
                  Moderate / Remove
                </Button>
              </div>
            </Paper>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={() => setDeleteConfirmDialog({ open: false, review: null })}
        PaperProps={{
          sx: {
            backgroundColor: '#131A26',
            color: '#ECEFF3',
            border: '1px solid #2A3547',
            borderRadius: '12px',
          },
        }}
      >
        <DialogTitle className="flex items-center gap-2 text-[#F2545B]">
          <AlertTriangle className="w-5 h-5" />
          Confirm Review Removal
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-[#ECEFF3]">
            Are you sure you want to remove this review? This action cannot be undone.
          </Typography>
          {deleteConfirmDialog.review && (
            <Paper className="p-3 mt-3 bg-[#0A0F1A] border border-[#2A3547] rounded-lg">
              <Typography variant="caption" className="text-[#8791A3] block mb-1">
                Comment:
              </Typography>
              <Typography variant="body2" className="text-[#ECEFF3] italic">
                "{deleteConfirmDialog.review.comment}"
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions className="p-4 border-t border-[#2A3547]">
          <Button
            onClick={() => setDeleteConfirmDialog({ open: false, review: null })}
            sx={{ color: '#8791A3', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteReview}
            disabled={!!actionLoadingId}
            sx={{ textTransform: 'none' }}
          >
            {actionLoadingId ? 'Removing...' : 'Confirm Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReviewsPage;
