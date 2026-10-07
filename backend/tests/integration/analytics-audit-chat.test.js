const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const Payment = require('../../src/models/Payment');
const AuditLog = require('../../src/models/AuditLog');
const ChatSession = require('../../src/models/ChatSession');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
const { ROLES, BOOKING_STATUS, PAYMENT_STATUS, PERMISSIONS } = require('../../src/config/constants');
const DeskService = require('../../src/services/desk.service');

describe('Phase 8: Audit Logging, Analytics & AI Assistant Integration Tests', () => {
  let superAdminUser, superAdminToken;
  let receptionistUser, receptionistToken;
  let guestUser, guestToken;
  let auditorUser, auditorToken;
  let testRoom1, testRoom2;

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Room.init();
    await Booking.init();
    await User.init();
    await Payment.init();
    await AuditLog.init();
    await ChatSession.init();

    // 1. Create Super-Admin
    superAdminUser = await User.create({
      name: 'Executive Super Admin',
      email: 'admin@grandhotel.com',
      password: 'Password123!',
      role: ROLES.SUPER_ADMIN,
    });
    superAdminToken = generateAccessToken(superAdminUser._id);

    // 2. Create Receptionist
    receptionistUser = await User.create({
      name: 'Reception Officer',
      email: 'reception@grandhotel.com',
      password: 'Password123!',
      role: ROLES.RECEPTIONIST,
      permissions: [
        PERMISSIONS.BOOKINGS_VIEW,
        PERMISSIONS.CHECKIN_MANAGE,
        PERMISSIONS.CHECKOUT_MANAGE,
        PERMISSIONS.PAYMENTS_RECORD_CASH,
      ],
    });
    receptionistToken = generateAccessToken(receptionistUser._id);

    // 3. Create Auditor (Staff with audit:view & analytics:view)
    auditorUser = await User.create({
      name: 'Internal Auditor',
      email: 'auditor@grandhotel.com',
      password: 'Password123!',
      role: ROLES.RECEPTIONIST,
      permissions: [PERMISSIONS.AUDIT_VIEW, PERMISSIONS.ANALYTICS_VIEW],
    });
    auditorToken = generateAccessToken(auditorUser._id);

    // 4. Create Regular Guest
    guestUser = await User.create({
      name: 'Hamza Guest',
      email: 'guest@example.com',
      password: 'Password123!',
      role: ROLES.GUEST,
      permissions: [PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_VIEW],
    });
    guestToken = generateAccessToken(guestUser._id);

    // 5. Create Test Rooms
    testRoom1 = await Room.create({
      roomNumber: '801',
      type: 'deluxe',
      description: 'Deluxe City View',
      capacity: 2,
      pricePerNight: 150,
      housekeepingStatus: 'clean',
    });

    testRoom2 = await Room.create({
      roomNumber: '802',
      type: 'suite',
      description: 'Presidential Suite',
      capacity: 4,
      pricePerNight: 300,
      housekeepingStatus: 'clean',
    });
  });

  // ==========================================================================
  // 1. IMMUTABLE AUDIT LOGGING (MGMT-01)
  // ==========================================================================
  describe('1. Immutable Audit Logging (MGMT-01)', () => {
    it('automatically records an audit log when staff permissions are updated', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/auth/users/${receptionistUser._id}/permissions`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          permissions: [
            PERMISSIONS.BOOKINGS_VIEW,
            PERMISSIONS.CHECKIN_MANAGE,
            PERMISSIONS.CHECKOUT_MANAGE,
            PERMISSIONS.PAYMENTS_RECORD_CASH,
            PERMISSIONS.ROOMS_CREATE, // New permission granted
          ],
        });

      expect(updateRes.status).toBe(200);

      // Verify AuditLog record was appended
      const log = await AuditLog.findOne({
        targetType: 'User',
        targetId: receptionistUser._id,
        action: 'staff:permission-update',
      });

      expect(log).toBeDefined();
      expect(log.actorId.toString()).toBe(superAdminUser._id.toString());
      expect(log.beforeState).toBeDefined();
      expect(log.afterState.permissions).toContain(PERMISSIONS.ROOMS_CREATE);
    });

    it('records an audit log when in-person cash payment is taken at front desk', async () => {
      const booking = await Booking.create({
        bookingReference: 'BK-AUDIT-CASH',
        userId: guestUser._id,
        rooms: [{ roomId: testRoom1._id, pricePerNight: 150 }],
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000),
        numberOfGuests: 2,
        totalPrice: 150,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
      });

      await DeskService.recordInPersonPayment({
        bookingId: booking._id.toString(),
        amount: 150,
        paymentMethod: 'cash',
        staffId: receptionistUser._id.toString(),
        staffUser: receptionistUser,
      });

      const auditRecord = await AuditLog.findOne({
        targetType: 'Payment',
        action: 'payment:record-cash',
      });

      expect(auditRecord).toBeDefined();
      expect(auditRecord.actorId.toString()).toBe(receptionistUser._id.toString());
      expect(auditRecord.afterState.amount).toBe(150);
    });

    it('allows authorized auditor to query audit logs and denies unauthorized guest with 403', async () => {
      // Create sample audit entry
      await AuditLog.create({
        actorId: superAdminUser._id,
        action: 'system:startup',
        targetType: 'System',
        targetId: superAdminUser._id,
      });

      // Authorized auditor query
      const auditRes = await request(app)
        .get('/api/v1/admin/audit-log')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body.data.logs)).toBe(true);

      // Unauthorized guest query
      const guestRes = await request(app)
        .get('/api/v1/admin/audit-log')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(guestRes.status).toBe(403);
    });

    it('strictly enforces immutability by blocking updates or deletions on AuditLog', async () => {
      const log = await AuditLog.create({
        actorId: superAdminUser._id,
        action: 'immutable:test',
        targetType: 'System',
        targetId: superAdminUser._id,
      });

      // Attempt to update via Mongoose findOneAndUpdate should reject
      await expect(
        AuditLog.findOneAndUpdate({ _id: log._id }, { action: 'tampered:action' })
      ).rejects.toThrow('AuditLog records are strictly immutable');

      // Attempt to delete should reject
      await expect(
        AuditLog.findOneAndDelete({ _id: log._id })
      ).rejects.toThrow('AuditLog records are strictly immutable');
    });
  });

  // ==========================================================================
  // 2. MANAGERIAL ANALYTICS PIPELINES (MGMT-02)
  // ==========================================================================
  describe('2. Managerial Analytics Pipelines (MGMT-02)', () => {
    beforeEach(async () => {
      // Seed completed booking and payments
      const booking1 = await Booking.create({
        bookingReference: 'BK-ANALYTICS-1',
        userId: guestUser._id,
        rooms: [{ roomId: testRoom1._id, pricePerNight: 150 }],
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000), // 1 night
        numberOfGuests: 2,
        totalPrice: 150,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
      });

      await Payment.create({
        bookingId: booking1._id,
        userId: guestUser._id,
        amount: 150,
        currency: 'USD',
        paymentMethod: 'stripe',
        status: PAYMENT_STATUS.COMPLETED,
      });
    });

    it('computes accurate Revenue, ADR, and RevPAR metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/revenue')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.financials.totalRevenue).toBe(150);
      expect(res.body.data.hospitalityMetrics.totalActiveRooms).toBe(2);
      expect(res.body.data.hospitalityMetrics.adr).toBeGreaterThan(0);
      expect(res.body.data.hospitalityMetrics.revPAR).toBeGreaterThan(0);
    });

    it('computes live occupancy metrics for hotel rooms', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/v1/admin/analytics/occupancy?date=${todayStr}`)
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalRooms).toBe(2);
      expect(res.body.data.occupiedRooms).toBe(1); // booking1 is confirmed for today
      expect(res.body.data.occupancyRate).toBe(50); // 1 / 2 = 50%
    });

    it('rejects unauthorized guest from accessing analytics endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/revenue')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // 3. ROLE-GOVERNED AI CHAT ASSISTANT & CONFIRMATION GATES (MGMT-03)
  // ==========================================================================
  describe('3. Role-Governed AI Chat Assistant & Confirmation Gates (MGMT-03)', () => {
    it('allows guest to use read-only availability query tool', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/v1/chat/user')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          message: 'Show me available rooms',
          toolCallName: 'checkAvailability',
          toolCallArgs: { checkIn: tomorrow, checkOut: nextWeek },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.toolResult.availableCount).toBeDefined();
    });

    it('denies guest from executing staff tools through guest chat (400/403)', async () => {
      const res = await request(app)
        .post('/api/v1/chat/user')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          message: 'Get occupancy stats',
          toolCallName: 'getOccupancyStats',
          toolCallArgs: {},
        });

      expect(res.status).toBe(403);
    });

    it('allows staff to execute operational lookup tools', async () => {
      const res = await request(app)
        .post('/api/v1/chat/staff')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          message: 'Current occupancy metrics',
          toolCallName: 'getOccupancyStats',
          toolCallArgs: {},
        });

      expect(res.status).toBe(200);
      expect(res.body.data.toolResult.totalRooms).toBe(2);
    });

    it('enforces 2-step confirmation challenge when Super-Admin requests booking cancellation via AI', async () => {
      // 1. Create a confirmed booking to cancel
      const booking = await Booking.create({
        bookingReference: 'BK-AI-CANCEL-GATE',
        userId: guestUser._id,
        rooms: [{ roomId: testRoom1._id, pricePerNight: 150 }],
        checkInDate: new Date(Date.now() + 86400000),
        checkOutDate: new Date(Date.now() + 2 * 86400000),
        numberOfGuests: 2,
        totalPrice: 150,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
      });

      await Payment.create({
        bookingId: booking._id,
        userId: guestUser._id,
        amount: 150,
        currency: 'USD',
        paymentMethod: 'cash',
        status: PAYMENT_STATUS.COMPLETED,
      });

      // 2. Step 1: Admin asks AI to cancel -> AI must NOT cancel yet, but return confirmation challenge
      const prepRes = await request(app)
        .post('/api/v1/chat/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          message: 'Please cancel booking BK-AI-CANCEL-GATE',
          toolCallName: 'prepareBookingCancellation',
          toolCallArgs: {
            bookingReference: 'BK-AI-CANCEL-GATE',
            reason: 'Guest had a medical emergency',
          },
        });

      expect(prepRes.status).toBe(200);
      expect(prepRes.body.data.toolResult.requiresConfirmation).toBe(true);
      expect(prepRes.body.data.toolResult.pendingAction.confirmationToken).toBeDefined();

      const { confirmationToken } = prepRes.body.data.toolResult.pendingAction;

      // Verify booking is still CONFIRMED at this stage (zero unauthorized mutations!)
      const uncancelledBooking = await Booking.findById(booking._id);
      expect(uncancelledBooking.status).toBe(BOOKING_STATUS.CONFIRMED);

      // 3. Step 2: Admin submits second call with confirmationToken -> Cancellation executes!
      const confirmRes = await request(app)
        .post('/api/v1/chat/admin/confirm')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          confirmationToken,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.executed).toBe(true);

      // Verify booking is now officially CANCELLED
      const cancelledBooking = await Booking.findById(booking._id);
      expect(cancelledBooking.status).toBe(BOOKING_STATUS.CANCELLED);
    });
  });
});
