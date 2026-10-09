const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const Payment = require('../../src/models/Payment');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
const {
  ROLES,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PERMISSIONS,
} = require('../../src/config/constants');

/**
 * ============================================================================
 * CRITICAL SECURITY & WORKFLOW REGRESSION TESTS
 * ============================================================================
 *
 * 1. Walk-in endpoint guests ke liye band hai aur counter payment par PBAC lagta hai.
 * 2. Desk par pay hone wali web bookings foran confirmed hoti hain (expiry nahi).
 * 3. Bina body ke cancellation approve 500 nahi deta.
 * 4. `staff:manage` holder super-admin escalation nahi kar sakta.
 */
describe('Critical Fixes Regression Tests', () => {
  let room;
  let guestUser, guestToken;
  let receptionistUser, receptionistToken;
  let superAdminUser, superAdminToken;

  const futureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

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

    room = await Room.create({
      roomNumber: 'CF-101',
      type: 'deluxe',
      description: 'Critical fixes test room',
      capacity: 2,
      pricePerNight: 100,
      housekeepingStatus: 'clean',
    });

    // Guest with default permissions (includes bookings:create)
    guestUser = await User.create({
      name: 'Plain Guest',
      email: 'plain.guest@example.com',
      password: 'Password123!',
      role: ROLES.GUEST,
    });
    guestToken = generateAccessToken(guestUser._id.toString());

    // Receptionist with default permissions
    receptionistUser = await User.create({
      name: 'Desk Officer',
      email: 'desk.officer@example.com',
      password: 'Password123!',
      role: ROLES.RECEPTIONIST,
    });
    receptionistToken = generateAccessToken(receptionistUser._id.toString());

    superAdminUser = await User.create({
      name: 'Chief Admin',
      email: 'chief.admin@example.com',
      password: 'Password123!',
      role: ROLES.SUPER_ADMIN,
    });
    superAdminToken = generateAccessToken(superAdminUser._id.toString());
  });

  // ==========================================================================
  // 1. WALK-IN AUTHORIZATION
  // ==========================================================================
  describe('POST /api/v1/desk/walk-in authorization', () => {
    const walkInPayload = () => ({
      guestName: 'Walk In Visitor',
      guestPhone: '+923001112233',
      roomIds: [room._id.toString()],
      checkInDate: futureDate(0),
      checkOutDate: futureDate(1),
      numberOfGuests: 1,
      paymentMethod: 'cash',
      instantCheckIn: false,
    });

    it('rejects a regular guest even though guests hold bookings:create (403)', async () => {
      expect(guestUser.permissions).toContain(PERMISSIONS.BOOKINGS_CREATE);

      const res = await request(app)
        .post('/api/v1/desk/walk-in')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(walkInPayload());

      expect(res.status).toBe(403);
      expect(await Booking.countDocuments()).toBe(0);
      expect(await Payment.countDocuments()).toBe(0);
    });

    it('allows a receptionist with default permissions to register a walk-in (201)', async () => {
      const res = await request(app)
        .post('/api/v1/desk/walk-in')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send(walkInPayload());

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(BOOKING_STATUS.CONFIRMED);

      const payment = await Payment.findOne({ bookingId: res.body.data._id });
      expect(payment).not.toBeNull();
      expect(payment.receivedByStaffId.toString()).toBe(receptionistUser._id.toString());
    });

    it('blocks counter cash collection when staff lacks payments:recordCash (403, nothing written)', async () => {
      await User.findByIdAndUpdate(receptionistUser._id, {
        permissions: [PERMISSIONS.CHECKIN_MANAGE, PERMISSIONS.BOOKINGS_VIEW],
      });

      const res = await request(app)
        .post('/api/v1/desk/walk-in')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send(walkInPayload());

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/record cash payments/i);
      expect(await Booking.countDocuments()).toBe(0);
      expect(await User.countDocuments({ phone: '+923001112233' })).toBe(0);
    });
  });

  // ==========================================================================
  // 2. PAY-AT-DESK WEB BOOKINGS ARE CONFIRMED (NO AUTO-EXPIRY)
  // ==========================================================================
  describe('POST /api/v1/bookings pay-at-desk methods', () => {
    it.each(['cash', 'offline-card', 'card', 'pay_at_desk'])(
      "confirms a '%s' booking immediately without an expiry timer",
      async (paymentMethod) => {
        const res = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${guestToken}`)
          .send({
            roomIds: [room._id.toString()],
            checkInDate: futureDate(10),
            checkOutDate: futureDate(12),
            numberOfGuests: 1,
            paymentMethod,
          });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe(BOOKING_STATUS.CONFIRMED);
        expect(res.body.data.expiresAt ?? null).toBeNull();
      }
    );

    it('keeps online payments pending with an expiry timer', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomIds: [room._id.toString()],
          checkInDate: futureDate(10),
          checkOutDate: futureDate(12),
          numberOfGuests: 1,
          paymentMethod: 'stripe',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(BOOKING_STATUS.PENDING);
      expect(res.body.data.expiresAt).toBeDefined();
    });
  });

  // ==========================================================================
  // 3. CANCELLATION APPROVAL WITHOUT A REQUEST BODY
  // ==========================================================================
  describe('PATCH /api/v1/desk/bookings/:id/cancel-approve without body', () => {
    it('approves the cancellation instead of crashing with 500', async () => {
      const checkIn = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const checkOut = new Date(Date.now() + 96 * 60 * 60 * 1000);

      const booking = await Booking.create({
        bookingReference: 'BK-NO-BODY-APPROVE',
        userId: guestUser._id,
        rooms: [{ roomId: room._id, pricePerNight: 100 }],
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: 1,
        totalPrice: 100,
        status: BOOKING_STATUS.CANCELLATION_REQUESTED,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
        cancellationRequest: {
          requestedBy: guestUser._id,
          reason: 'Plans changed',
        },
      });

      // No .send(): mirrors the frontend's bodyless PATCH request
      const res = await request(app)
        .patch(`/api/v1/desk/bookings/${booking._id}/cancel-approve`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(BOOKING_STATUS.CANCELLED);
      expect(res.body.data.cancellation.reason).toBe('Plans changed');
    });
  });

  // ==========================================================================
  // 4. STAFF ADMINISTRATION PRIVILEGE ESCALATION
  // ==========================================================================
  describe('Staff administration privilege escalation guards', () => {
    let managerUser, managerToken;
    let housekeeperUser;

    beforeEach(async () => {
      // Non-super-admin staff member delegated staff:manage
      managerUser = await User.create({
        name: 'Shift Manager',
        email: 'shift.manager@example.com',
        password: 'Password123!',
        role: ROLES.RECEPTIONIST,
        permissions: [
          PERMISSIONS.STAFF_MANAGE,
          PERMISSIONS.BOOKINGS_VIEW,
          PERMISSIONS.HOUSEKEEPING_UPDATE,
        ],
      });
      managerToken = generateAccessToken(managerUser._id.toString());

      housekeeperUser = await User.create({
        name: 'Room Attendant',
        email: 'room.attendant@example.com',
        password: 'Password123!',
        role: ROLES.HOUSEKEEPING,
      });
    });

    it('prevents a staff:manage holder from creating a super-admin account', async () => {
      const res = await request(app)
        .post('/api/v1/auth/staff')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Sneaky Admin',
          email: 'sneaky.admin@example.com',
          password: 'Password123!',
          role: ROLES.SUPER_ADMIN,
        });

      expect(res.status).toBe(403);
      expect(await User.countDocuments({ email: 'sneaky.admin@example.com' })).toBe(0);
    });

    it('prevents a staff:manage holder from promoting another user to super-admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/users/${housekeeperUser._id}/permissions`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: ROLES.SUPER_ADMIN });

      expect(res.status).toBe(403);
      const dbUser = await User.findById(housekeeperUser._id);
      expect(dbUser.role).toBe(ROLES.HOUSEKEEPING);
    });

    it('prevents a staff:manage holder from modifying their own account', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/users/${managerUser._id}/permissions`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: ROLES.SUPER_ADMIN });

      expect(res.status).toBe(403);
      const dbUser = await User.findById(managerUser._id);
      expect(dbUser.role).toBe(ROLES.RECEPTIONIST);
    });

    it('prevents granting permissions the actor does not hold', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/users/${housekeeperUser._id}/permissions`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          permissions: [PERMISSIONS.HOUSEKEEPING_UPDATE, PERMISSIONS.ANALYTICS_VIEW],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain(PERMISSIONS.ANALYTICS_VIEW);
      const dbUser = await User.findById(housekeeperUser._id);
      expect(dbUser.permissions).not.toContain(PERMISSIONS.ANALYTICS_VIEW);
    });

    it('still allows granting permissions the actor holds', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/users/${housekeeperUser._id}/permissions`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          permissions: [PERMISSIONS.HOUSEKEEPING_UPDATE, PERMISSIONS.BOOKINGS_VIEW],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.permissions).toContain(PERMISSIONS.BOOKINGS_VIEW);
    });

    it('still allows a super-admin to promote a user to super-admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/users/${housekeeperUser._id}/permissions`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: ROLES.SUPER_ADMIN });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe(ROLES.SUPER_ADMIN);
    });
  });
});
