const config = require('../config/env');
const logger = require('../utils/logger');
const SyncState = require('../models/SyncState');
const { collectChanges, applyChanges, SYNCED, TOMBSTONES } = require('./syncStore');
const { encode, decode } = require('./wire');
const { processMediaJobs } = require('./mediaQueue');

/**
 * ============================================================================
 * HUB SYNC AGENT — hotel hub par chalta hai (server.js start karta hai)
 * ============================================================================
 *
 * Har SYNC_INTERVAL_MS baad:
 *   1. PUSH: hub par hui tabdeeliyan (syncOrigin 'hub') cloud ko bhejo
 *   2. PULL: cloud ki tabdeeliyan (website bookings, guests, reviews...) le kar lagao
 * Cursors SyncState('hub') me save hote hain, is liye internet / bijli jaane ke
 * baad wahin se dobara shuru hota hai. Har pull cloud ke liye "hub zinda hai"
 * ka signal bhi hai — is ke baghair cloud website booking band kar deta hai.
 */

const STATE_ID = 'hub';
const MAX_ROUNDS = 50; // ek cycle me zyada se zyada itne batches (bari backlog dheere dheere nikalti hai)
const REQUEST_TIMEOUT_MS = 30000;

class HubSyncAgent {
  static timer = null;
  static running = null;
  static stopped = true;

  static isEnabled() {
    return config.sync.node === 'hub' && Boolean(config.sync.cloudUrl) && Boolean(config.sync.sharedKey);
  }

  static start() {
    if (!HubSyncAgent.isEnabled()) {
      if (config.sync.node === 'hub') {
        logger.warn('[SYNC] Hub sync is off: set CLOUD_SYNC_URL and SYNC_SHARED_KEY in hub.env to enable it.');
      }
      return;
    }
    HubSyncAgent.stopped = false;
    logger.info(`[SYNC] Hub sync agent started (every ${config.sync.intervalMs} ms) -> ${config.sync.cloudUrl}`);
    HubSyncAgent.schedule(1000);
  }

  static stop() {
    HubSyncAgent.stopped = true;
    if (HubSyncAgent.timer) clearTimeout(HubSyncAgent.timer);
    HubSyncAgent.timer = null;
  }

  static schedule(delayMs) {
    if (HubSyncAgent.stopped) return;
    HubSyncAgent.timer = setTimeout(async () => {
      await HubSyncAgent.runOnce().catch(() => {});
      HubSyncAgent.schedule(config.sync.intervalMs);
    }, delayMs);
    if (HubSyncAgent.timer.unref) HubSyncAgent.timer.unref();
  }

  static async request(path, payload) {
    const response = await fetch(`${config.sync.cloudUrl}/sync/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.sync.sharedKey}`,
      },
      body: JSON.stringify(encode(payload)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch (e) {
      body = null;
    }
    if (!response.ok || !body || !body.success) {
      throw new Error(`Cloud ${path} failed: HTTP ${response.status}${body && body.message ? ` - ${body.message}` : ''}`);
    }
    return decode(body.data);
  }

  /**
   * Ek poora push + pull cycle. Ek waqt me ek hi chalta hai.
   * @returns {Promise<{ pushed: number, pulled: number, conflicts: Object[] } | { error: string }>}
   */
  static async runOnce() {
    if (HubSyncAgent.running) return HubSyncAgent.running;
    HubSyncAgent.running = HubSyncAgent.cycle().finally(() => {
      HubSyncAgent.running = null;
    });
    return HubSyncAgent.running;
  }

  static async cycle() {
    const startedAt = new Date();
    const state = await SyncState.findOneAndUpdate(
      { _id: STATE_ID },
      { $setOnInsert: { pushCursors: {}, pullCursors: {} } },
      { upsert: true, new: true }
    ).lean();

    const conflicts = [];
    let pushed = 0;
    let pulled = 0;

    try {
      // 1. PUSH
      let pushCursors = state.pushCursors || {};
      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const batch = await collectChanges({ origin: 'hub', cursors: pushCursors });
        if (batch.count === 0) break;
        const result = await HubSyncAgent.request('push', { changes: batch.changes });
        conflicts.push(...(result.conflicts || []));
        pushCursors = batch.cursors;
        await SyncState.updateOne({ _id: STATE_ID }, { $set: { pushCursors } });
        pushed += batch.count;
        if (!batch.hasMore) break;
      }

      // 2. PULL (khaali ho tab bhi — ye cloud ke liye hub ka heartbeat hai)
      let pullCursors = state.pullCursors || {};
      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const batch = await HubSyncAgent.request('pull', { cursors: pullCursors });
        if (batch.count > 0) {
          const result = await applyChanges(batch.changes);
          conflicts.push(...result.conflicts);
          pulled += result.applied;
        }
        pullCursors = batch.cursors || pullCursors;
        await SyncState.updateOne({ _id: STATE_ID }, { $set: { pullCursors } });
        if (!batch.hasMore) break;
      }

      // 3. Offline me upload hui room photos Cloudinary par (cloud ke signed params se)
      const media = await processMediaJobs((path, payload) => HubSyncAgent.request(path, payload));

      const update = { $set: { lastSuccessAt: new Date(), lastAttemptAt: startedAt, lastError: null } };
      if (conflicts.length > 0) {
        update.$push = {
          recentConflicts: { $each: conflicts.map((c) => ({ ...c, at: new Date() })), $slice: -50 },
        };
      }
      await SyncState.updateOne({ _id: STATE_ID }, update);
      if (pushed || pulled || conflicts.length || media.uploaded || media.destroyed) {
        logger.info(
          `[SYNC] pushed ${pushed}, pulled ${pulled}, conflicts ${conflicts.length}, photos uploaded ${media.uploaded}`
        );
      }
      return { pushed, pulled, conflicts, media };
    } catch (error) {
      await SyncState.updateOne(
        { _id: STATE_ID },
        { $set: { lastAttemptAt: startedAt, lastError: error.message } }
      ).catch(() => {});
      logger.warn(`[SYNC] cycle failed (will retry): ${error.message}`);
      return { error: error.message, pushed, pulled, conflicts };
    }
  }

  /** Hub par abhi tak cloud ko na bheji gayi tabdeeliyan */
  static async countPending(pushCursors = {}) {
    let pending = 0;
    for (const name of [...SYNCED.map((entry) => entry.name), TOMBSTONES]) {
      const collection =
        name === TOMBSTONES
          ? require('../models/SyncTombstone').collection
          : SYNCED.find((entry) => entry.name === name).model().collection;
      const cursor = pushCursors[name];
      const filter = { syncOrigin: 'hub' };
      if (cursor && cursor.ts) {
        filter.$or = [
          { syncUpdatedAt: { $gt: cursor.ts } },
          { syncUpdatedAt: cursor.ts, _id: { $gt: cursor.id } },
        ];
      }
      pending += await collection.countDocuments(filter);
    }
    return pending;
  }
}

module.exports = HubSyncAgent;
