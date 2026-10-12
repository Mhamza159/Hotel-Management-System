const request = require('supertest');
const app = require('../../src/app');
const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');
const User = require('../../src/models/User');
const Coupon = require('../../src/models/Coupon');
const Booking = require('../../src/models/Booking');
const { generateAccessToken } = require('../../src/middlewares/auth.middleware');

/**
 * ============================================================================
 * PRICE QUOTE = CHARGED PRICE
 * ============================================================================
 * Room page pehle apna hisaab lagata tha: 10% tax jo charge nahi hota, aur koi
 * bhi coupon code 10% off. Ab page POST /bookings/quote se server ka hisaab leta
 * hai; ye test confirm karta hai ke quote wahi raqam hai jo booking charge karti
 * hai, aur quote koi cheez (coupon count / points) nahi badalta.
 */
describe('POST /api/v1/bookings/quote', () => {
  let room;
  let guest;
  let token;

  const daysFromNow = (n) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const body = (overrides = {}) => ({
    roomIds: [String(room._id)],
    checkInDate: daysFromNow(15),
    checkOutDate: daysFromNow(18),
    ...overrides,
  });

  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Promise.all([Room.init(), Booking.init(), Coupon.init()]);
    room = await Room.create({ roomNumber: 'Q-1', type: 'suite', description: 'Quote', capacity: 2, pricePerNight: 150 });
    guest = await User.create({ name: 'Quote Guest', email: 'quote@example.com', password: 'Password123!', loyaltyPoints: 400 });
    token = generateAccessToken(String(guest._id));
    await Coupon.create({
      code: 'SUMMER20',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscountAmount: 50,
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });
  });

  it('returns the plain room price with no invented tax', async () => {
    const res = await request(app).post('/api/v1/bookings/quote').set('Authorization', `Bearer ${token}`).send(body());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nights: 3, subtotal: 450, discountTotal: 0, total: 450, coupon: null });
  });

  it('validates coupons on the server and rejects made-up codes', async () => {
    const good = await request(app)
      .post('/api/v1/bookings/quote')
      .set('Authorization', `Bearer ${token}`)
      .send(body({ couponCode: 'summer20' }));
    // 20% of 450 = 90, capped at 50
    expect(good.body.data.coupon).toEqual({ code: 'SUMMER20', valid: true, discount: 50 });
    expect(good.body.data.total).toBe(400);

    const fake = await request(app)
      .post('/api/v1/bookings/quote')
      .set('Authorization', `Bearer ${token}`)
      .send(body({ couponCode: 'ANYTHING10' }));
    expect(fake.body.data.coupon).toMatchObject({ code: 'ANYTHING10', valid: false, discount: 0 });
    expect(fake.body.data.total).toBe(450);
  });

  it('quotes exactly what the booking then charges, without side effects until booked', async () => {
    const quote = await request(app)
      .post('/api/v1/bookings/quote')
      .set('Authorization', `Bearer ${token}`)
      .send(body({ couponCode: 'SUMMER20', redeemLoyaltyPoints: true }));
    expect(quote.status).toBe(200);
    expect(quote.body.data.loyalty.points).toBeGreaterThan(0);

    // Quote ne kuch nahi badla
    expect((await Coupon.findOne({ code: 'SUMMER20' }).lean()).usedCount).toBe(0);
    expect((await User.findById(guest._id).lean()).loyaltyPoints).toBe(400);

    const booked = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...body({ couponCode: 'SUMMER20', redeemLoyaltyPoints: true }), numberOfGuests: 1, paymentMethod: 'pay_at_desk' });
    expect(booked.status).toBe(201);
    expect(booked.body.data.totalPrice).toBe(quote.body.data.total);
    expect(booked.body.data.loyaltyPointsUsed).toBe(quote.body.data.loyalty.points);
  });

  it('rejects bad dates and unknown rooms', async () => {
    const backwards = await request(app)
      .post('/api/v1/bookings/quote')
      .set('Authorization', `Bearer ${token}`)
      .send(body({ checkInDate: daysFromNow(18), checkOutDate: daysFromNow(15) }));
    expect(backwards.status).toBe(400);

    const unknown = await request(app)
      .post('/api/v1/bookings/quote')
      .set('Authorization', `Bearer ${token}`)
      .send(body({ roomIds: ['64b000000000000000000000'] }));
    expect(unknown.status).toBe(400);
  });
});
