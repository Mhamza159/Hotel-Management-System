const ApiError = require("../utils/apiError");
const { REFUND_TIERS } = require("../config/constants");

/**
 * ============================================================================
 * REFUND CALCULATION SERVICE (Authoritative Server-Side Refund Engine)
 * ============================================================================
 *
 * Yeh service Hotel Cancellation Policy ke mutabiq refund calculate karne ka
 * pure mathematical engine hai.
 *
 * Ahem Architectural & Security Principles:
 * 1. Zero Client Trust (Server Authority):
 *    Frontend se aane wale kisi bhi percentage ya refund amount par bharosa nahi kiya jata.
 *    Server khud check-in date aur current server time ka farq (difference) nikaalta hai.
 * 2. Advance Payment Check (Aapka Mandate):
 *    Agar guest ne advance payment nahi ki (`totalPaid <= 0`), toh refund zero ($0) banta hai
 *    aur koi payment gateway call nahi hoti (Early exit / Guard clause).
 * 3. Exact Time Boundaries (Constants-driven Tiers):
 *    - >= 48 Hours: 100% Refund
 *    - 24 se 48 Hours: 50% Refund
 *    - < 24 Hours: 0% Refund
 *    - Check-in time guzar chuka ho: 'no-show' (0% Refund)
 */
class RefundService {
  /**
   * Calculates the authoritative refund tier, percentage, and exact refund amount.
   *
   * @param {Object} params
   * @param {Date|string} params.checkInDate - Mehmaan ki check-in tareekh
   * @param {number} params.totalPaid - Guest ne ab tak total kitne paise physically/online ada kiye
   * @param {Date} [params.currentTime] - Unit testing ke liye optional mock time (default: new Date())
   * @returns {Object} { appliedTier, refundPercentage, refundAmount, hoursUntilCheckIn, message }
   */
  static calculateRefundTier({ checkInDate, totalPaid, currentTime = new Date() }) {
    // ------------------------------------------------------------------------
    // STEP 1: DATE SANITIZATION & VALIDATION (Tareekh Ka Jaiza)
    // ------------------------------------------------------------------------
    // Check-in date ka mojood hona zaroori hai
    if (!checkInDate) {
      throw ApiError.badRequest("Check-in date is required for refund tier calculation");
    }

    // String date ko JavaScript ke native Date object me convert karein
    const checkIn = new Date(checkInDate);
    const now = new Date(currentTime);

    // Check karein ke dates valid formats me hain ya nahi
    if (isNaN(checkIn.getTime()) || isNaN(now.getTime())) {
      throw ApiError.badRequest("Invalid date format provided for check-in or current time");
    }

    // ------------------------------------------------------------------------
    // STEP 2: ADVANCE PAYMENT INTEGRITY CHECK (User Mandate - Guard Clause)
    // ------------------------------------------------------------------------
    // Rule: Agar guest ne koi advance payment nahi ki (e.g. Pay-at-Desk choose kiya tha
    // aur ab tak $0 diye hain), toh kisi bhi refund ki zaroorat nahi hai. Foran exit karein!
    const paidAmount = Number(totalPaid) || 0;

    if (paidAmount <= 0) {
      return {
        appliedTier: "no-advance-payment",
        refundPercentage: 0,
        refundAmount: 0,
        hoursUntilCheckIn: null,
        message: "No advance payment was made for this reservation. Zero refund required.",
      };
    }

    // ------------------------------------------------------------------------
    // STEP 3: MATHEMATICAL TIME DIFFERENCE (Hours Calculation)
    // ------------------------------------------------------------------------
    // Check-in time aur current time ka difference milliseconds me nikaalein:
    const diffInMilliseconds = checkIn.getTime() - now.getTime();

    // Milliseconds ko ghanton (Hours) me convert karein:
    // Formula: 1 Hour = 1000 ms * 60 seconds * 60 minutes = 3,600,000 ms
    const hoursUntilCheckIn = diffInMilliseconds / (1000 * 60 * 60);

    // ------------------------------------------------------------------------
    // STEP 4: TIER MATCHING ALGORITHM (Qawaneen Ka Itlaaq)
    // ------------------------------------------------------------------------
    let appliedTier = "0%";
    let refundPercentage = 0;

    // CASE 1: No-Show (Check-in ka waqt guzar chuka hai)
    // Agar hours negative hain, iska matlab guest waqt par nahi aaya aur stay start ho chuka tha.
    if (hoursUntilCheckIn < 0) {
      appliedTier = "no-show";
      refundPercentage = 0;
    }
    // CASE 2: Full Refund Tier (48 Ghantay ya us se pehle cancellation)
    // Hotel ke paas kamra dobara kisi aur ko bechne ke liye kaafi waqt hai.
    else if (hoursUntilCheckIn >= REFUND_TIERS.FULL.minHours) {
      appliedTier = "100%";
      refundPercentage = REFUND_TIERS.FULL.percentage; // 100
    }
    // CASE 3: Partial Refund Tier (24 se 48 Ghantay ke darmayan)
    // Hotel 50% late cancellation penalty rakhta hai aur 50% wapis karta hai.
    else if (hoursUntilCheckIn >= REFUND_TIERS.HALF.minHours) {
      appliedTier = "50%";
      refundPercentage = REFUND_TIERS.HALF.percentage; // 50
    }
    // CASE 4: Zero Refund Tier (Aakhri 24 Ghanton ke andar)
    // Aakhri lamhaat me cancellation se hotel ka kamra khali reh jata hai, zero refund.
    else {
      appliedTier = "0%";
      refundPercentage = REFUND_TIERS.NONE.percentage; // 0
    }

    // ------------------------------------------------------------------------
    // STEP 5: FINANCIAL AMOUNT COMPUTATION (Exact Refund Calculation)
    // ------------------------------------------------------------------------
    // Exact dollar amount calculate karein aur cents ko 2 decimal places tak round karein:
    const refundAmount = Number(((paidAmount * refundPercentage) / 100).toFixed(2));

    return {
      appliedTier,
      refundPercentage,
      refundAmount,
      hoursUntilCheckIn: Number(hoursUntilCheckIn.toFixed(1)),
      message: `Cancellation processed under ${appliedTier} tier. Refund amount: $${refundAmount}.`,
    };
  }
}

module.exports = RefundService;
