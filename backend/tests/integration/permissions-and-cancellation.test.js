const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const User = require('../../src/models/User');
const Booking = require('../../src/models/Booking');
const Payment = require('../../src/models/Payment');
const BookingService = require('../../src/services/booking.service');
const CancellationService = require('../../src/services/cancellation.service');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
const { PERMISSIONS } = require('../../src/config/constants');

/**
 * ============================================================================
 * MEDIUM BATCH 2: PBAC ASAL PERMISSIONS DEKHE, CANCELLATION QAWAID
 * ============================================================================
 * - Booking view / invoice / cancellation: role ka naam nahi, permission
 * - rooms:priceUpdate ab lagu
 * - Sirf stay se pehle wali bookings cancel; aadha refund = partially-refunded;
 *   refund har asal payment ke tareeqe se
 */
describe('Permission checks and cancellation rules (medium batch 2)', () => {
  let room;
  let guest;

  const tokenFor = (user) => generateAccessToken(String(user._id));
  const staff = (overrides) =>
    User.create({ name: 'Staff', password: 'Password123!', ...overrides });

  const bookFor = (user, checkIn, checkOut) =>
    BookingService.createBooking({
      userId: user._id,
      roomIds: [String(room._id)],
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: 1,
      paymentMethod: 'pay_at_desk',
    });

  const hoursFromNow = (h) => new Date(Date.now() + h * 3600 * 1000);

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Promise.all([Room.init(), Booking.init(), User.init()]);
    room = await Room.create({ roomNumber: 'P-1', type: 'deluxe', description: 'PBAC', capacity: 2, pricePerNight: 100 });
    guest = await User.create({ name: 'Guest', email: 'pbac.guest@example.com', password: 'Password123!' });
  });

  describe('booking view and invoice follow bookings:view', () => {
    it('lets any staff granted bookings:view open a guest booking, and blocks staff without it', async () => {
      const booking = await bookFor(guest, hoursFromNow(24 * 10), hoursFromNow(24 * 12));
      const granted = await staff({ email: 'hk.granted@example.com', role: 'housekeeping', permissions: [PERMISSIONS.BOOKINGS_VIEW] });
      const plain = await staff({ email: 'hk.plain@example.com', role: 'housekeeping' });

      const ok = await request(app).get(`/api/v1/bookings/${booking._id}`).set('Authorization', `Bearer ${tokenFor(granted)}`);
      expect(ok.status).toBe(200);
      const invoice = await request(app).get(`/api/v1/bookings/${booking._id}/invoice`).set('Authorization', `Bearer ${tokenFor(granted)}`);
      expect(invoice.status).toBe(200);

      const denied = await request(app).get(`/api/v1/bookings/${booking._id}`).set('Authorization', `Bearer ${tokenFor(plain)}`);
      expect(denied.status).toBe(403);
    });
  });

  describe('guests never act as staff', () => {
    it('ignores staff permissions stored on old guest accounts', async () => {
      // Purane guest accounts ke paas default me "bookings:view" save tha
      const oldGuest = await User.create({
        name: 'Old Guest',
        email: 'old.guest@example.com',
        password: 'Password123!',
        role: 'user',
        permissions: [PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_VIEW],
      });
      const someoneElses = await bookFor(guest, hoursFromNow(24 * 10), hoursFromNow(24 * 12));
      const token = tokenFor(oldGuest);

      const allBookings = await request(app).get('/api/v1/admin/bookings').set('Authorization', `Bearer ${token}`);
      expect(allBookings.status).toBe(403);
      const otherBooking = await request(app).get(`/api/v1/bookings/${someoneElses._id}`).set('Authorization', `Bearer ${token}`);
      expect(otherBooking.status).toBe(403);
      const queue = await request(app).get('/api/v1/desk/cancellation-requests').set('Authorization', `Bearer ${token}`);
      expect(queue.status).toBe(403);

      // Apni booking phir bhi bana sakta hai
      expect(oldGuest.hasPermission(PERMISSIONS.BOOKINGS_CREATE)).toBe(true);
    });
  });

  describe('rooms:priceUpdate', () => {
    it('needs rooms:priceUpdate to change the price and rooms:update for other fields', async () => {
      const editor = await staff({ email: 'editor@example.com', role: 'housekeeping', permissions: [PERMISSIONS.ROOMS_UPDATE] });
      const pricer = await staff({ email: 'pricer@example.com', role: 'housekeeping', permissions: [PERMISSIONS.ROOMS_PRICE_UPDATE] });

      const editorPrice = await request(app)
        .patch(`/api/v1/rooms/${room._id}`)
        .set('Authorization', `Bearer ${tokenFor(editor)}`)
        .send({ pricePerNight: 999 });
      expect(editorPrice.status).toBe(403);

      const editorText = await request(app)
        .patch(`/api/v1/rooms/${room._id}`)
        .set('Authorization', `Bearer ${tokenFor(editor)}`)
        .send({ description: 'Updated by editor' });
      expect(editorText.status).toBe(200);

      const pricerPrice = await request(app)
        .patch(`/api/v1/rooms/${room._id}`)
        .set('Authorization', `Bearer ${tokenFor(pricer)}`)
        .send({ pricePerNight: 180 });
      expect(pricerPrice.status).toBe(200);

      const pricerText = await request(app)
        .patch(`/api/v1/rooms/${room._id}`)
        .set('Authorization', `Bearer ${tokenFor(pricer)}`)
        .send({ pricePerNight: 190, description: 'sneaky' });
      expect(pricerText.status).toBe(403);

      expect((await Room.findById(room._id).lean()).pricePerNight).toBe(180);

      // Edit form poora room (unchanged price samet) bhejta hai — sirf asal tabdeeli gini jati hai
      const fullForm = await request(app)
        .patch(`/api/v1/rooms/${room._id}`)
        .set('Authorization', `Bearer ${tokenFor(editor)}`)
        .send({ pricePerNight: 180, capacity: 2, description: 'Full form save' });
      expect(fullForm.status).toBe(200);
    });
  });

  describe('cancellation approval', () => {
    it('lets non-receptionist staff with bookings:cancel approve, and refuses finished stays', async () => {
      const canceller = await staff({ email: 'cancel@example.com', role: 'housekeeping', permissions: [PERMISSIONS.BOOKINGS_CANCEL] });
      const booking = await bookFor(guest, hoursFromNow(24 * 10), hoursFromNow(24 * 12));

      const approved = await CancellationService.approveCancellation({
        bookingId: String(booking._id),
        staffId: String(canceller._id),
        staffRole: canceller.role,
        staffUser: canceller,
      });
      expect(approved.status).toBe('cancelled');

      const finished = await bookFor(guest, hoursFromNow(24 * 20), hoursFromNow(24 * 22));
      await Booking.updateOne({ _id: finished._id }, { $set: { status: 'checked-out' } });
      await expect(
        CancellationService.approveCancellation({
          bookingId: String(finished._id),
          staffId: String(canceller._id),
          staffRole: canceller.role,
          staffUser: canceller,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('splits a partial refund across the original payment methods and marks it partially-refunded', async () => {
      const desk = await staff({ email: 'desk@example.com', role: 'receptionist' });
      // 36 ghante baad check-in = 50% tier
      const booking = await bookFor(guest, hoursFromNow(36), hoursFromNow(36 + 48));
      await Payment.create({
        bookingId: booking._id,
        userId: guest._id,
        amount: 50,
        paymentMethod: 'cash',
        status: 'completed',
        receivedByStaffId: desk._id,
        createdAt: hoursFromNow(-2),
      });
      await Payment.create({
        bookingId: booking._id,
        userId: guest._id,
        amount: 100,
        paymentMethod: 'offline-card',
        status: 'completed',
        receivedByStaffId: desk._id,
      });

      const result = await CancellationService.approveCancellation({
        bookingId: String(booking._id),
        staffId: String(desk._id),
        staffRole: desk.role,
        staffUser: desk,
      });

      expect(result.refund.refundAmount).toBe(75);
      const refunds = await Payment.find({ bookingId: booking._id, status: 'refunded' }).sort({ createdAt: 1 }).lean();
      // Sab se nayi (card, 100) payment se pehle — poora 75 card par
      expect(refunds.map((r) => [r.paymentMethod, r.amount])).toEqual([['offline-card', 75]]);
      expect((await Booking.findById(booking._id).lean()).paymentStatus).toBe('partially-refunded');
    });
    it('spreads a refund larger than the newest payment over older payments too', async () => {
      const desk = await staff({ email: 'desk2@example.com', role: 'receptionist' });
      const booking = await bookFor(guest, hoursFromNow(24 * 10), hoursFromNow(24 * 12)); // 100% tier
      await Payment.create({ bookingId: booking._id, userId: guest._id, amount: 120, paymentMethod: 'cash', status: 'completed', receivedByStaffId: desk._id, createdAt: hoursFromNow(-2) });
      await Payment.create({ bookingId: booking._id, userId: guest._id, amount: 80, paymentMethod: 'offline-card', status: 'completed', receivedByStaffId: desk._id });

      await CancellationService.approveCancellation({ bookingId: String(booking._id), staffId: String(desk._id), staffRole: desk.role, staffUser: desk });

      const refunds = await Payment.find({ bookingId: booking._id, status: 'refunded' }).lean();
      expect(refunds.map((r) => [r.paymentMethod, r.amount]).sort()).toEqual([['cash', 120], ['offline-card', 80]]);
      expect((await Booking.findById(booking._id).lean()).paymentStatus).toBe('refunded');
    });
  });
});
