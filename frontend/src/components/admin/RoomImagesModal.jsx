import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Typography,
  IconButton,
} from '@mui/material';
import { Image, Upload, Trash2, X, Plus } from 'lucide-react';
import { adminService } from '../../services/admin.service';

export const RoomImagesModal = ({ open, onClose, room, onImagesUpdated }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!room) return null;

  const images = room.images || [];

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      if (images.length + filesArr.length > 5) {
        setError(`A maximum of 5 images per room is allowed. You currently have ${images.length}.`);
        return;
      }
      setSelectedFiles(filesArr);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;

    try {
      setUploading(true);
      setError(null);
      setSuccessMsg(null);

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });

      const res = await adminService.uploadRoomImages(room._id, formData);
      setSuccessMsg('Images uploaded successfully.');
      setSelectedFiles([]);
      if (onImagesUpdated) onImagesUpdated(res);
    } catch (err) {
      setError(err?.message || 'Failed to upload images.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (publicId) => {
    try {
      setDeletingId(publicId);
      setError(null);
      setSuccessMsg(null);

      const res = await adminService.deleteRoomImage(room._id, publicId);
      setSuccessMsg('Image deleted successfully.');
      if (onImagesUpdated) onImagesUpdated(res);
    } catch (err) {
      setError(err?.message || 'Failed to delete image.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
      <DialogTitle sx={{ borderBottom: '1px solid #2A3547', pb: 2 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3FD0C9]/10 border border-[#3FD0C9]/30 flex items-center justify-center text-[#3FD0C9]">
              <Image className="w-4 h-4" />
            </div>
            <div>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#ECEFF3' }}>
                Gallery & Photos &bull; Suite {room.roomNumber}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8791A3' }}>
                Manage Cloudinary image assets ({images.length}/5 photos)
              </Typography>
            </div>
          </div>
          <IconButton onClick={onClose} size="small" sx={{ color: '#8791A3' }}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
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

        {/* Current Images Grid */}
        <Typography variant="subtitle2" sx={{ color: '#ECEFF3', fontWeight: 600, mb: 2 }}>
          Active Cloudinary Photos
        </Typography>

        {images.length === 0 ? (
          <div className="p-8 text-center bg-[#0A0F1A] border border-dashed border-[#2A3547] rounded-xl mb-6">
            <Image className="w-8 h-8 text-[#8791A3] mx-auto mb-2 opacity-50" />
            <p className="text-sm text-[#8791A3]">No photos uploaded yet for Suite {room.roomNumber}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {images.map((img, idx) => (
              <div
                key={img.publicId || idx}
                className="relative group rounded-xl overflow-hidden border border-[#2A3547] bg-[#0A0F1A] aspect-video"
              >
                <img
                  src={img.url}
                  alt={`Room ${room.roomNumber} photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleDeleteImage(img.publicId)}
                    disabled={deletingId === img.publicId}
                    className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
                    title="Delete Image"
                  >
                    {deletingId === img.publicId ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Section */}
        {images.length < 5 && (
          <div className="p-4 bg-[#0A0F1A] border border-[#2A3547] rounded-xl">
            <Typography variant="subtitle2" sx={{ color: '#ECEFF3', fontWeight: 600, mb: 1 }}>
              Upload New High-Resolution Photos
            </Typography>
            <p className="text-xs text-[#8791A3] mb-3">
              PNG, JPG, or WEBP up to 5MB each. High-definition suite photography recommended.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                type="file"
                multiple
                accept="image/*"
                id="room-photos-input"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="room-photos-input"
                className="px-3.5 py-2 bg-[#1B2433] hover:bg-[#2A3547] border border-[#2A3547] rounded-lg text-xs font-medium text-[#ECEFF3] cursor-pointer flex items-center gap-2"
              >
                <Upload className="w-4 h-4 text-[#3FD0C9]" />
                <span>{selectedFiles.length ? `${selectedFiles.length} file(s) selected` : 'Select Photos'}</span>
              </label>

              {selectedFiles.length > 0 && (
                <Button
                  variant="contained"
                  size="small"
                  disabled={uploading}
                  onClick={handleUpload}
                  sx={{
                    backgroundColor: '#3FD0C9',
                    color: '#0A0F1A',
                    fontWeight: 700,
                    '&:hover': { backgroundColor: '#34b3ad' },
                  }}
                >
                  {uploading ? <CircularProgress size={18} color="inherit" /> : `Upload ${selectedFiles.length} Photos`}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #2A3547', p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#8791A3' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
