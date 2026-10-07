const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/Booking');
const User = require('../../src/models/User');
const Review = require('../../src/models/Review');
const Waitlist = require('../../src/models/Waitlist');
const Payment = require('../../src/models/Payment');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');
const { ROLES, BOOKING_STATUS, PAYMENT_STATUS, PERMISSIONS } = require('../../src/config/constants');
const DeskService = require('../../src/services/desk.service');
const CancellationService = require('../../src/services/cancellation.service');
const LoyaltyService = require('../../src/services/loyalty.service');

describe('Phase 7: Guest Loyalty, Reviews, Wishlists & Waitlists Integration Tests', () => {
  let guestUser, guestToken;
  let otherGuestUser, otherGuestToken;
  let receptionistUser, receptionistToken;
  let testRoom, otherRoom;

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
    await Review.init();
    await Waitlist.init();
    await Payment.init();

    // 1. Create Test Rooms
    testRoom = await Room.create({
      roomNumber: '701',
      type: 'deluxe',
      description: 'Luxury Suite with Ocean View',
      capacity: 2,
      pricePerNight: 200,
      housekeepingStatus: 'clean',
      averageRating: 0,
      totalReviews: 0,
    });

    otherRoom = await Room.create({
      roomNumber: '702',
      type: 'deluxe',
      description: 'Cozy Deluxe Room',
      capacity: 2,
      pricePerNight: 150,
      housekeepingStatus: 'clean',
    });

    // 2. Create Users
    guestUser = await User.create({
      name: 'Ahmed Khan',
      email: 'ahmed@example.com',
      password: 'Password123!',
      role: ROLES.GUEST,
      loyaltyPoints: 0,
    });
    guestToken = generateAccessToken(guestUser._id);

    otherGuestUser = await User.create({
      name: 'Sara Ali',
      email: 'sara@example.com',
      password: 'Password123!',
      role: ROLES.GUEST,
      loyaltyPoints: 0,
    });
    otherGuestToken = generateAccessToken(otherGuestUser._id);

    receptionistUser = await User.create({
      name: 'Front Desk Officer',
      email: 'receptionist@example.com',
      password: 'Password123!',
      role: ROLES.RECEPTIONIST,
      permissions: [
        PERMISSIONS.CHECKIN_MANAGE,
        PERMISSIONS.CHECKOUT_MANAGE,
        PERMISSIONS.BOOKINGS_CANCEL,
      ],
    });
    receptionistToken = generateAccessToken(receptionistUser._id);
  });

  // ==========================================================================
  // 1. VERIFIED STAY REVIEWS (ENGAGE-02)
  // ==========================================================================
  describe('1. Verified Stay Reviews', () => {
    it('rejects review if guest has never booked or stayed in the room (Zero Fake Reviews)', async () => {
      // Create a fake booking ID
      const fakeBookingId = new (require('mongoose').Types.ObjectId)();

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomId: testRoom._id,
          bookingId: fakeBookingId,
          rating: 5,
          comment: 'Beautiful room!',
        });

      expect(res.status).toBe(404);
    });

    it('rejects review if booking is active/confirmed but NOT completed/checked-out', async () => {
      const activeBooking = await Booking.create({
        bookingReference: 'BK-TEST-ACTIVE',
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 200 }],
        checkInDate: new Date(Date.now() + 86400000),
        checkOutDate: new Date(Date.now() + 172800000),
        numberOfGuests: 2,
        totalPrice: 200,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomId: testRoom._id,
          bookingId: activeBooking._id,
          rating: 5,
          comment: 'Trying to review before checkout',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Reviews are only permitted after completing a verified stay');
    });

    it('allows review after verified stay and recalculates room averageRating atomically', async () => {
      // Completed Booking for Guest 1
      const completedBooking1 = await Booking.create({
        bookingReference: 'BK-TEST-DONE1',
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 200 }],
        checkInDate: new Date(Date.now() - 172800000),
        checkOutDate: new Date(Date.now() - 86400000),
        numberOfGuests: 2,
        totalPrice: 200,
        status: BOOKING_STATUS.CHECKED_OUT,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
      });

      // Submit Review 1 (Rating 5)
      const res1 = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomId: testRoom._id,
          bookingId: completedBooking1._id,
          rating: 5,
          comment: 'Exceptional hospitality and clean room!',
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.verifiedStay).toBe(true);

      // Verify Room averageRating updated to 5.0 and totalReviews to 1
      let updatedRoom = await Room.findById(testRoom._id);
      expect(updatedRoom.averageRating).toBe(5);
      expect(updatedRoom.totalReviews).toBe(1);

      // Completed Booking for Guest 2
      const completedBooking2 = await Booking.create({
        bookingReference: 'BK-TEST-DONE2',
        userId: otherGuestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 200 }],
        checkInDate: new Date(Date.now() - 272800000),
        checkOutDate: new Date(Date.now() - 172800000),
        numberOfGuests: 1,
        totalPrice: 200,
        status: BOOKING_STATUS.CHECKED_OUT,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
      });

      // Submit Review 2 (Rating 3)
      const res2 = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${otherGuestToken}`)
        .send({
          roomId: testRoom._id,
          bookingId: completedBooking2._id,
          rating: 3,
          comment: 'Good room but wifi was slightly slow.',
        });

      expect(res2.status).toBe(201);

      // Average of 5 and 3 should be 4.0, total reviews = 2
      updatedRoom = await Room.findById(testRoom._id);
      expect(updatedRoom.averageRating).toBe(4);
      expect(updatedRoom.totalReviews).toBe(2);

      // Duplicate review check: Trying to review booking 1 again should yield 409 Conflict
      const dupRes = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomId: testRoom._id,
          bookingId: completedBooking1._id,
          rating: 4,
          comment: 'Trying second review for same booking',
        });

      expect(dupRes.status).toBe(409);
    });

    it('fetches public paginated reviews for a room', async () => {
      const res = await request(app).get(`/api/v1/rooms/${testRoom._id}/reviews?page=1&limit=5`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.reviews)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  // ==========================================================================
  // 2. GUEST LOYALTY POINTS ENGINE (ENGAGE-01)
  // ==========================================================================
  describe('2. Guest Loyalty Points Engine', () => {
    it('accrues loyalty points upon checkout ($10 spent = 1 point earned)', async () => {
      // Create checked-in booking of $350
      const booking = await Booking.create({
        bookingReference: 'BK-LOYALTY-TEST',
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 200 }],
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000),
        numberOfGuests: 2,
        totalPrice: 350,
        status: BOOKING_STATUS.CHECKED_IN,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
      });

      await Payment.create({
        bookingId: booking._id,
        userId: guestUser._id,
        amount: 350,
        currency: 'USD',
        paymentMethod: 'cash',
        status: PAYMENT_STATUS.COMPLETED,
      });

      // Front desk checkout
      await DeskService.checkOutGuest(booking._id.toString());

      // Guest should now have floor(350 / 10) = 35 points
      const updatedGuest = await User.findById(guestUser._id);
      expect(updatedGuest.loyaltyPoints).toBe(35);

      // Check balance API endpoint
      const balRes = await request(app)
        .get('/api/v1/loyalty/balance')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(balRes.status).toBe(200);
      expect(balRes.body.data.loyaltyPoints).toBe(35);
      expect(balRes.body.data.discountValue).toBe(3.5); // 35 * $0.10 = $3.50
    });

    it('redeems loyalty points atomically for authoritative discount (100 points = $10)', async () => {
      // Give guest 250 points
      await User.findByIdAndUpdate(guestUser._id, { loyaltyPoints: 250 });

      // Redeem 100 points
      const redemption = await LoyaltyService.redeemPoints(guestUser._id, 100);

      expect(redemption.redeemedPoints).toBe(100);
      expect(redemption.discountAmount).toBe(10); // $10 discount
      expect(redemption.remainingBalance).toBe(150);

      // Trying to redeem more than available balance throws 400
      await expect(
        LoyaltyService.redeemPoints(guestUser._id, 500)
      ).rejects.toThrow('Insufficient loyalty points balance');
    });
  });

  // ==========================================================================
  // 3. AVAILABILITY WAITLIST & CANCELLATION DISPATCH (ENGAGE-03)
  // ==========================================================================
  describe('3. Availability Waitlist & Cancellation Notifications', () => {
    it('allows guest to join waitlist and prevents duplicate active entries', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      // Join waitlist
      const res = await request(app)
        .post('/api/v1/waitlist')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomType: 'deluxe',
          checkIn: tomorrow,
          checkOut: nextWeek,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.roomType).toBe('deluxe');

      // Duplicate active join should yield 409 Conflict
      const dupRes = await request(app)
        .post('/api/v1/waitlist')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          roomType: 'deluxe',
          checkIn: tomorrow,
          checkOut: nextWeek,
        });

      expect(dupRes.status).toBe(409);
    });

    it('automatically notifies active waitlisted guests when a booking is cancelled', async () => {
      const checkIn = new Date(Date.now() + 2 * 86400000);
      const checkOut = new Date(Date.now() + 4 * 86400000);

      // Other guest joins waitlist for Deluxe room on these dates
      const waitlistEntry = await Waitlist.create({
        guestId: otherGuestUser._id,
        roomType: 'deluxe',
        checkIn,
        checkOut,
        status: 'active',
      });

      // Guest 1 has a confirmed booking for testRoom (Deluxe)
      const booking = await Booking.create({
        bookingReference: 'BK-CANCEL-WAITLIST',
        userId: guestUser._id,
        rooms: [{ roomId: testRoom._id, pricePerNight: 200 }],
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: 2,
        totalPrice: 400,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.COMPLETED,
      });

      await Payment.create({
        bookingId: booking._id,
        userId: guestUser._id,
        amount: 400,
        currency: 'USD',
        paymentMethod: 'cash',
        status: PAYMENT_STATUS.COMPLETED,
      });

      // Staff approves cancellation
      await CancellationService.approveCancellation({
        bookingId: booking._id.toString(),
        staffId: receptionistUser._id.toString(),
        staffRole: ROLES.RECEPTIONIST,
        notes: 'Guest requested refund',
      });

      // The waitlist entry should now be transitioned to 'notified'
      const updatedWaitlist = await Waitlist.findById(waitlistEntry._id);
      expect(updatedWaitlist.status).toBe('notified');
      expect(updatedWaitlist.notifiedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // 4. GUEST WISHLIST (ENGAGE-04)
  // ==========================================================================
  describe('4. Guest Wishlist', () => {
    it('adds, views, and removes rooms from personal wishlist', async () => {
      // 1. Add room to wishlist
      const addRes = await request(app)
        .post(`/api/v1/wishlist/${testRoom._id}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(addRes.status).toBe(200);
      expect(addRes.body.success).toBe(true);

      // 2. Fetch wishlist
      const getRes = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBe(1);
      expect(getRes.body.data[0]._id.toString()).toBe(testRoom._id.toString());
      expect(getRes.body.data[0].roomNumber).toBe('701');

      // 3. Remove room from wishlist
      const delRes = await request(app)
        .delete(`/api/v1/wishlist/${testRoom._id}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(delRes.status).toBe(200);

      // 4. Fetch again -> empty wishlist
      const getResAfter = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(getResAfter.body.data.length).toBe(0);
    });
  });
});
