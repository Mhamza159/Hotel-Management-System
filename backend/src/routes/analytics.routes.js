const express = require('express');
const AnalyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const { PERMISSIONS } = require('../config/constants');

const router = express.Router();

// GET /api/v1/admin/analytics/revenue
router.get(
  '/revenue',
  authenticate,
  requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  AnalyticsController.getRevenueMetrics
);

// GET /api/v1/admin/analytics/occupancy
router.get(
  '/occupancy',
  authenticate,
  requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  AnalyticsController.getOccupancyMetrics
);

// GET /api/v1/admin/analytics/payments/search?query=...
router.get(
  '/payments/search',
  authenticate,
  requirePermission(PERMISSIONS.ANALYTICS_VIEW),
  AnalyticsController.searchPayment
);

module.exports = router;
