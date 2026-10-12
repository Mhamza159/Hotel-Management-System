const express = require('express');
const SyncController = require('../controllers/sync.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const ApiError = require('../utils/apiError');
const { ROLES } = require('../config/constants');

const router = express.Router();

/**
 * ============================================================================
 * SYNC ROUTES (/api/v1/sync)
 * ============================================================================
 *
 * push / pull bade EJSON batches hote hain: app.js inhein 16kb wale global JSON
 * parser aur general rate limiter se bahar rakhta hai. Yahan pehle hub key check
 * hoti hai, phir body parse — ghalat key wali bari request parse hi nahi hoti.
 */
const SYNC_BODY_LIMIT = '4mb'; // Vercel request body limit 4.5MB se kam

router.post('/push', SyncController.authenticateHub, express.json({ limit: SYNC_BODY_LIMIT }), SyncController.push);
router.post('/pull', SyncController.authenticateHub, express.json({ limit: '1mb' }), SyncController.pull);

// Public: website booking page "hotel offline" message dikhane ke liye
router.get('/availability', SyncController.availability);

// Staff (guest nahi): desktop app ka sync indicator / conflicts list
const requireStaff = (req, res, next) =>
  req.user && req.user.role !== ROLES.GUEST ? next() : next(ApiError.forbidden('Staff only'));
router.get('/status', authenticate, requireStaff, SyncController.status);

module.exports = router;
