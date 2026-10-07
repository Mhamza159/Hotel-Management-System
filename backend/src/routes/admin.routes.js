const express = require('express');
const AdminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const { PERMISSIONS } = require('../config/constants');
const analyticsRoutes = require('./analytics.routes');

const router = express.Router();

// Mount analytics routes under /api/v1/admin/analytics
router.use('/analytics', analyticsRoutes);

// GET /api/v1/admin/audit-log
router.get(
  '/audit-log',
  authenticate,
  requirePermission(PERMISSIONS.AUDIT_VIEW),
  AdminController.getAuditLogs
);

// GET /api/v1/admin/bookings
router.get(
  '/bookings',
  authenticate,
  requirePermission(PERMISSIONS.BOOKINGS_VIEW),
  AdminController.getAllBookings
);

module.exports = router;
