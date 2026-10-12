const SyncService = require('../services/sync.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { encode, decode } = require('../sync/wire');

/**
 * ============================================================================
 * SYNC CONTROLLER (/api/v1/sync)
 * ============================================================================
 * push / pull: sirf hotel hub (shared key) — EJSON payloads
 * availability: public — website booking khuli hai ya nahi
 * status: staff — sync / gate ka haal
 */
class SyncController {
  /** Hub key check. Cloud par sync band ho to route maujood hi nahi (404). */
  static authenticateHub(req, res, next) {
    if (!SyncService.isCloudSyncEnabled()) {
      return next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
    }
    if (!SyncService.verifyHubKey(req.headers.authorization || '')) {
      return next(ApiError.unauthorized('Invalid sync key'));
    }
    return next();
  }

  static async push(req, res, next) {
    try {
      const { changes } = decode(req.body || {});
      const results = await SyncService.receivePush(changes);
      return ApiResponse.success(res, 200, encode(results), 'Changes applied');
    } catch (error) {
      next(error);
    }
  }

  static async pull(req, res, next) {
    try {
      const { cursors, limit } = decode(req.body || {});
      const batch = await SyncService.servePull(cursors, limit);
      return ApiResponse.success(res, 200, encode(batch), 'Changes collected');
    } catch (error) {
      next(error);
    }
  }

  static async availability(req, res, next) {
    try {
      const availability = await SyncService.getOnlineBookingAvailability();
      return ApiResponse.success(res, 200, availability, 'Online booking availability');
    } catch (error) {
      next(error);
    }
  }

  static async status(req, res, next) {
    try {
      const status = await SyncService.getStatus();
      return ApiResponse.success(res, 200, status, 'Sync status');
    } catch (error) {
      next(error);
    }
  }

  /** Website booking routes ke aage: hub offline ho to 503 (option 1) */
  static async requireHubOnline(req, res, next) {
    try {
      await SyncService.assertOnlineBookingAvailable();
      next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SyncController;
