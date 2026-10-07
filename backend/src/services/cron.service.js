const cron = require("node-cron");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const logger = require("../utils/logger");
const { BOOKING_STATUS } = require("../config/constants");
const WaitlistService = require("./waitlist.service");

/**
 * ============================================================================
 * CRON SERVICE (Automated Background Task Scheduler & Inventory Watchdog)
 * ============================================================================
 *
 * Yeh service background me waqt ba waqt chalti hai aur aese kaam anjaam deti hai
 * jo kisi user ke button dabane ke mohtaaj nahi hote:
 *
 * 1. 15-Minute Unpaid Booking Auto-Release:
 *    Agar kisi guest ne online checkout shuru kiya magar 15 minute ke andar payment
 *    mukammal nahi ki, toh yeh service database se expired bookings ko dhoond kar:
 *    - Unhe automatically cancel kar deti hai.
 *    - Kamron ke reserved date locks (`reservedRanges`) foran release kar deti hai.
 *    - Kamray website par doosre customers ke liye foran available ho jaate hain.
 *
 * 2. Scheduled Job Management:
 *    `initScheduledJobs` ke zariye jobs shuru karta hai aur server band hone par
 *    `stopScheduledJobs` ke zariye memory leaks se bachane ke liye safely stop karta hai.
 */
class CronService {
  // Active cron tasks ki list taake zaroorat parne par inhe stop kiya ja sake
  static activeJobs = [];

  /**
   * --------------------------------------------------------------------------
   * 1. RELEASE EXPIRED UNPAID BOOKINGS
   * --------------------------------------------------------------------------
   * Yeh core worker function hai jo expired pending bookings ko dhoond kar
   * cancel karta hai aur inventory unlock karta hai.
   *
   * Note: `now` parameter pass karne ki sahulat is liye rakhi gayi hai taake
   * unit tests me hum kisi bhi waqt ko mock karke 15 minute intezar kiye baghair
   * is function ko 1 second me test kar sakein!
   *
   * @param {Date|string} [now=new Date()] - Mojooda waqt (default: current system time)
   * @returns {Promise<Object>} { releasedCount, bookingReferences }
   */
  static async releaseExpiredBookings(now = new Date()) {
    const currentTime = new Date(now);

    // Database me aisi tamam bookings dhoondein jo:
    // 1. Status 'pending' ho
    // 2. Payment 'unpaid' ho
    // 3. Aur expiresAt ka waqt guzar chuka ho (expiresAt <= currentTime)
    const expiredBookings = await Booking.find({
      status: BOOKING_STATUS.PENDING,
      paymentStatus: "unpaid",
      expiresAt: { $lte: currentTime },
    });

    if (!expiredBookings || expiredBookings.length === 0) {
      return {
        releasedCount: 0,
        bookingReferences: [],
      };
    }

    const releasedReferences = [];

    // Har expired booking ko process karein:
    for (const booking of expiredBookings) {
      try {
        // Step A: Room Inventory Release (Kamre ko foran unlock karna)
        // Booking me shamil tamam rooms ke IDs nikaalein
        const roomIds = booking.rooms.map((r) => r.roomId);
        if (roomIds.length > 0) {
          await Room.updateMany(
            { _id: { $in: roomIds } },
            {
              $pull: {
                reservedRanges: { bookingReference: booking.bookingReference },
              },
            },
          );
        }

        // Step B: Booking Status ko Cancelled karna
        booking.status = BOOKING_STATUS.CANCELLED;
        booking.cancellation = {
          cancelledAt: currentTime,
          reason:
            "Auto-cancelled: 5-minute checkout timer expired without payment",
          appliedTier: "no-advance-payment",
          refundAmount: 0,
        };

        await booking.save();
        releasedReferences.push(booking.bookingReference);

        // Notify matching waitlist entries for freed room inventory
        const freedRooms = await Room.find({ _id: { $in: roomIds } });
        for (const room of freedRooms) {
          await WaitlistService.notifyMatchingWaitlists({
            roomType: room.type,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            room,
          });
        }

        logger.info(
          `[CRON WATCHDOG] Expired pending booking '${booking.bookingReference}' successfully auto-cancelled and room inventory released.`,
        );
      } catch (err) {
        logger.error(
          `[CRON ERROR] Failed to release expired booking '${booking.bookingReference}': ${err.message}`,
        );
      }
    }

    return {
      releasedCount: releasedReferences.length,
      bookingReferences: releasedReferences,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * 2. INITIALIZE SCHEDULED JOBS
   * --------------------------------------------------------------------------
   * Server start hone par node-cron timers initialize karta hai.
   */
  static initScheduledJobs() {
    logger.info("[CRON] Initializing automated background cron jobs...");

    // Job 1: Har 2 minute baad expired bookings check karein
    // Cron expression: '*/2 * * * *' (Every 2 minutes)
    const expiredBookingsJob = cron.schedule("* * * * *", async () => {
      try {
        const result = await CronService.releaseExpiredBookings();
        if (result.releasedCount > 0) {
          logger.info(
            `[CRON] Auto-released ${result.releasedCount} expired booking(s): ${result.bookingReferences.join(", ")}`,
          );
        }
      } catch (error) {
        logger.error(
          `[CRON JOB ERROR] Error during expired bookings release: ${error.message}`,
        );
      }
    });

    this.activeJobs.push(expiredBookingsJob);
    logger.info(
      "[CRON] Expired bookings auto-release job scheduled (Every 2 minutes).",
    );
  }

  /**
   * --------------------------------------------------------------------------
   * 3. STOP SCHEDULED JOBS
   * --------------------------------------------------------------------------
   * Tests run karte waqt ya server shutdown ke waqt background timers ko rokna.
   */
  static stopScheduledJobs() {
    for (const job of this.activeJobs) {
      if (job && typeof job.stop === "function") {
        job.stop();
      }
    }
    this.activeJobs = [];
    logger.info("[CRON] All scheduled background jobs stopped.");
  }
}

module.exports = CronService;
