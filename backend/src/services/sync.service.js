const crypto = require('crypto');
const config = require('../config/env');
const SyncState = require('../models/SyncState');
const Booking = require('../models/Booking');
const ApiError = require('../utils/apiError');
const { collectChanges, applyChanges } = require('../sync/syncStore');
const HubSyncAgent = require('../sync/hubAgent');
const { ROOM_HOLDING_STATUSES } = require('../sync/bookingRanges');
const { cloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// Hub sirf apne hotel ke folder me photo daal / hata sake
const MEDIA_FOLDER = /^hotel-management\/[\w/-]{1,200}$/;

/**
 * ============================================================================
 * SYNC SERVICE — cloud side endpoints + website booking gate + status
 * ============================================================================
 *
 * Cloud (Vercel) par: hub /sync/push aur /sync/pull bulata hai (shared key ke saath).
 * Har call "hub online" ka waqt save karta hai. Option 1 (sirf jab
 * HUB_OFFLINE_BOOKING_GATE=true): hub HUB_OFFLINE_AFTER_MS se zyada der gayab rahe
 * to website par nayi booking band. Default me booking chalti rehti hai.
 *
 * SYNC_SHARED_KEY cloud par set na ho to sync band hai aur website pehle jaisi
 * chalti hai (koi gate nahi).
 */
class SyncService {
  static isCloudSyncEnabled() {
    return config.sync.node === 'cloud' && Boolean(config.sync.sharedKey);
  }

  /** Bearer key constant-time compare (key ki lambai bhi leak na ho) */
  static verifyHubKey(authorizationHeader = '') {
    const provided = authorizationHeader.startsWith('Bearer ') ? authorizationHeader.slice(7) : '';
    const digest = (value) => crypto.createHash('sha256').update(value).digest();
    return provided.length > 0 && crypto.timingSafeEqual(digest(provided), digest(config.sync.sharedKey));
  }

  static async recordHubContact() {
    await SyncState.updateOne(
      { _id: 'cloud' },
      { $set: { lastHubContactAt: new Date() } },
      { upsert: true }
    );
  }

  static async receivePush(changes) {
    await SyncService.recordHubContact();
    return applyChanges(changes || {});
  }

  static async servePull(cursors, limit) {
    await SyncService.recordHubContact();
    const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    return collectChanges({ origin: 'cloud', cursors: cursors || {}, limit: safeLimit });
  }

  /**
   * Website par nayi booking ho sakti hai?
   * @returns {Promise<{ available: boolean, reason: string|null, lastHubContactAt: Date|null }>}
   */
  static async getOnlineBookingAvailability() {
    if (!SyncService.isCloudSyncEnabled()) {
      return { available: true, reason: null, lastHubContactAt: null };
    }
    const state = await SyncState.findById('cloud').lean();
    const last = state && state.lastHubContactAt ? state.lastHubContactAt : null;
    const hubOnline = Boolean(last && Date.now() - last.getTime() <= config.sync.hubOfflineAfterMs);
    // Gate band (default): hub offline ho tab bhi booking chalti hai
    const available = hubOnline || !config.sync.hubOfflineBookingGate;
    return { available, reason: available ? null : 'hotel-offline', lastHubContactAt: last, hubOnline };
  }

  static async assertOnlineBookingAvailable() {
    const { available } = await SyncService.getOnlineBookingAvailability();
    if (!available) {
      throw new ApiError(
        503,
        'Online booking is temporarily unavailable because the hotel system is offline. Please try again shortly or contact the hotel.'
      );
    }
  }

  /**
   * Hub ki pending photo ke liye signed Cloudinary upload params. Hub in se seedha
   * Cloudinary par upload karta hai — API secret kabhi hub tak nahi jata.
   */
  static async signMediaUpload(folder) {
    await SyncService.recordHubContact();
    const { cloudName, apiKey, apiSecret } = config.cloudinary;
    if (config.env === 'test' || !apiKey || !apiSecret || cloudName === 'placeholder' || apiSecret === 'placeholder') {
      return { mode: 'mock' };
    }
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      folder: MEDIA_FOLDER.test(folder || '') ? folder : 'hotel-management/rooms',
      format: 'webp',
      transformation: 'q_auto:good',
    };
    const signature = cloudinary.utils.api_sign_request({ ...params, timestamp }, apiSecret);
    return { mode: 'cloudinary', cloudName, apiKey, timestamp, signature, params };
  }

  static async destroyMedia(publicId) {
    await SyncService.recordHubContact();
    if (!MEDIA_FOLDER.test(publicId || '')) {
      throw ApiError.badRequest('Only hotel-management images can be deleted');
    }
    await deleteFromCloudinary(publicId);
    return { deleted: true };
  }

  /** Staff ke liye: hub par cloud sync ka haal; cloud par booking gate ka haal */
  static async getStatus() {
    const conflictBookings = await Booking.find({
      syncConflict: { $ne: null },
      status: { $in: ROOM_HOLDING_STATUSES },
    })
      .select('bookingReference checkInDate checkOutDate status syncConflict')
      .sort({ checkInDate: 1 })
      .limit(50)
      .lean();

    if (config.sync.node === 'cloud') {
      return {
        node: 'cloud',
        enabled: SyncService.isCloudSyncEnabled(),
        onlineBooking: await SyncService.getOnlineBookingAvailability(),
        conflictBookings,
      };
    }

    const state = (await SyncState.findById('hub').lean()) || {};
    const lastSuccessAt = state.lastSuccessAt || null;
    // 3 cycles + thori gunjaish tak kamyabi na ho to "offline"
    const onlineWindowMs = config.sync.intervalMs * 3 + 30000;
    return {
      node: 'hub',
      enabled: HubSyncAgent.isEnabled(),
      online: Boolean(lastSuccessAt && Date.now() - new Date(lastSuccessAt).getTime() <= onlineWindowMs),
      lastSuccessAt,
      lastAttemptAt: state.lastAttemptAt || null,
      lastError: state.lastError || null,
      pendingChanges: await HubSyncAgent.countPending(state.pushCursors || {}),
      recentConflicts: (state.recentConflicts || []).slice(-10),
      conflictBookings,
    };
  }
}

module.exports = SyncService;
