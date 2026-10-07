const dbHelper = require('../fixtures/db-helper');
const Room = require('../../src/models/Room');

describe('Room Model Unit Verification', () => {
  beforeAll(async () => {
    await dbHelper.connect();
  });

  afterAll(async () => {
    await dbHelper.disconnect();
  });

  beforeEach(async () => {
    await dbHelper.clearDatabase();
    await Room.init();
  });

  it('creates and saves a valid room document', async () => {
    const roomData = {
      roomNumber: '101',
      type: 'deluxe',
      description: 'Luxury deluxe room with balcony',
      capacity: 2,
      pricePerNight: 150,
      amenities: ['WiFi', 'AC', 'Ocean View'],
    };

    const room = await Room.create(roomData);
    expect(room._id).toBeDefined();
    expect(room.roomNumber).toBe('101');
    expect(room.type).toBe('deluxe');
    expect(room.housekeepingStatus).toBe('clean');
    expect(room.isActive).toBe(true);
    expect(room.isDeleted).toBe(false);
  });

  it('enforces unique roomNumber in uppercase', async () => {
    await Room.create({
      roomNumber: '202a',
      type: 'single',
      description: 'Single room',
      capacity: 1,
      pricePerNight: 80,
    });

    // Room number is converted to uppercase ('202A')
    const found = await Room.findOne({ roomNumber: '202A' });
    expect(found).not.toBeNull();

    // Duplicate creation must fail
    await expect(
      Room.create({
        roomNumber: '202A',
        type: 'single',
        description: 'Duplicate single',
        capacity: 1,
        pricePerNight: 85,
      })
    ).rejects.toThrow();
  });

  it('validates required fields and positive capacity/price', async () => {
    const invalidRoom = new Room({
      roomNumber: '301',
      // Missing type and description
      capacity: 0, // Must be >= 1
      pricePerNight: -10, // Must be >= 0
    });

    let err;
    try {
      await invalidRoom.validate();
    } catch (e) {
      err = e;
    }

    expect(err).toBeDefined();
    expect(err.errors.type).toBeDefined();
    expect(err.errors.description).toBeDefined();
    expect(err.errors.capacity).toBeDefined();
    expect(err.errors.pricePerNight).toBeDefined();
  });

  it('automatically excludes soft-deleted rooms from find queries', async () => {
    const active = await Room.create({
      roomNumber: '401',
      type: 'suite',
      description: 'Penthouse suite',
      capacity: 4,
      pricePerNight: 400,
      isDeleted: false,
    });

    const deleted = await Room.create({
      roomNumber: '402',
      type: 'suite',
      description: 'Decommissioned suite',
      capacity: 4,
      pricePerNight: 350,
      isDeleted: true,
    });

    const results = await Room.find();
    expect(results.length).toBe(1);
    expect(results[0]._id.toString()).toBe(active._id.toString());

    // Explicit query includes soft-deleted room
    const withDeleted = await Room.find({ isDeleted: true });
    expect(withDeleted.length).toBe(1);
    expect(withDeleted[0]._id.toString()).toBe(deleted._id.toString());
  });
});
