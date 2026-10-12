const express = require('express');
const SyncController = require('../controllers/sync.controller');

const router = express.Router();

/**
 * MEDIA ROUTES (/api/v1/media) — hotel hub par
 * GET /pending/:id: wo room photo jo abhi Cloudinary par upload nahi hui
 * (<img> tag token nahi bhejta, is liye public; id ek random ObjectId hai)
 */
router.get('/pending/:id', SyncController.pendingMedia);

module.exports = router;
