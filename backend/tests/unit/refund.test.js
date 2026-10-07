const RefundService = require("../../src/services/refund.service");

/**
 * ============================================================================
 * REFUND CALCULATION SERVICE UNIT TESTS
 * ============================================================================
 * 
 * Yeh tests RefundService ke tamam boundary conditions ko verify karte hain:
 * 1. > 48 hours before check-in -> 100% refund.
 * 2. 24 - 48 hours before check-in -> 50% refund.
 * 3. < 24 hours before check-in -> 0% refund.
 * 4. Advance payment zero ($0) -> 0% refund & 'no-advance-payment' tier.
 * 5. Check-in date passed -> 'no-show' 0% refund.
 * 6. Invalid dates -> throws 400 Bad Request ApiError.
 */
describe("Refund Calculation Service Unit Verification", () => {
  const baseCheckIn = new Date("2026-10-10T14:00:00.000Z");

  // --------------------------------------------------------------------------
  // TEST 1: > 48 Hours Before Check-in (100% Refund Tier)
  // --------------------------------------------------------------------------
  it("awards 100% refund when cancelled 50 hours before check-in", () => {
    // 50 hours pehle ka waqt (10 Oct 14:00 se 50 hours pehle = 8 Oct 12:00)
    const mockNow = new Date("2026-10-08T12:00:00.000Z");
    const totalPaid = 300;

    const result = RefundService.calculateRefundTier({
      checkInDate: baseCheckIn,
      totalPaid,
      currentTime: mockNow,
    });

    expect(result.appliedTier).toBe("100%");
    expect(result.refundPercentage).toBe(100);
    expect(result.refundAmount).toBe(300);
    expect(result.hoursUntilCheckIn).toBe(50);
  });

  // --------------------------------------------------------------------------
  // TEST 2: 24 - 48 Hours Before Check-in (50% Refund Tier)
  // --------------------------------------------------------------------------
  it("awards 50% refund when cancelled 30 hours before check-in", () => {
    // 30 hours pehle ka waqt (10 Oct 14:00 se 30 hours pehle = 9 Oct 08:00)
    const mockNow = new Date("2026-10-09T08:00:00.000Z");
    const totalPaid = 200;

    const result = RefundService.calculateRefundTier({
      checkInDate: baseCheckIn,
      totalPaid,
      currentTime: mockNow,
    });

    expect(result.appliedTier).toBe("50%");
    expect(result.refundPercentage).toBe(50);
    expect(result.refundAmount).toBe(100);
    expect(result.hoursUntilCheckIn).toBe(30);
  });

  // --------------------------------------------------------------------------
  // TEST 3: < 24 Hours Before Check-in (0% Refund Tier)
  // --------------------------------------------------------------------------
  it("awards 0% refund when cancelled 10 hours before check-in", () => {
    // 10 hours pehle ka waqt (10 Oct 04:00)
    const mockNow = new Date("2026-10-10T04:00:00.000Z");
    const totalPaid = 250;

    const result = RefundService.calculateRefundTier({
      checkInDate: baseCheckIn,
      totalPaid,
      currentTime: mockNow,
    });

    expect(result.appliedTier).toBe("0%");
    expect(result.refundPercentage).toBe(0);
    expect(result.refundAmount).toBe(0);
    expect(result.hoursUntilCheckIn).toBe(10);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Advance Payment Rule (Aapka Mandate)
  // --------------------------------------------------------------------------
  it("returns zero refund if no advance payment was made ($0 paid)", () => {
    // 60 hours pehle hai lekin guest ne $0 diye the
    const mockNow = new Date("2026-10-08T02:00:00.000Z");
    const totalPaid = 0;

    const result = RefundService.calculateRefundTier({
      checkInDate: baseCheckIn,
      totalPaid,
      currentTime: mockNow,
    });

    expect(result.appliedTier).toBe("no-advance-payment");
    expect(result.refundPercentage).toBe(0);
    expect(result.refundAmount).toBe(0);
    expect(result.message).toContain("No advance payment was made");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Past Check-in Date (No-Show)
  // --------------------------------------------------------------------------
  it("awards 0% refund with 'no-show' tier when cancellation is attempted after check-in time", () => {
    // Check-in time ke 2 ghantay baad
    const mockNow = new Date("2026-10-10T16:00:00.000Z");
    const totalPaid = 150;

    const result = RefundService.calculateRefundTier({
      checkInDate: baseCheckIn,
      totalPaid,
      currentTime: mockNow,
    });

    expect(result.appliedTier).toBe("no-show");
    expect(result.refundPercentage).toBe(0);
    expect(result.refundAmount).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Validation Errors
  // --------------------------------------------------------------------------
  it("throws 400 ApiError when checkInDate is missing or invalid", () => {
    expect(() => {
      RefundService.calculateRefundTier({ checkInDate: null, totalPaid: 100 });
    }).toThrow("Check-in date is required");

    expect(() => {
      RefundService.calculateRefundTier({ checkInDate: "invalid-date-string", totalPaid: 100 });
    }).toThrow("Invalid date format");
  });
});
