const AnalyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * ============================================================================
 * ANALYTICS CONTROLLER (MGMT-02: Business Intelligence & Hospitality KPIs)
 * ============================================================================
 */
class AnalyticsController {
  /**
   * GET /api/v1/admin/analytics/revenue
   * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Computes Total Revenue, Net Revenue, ADR, and RevPAR.
   * Gated: analytics:view permission or Super-Admin bypass.
   */
  static async getRevenueMetrics(req, res, next) {
    try {
      const { from, to } = req.query;
      const metrics = await AnalyticsService.getRevenueMetrics({ from, to });

      return ApiResponse.success(res, 200, metrics, 'Revenue analytics computed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/analytics/occupancy
   * Query params: ?date=YYYY-MM-DD
   * Computes hotel physical room occupancy rate for the specified date.
   * Gated: analytics:view permission or Super-Admin bypass.
   */
  static async getOccupancyMetrics(req, res, next) {
    try {
      const { date } = req.query;
      const metrics = await AnalyticsService.getOccupancyMetrics({ date });

      return ApiResponse.success(res, 200, metrics, 'Occupancy analytics computed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/analytics/payments/search
   * Query params: ?query=...
   * Searches for a payment record by Payment ID, Booking Reference, or POS Slip.
   * Deeply populates Payer (Guest), Receiver (Staff), and Suite details,
   * plus queries matching AuditLog records.
   * Gated: analytics:view permission or Super-Admin bypass.
   */
  static async searchPayment(req, res, next) {
    try {
      const { query } = req.query;
      const result = await AnalyticsService.searchPayment(query);

      return ApiResponse.success(
        res,
        200,
        result,
        'Payment transaction audit record retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnalyticsController;

