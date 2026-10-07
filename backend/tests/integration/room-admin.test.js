const request = require("supertest");
const app = require("../../src/app");
const dbHelper = require("../fixtures/db-helper");
const Room = require("../../src/models/Room");
const Booking = require("../../src/models/Booking");
const User = require("../../src/models/User");
const { generateAccessToken } = require("../../src/middlewares/auth.middleware");
const {
  ROLES,
  BOOKING_STATUS,
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} = require("../../src/config/constants");

/**
 * ============================================================================
 * PHASE 6: ROOM LIFECYCLE, HOUSEKEEPING & DYNAMIC STAFF PBAC PERMISSIONS TESTS
 * ============================================================================
 *
 * Yeh integration test suite Phase 6 aur Frontend Permissions Tab workflow ko
 * mukammal tor par verify karti hai:
 *
 * 1. Admin Room CRUD:
 *    - Super-Admin room create karta hai (rooms:create).
 *    - Duplicate room number par 409 Conflict aana.
 *    - Room rates aur capacity update karna (rooms:update).
 *    - Admin directory paginated list with filtering (rooms:view).
 *
 * 2. Housekeeping Status Flow:
 *    - Housekeeping staff cleanliness status dirty -> cleaning -> clean update karta hai.
 *    - Ghair-mutaliqa status par 400 Bad Request aana.
 *
 * 3. Soft-Delete & Active Reservation Safeguard:
 *    - Agar room par mustaqbil ki confirmed booking ho, toh soft-delete block hona (400 Bad Request).
 *    - Agar active booking na ho, toh soft-delete kamyab hona (isDeleted: true, isActive: false).
 *    - Soft-deleted kamra public availability search se gayab ho jana.
 *
 * 4. Dynamic Frontend Permissions Management Tab:
 *    - Frontend metadata endpoint GET /api/v1/auth/permissions verify karna.
 *    - Default Receptionist ke paas rooms:create nahi hota (403 Forbidden).
 *    - Super-Admin Receptionist ko custom permission (rooms:create) grant karta hai.
 *    - Ab wahi Receptionist kamyabi se room create kar sakta hai (201 Created)!
 *    - Super-Admin jab permissions reset karta hai, toh access dobara revoke ho jati hai (403 Forbidden).
 */
describe("Phase 6: Room Lifecycle, Housekeeping & Dynamic PBAC Permissions Tests", () => {
  let superAdminUser, superAdminToken;
  let receptionistUser, receptionistToken;
  let housekeepingUser, housekeepingToken;
  let guestUser, guestToken;

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

    // 1. Super-Admin User
    superAdminUser = await User.create({
      name: "Chief Hotel Admin",
      email: "admin@hotel.com",
      password: "SuperSecretPassword123!",
      role: ROLES.SUPER_ADMIN,
    });
    superAdminToken = generateAccessToken(superAdminUser._id.toString());

    // 2. Default Receptionist User (Default permissions)
    receptionistUser = await User.create({
      name: "Front Desk Officer",
      email: "reception@hotel.com",
      password: "ReceptionistPassword123!",
      role: ROLES.RECEPTIONIST,
    });
    receptionistToken = generateAccessToken(receptionistUser._id.toString());

    // 3. Housekeeping User
    housekeepingUser = await User.create({
      name: "Housekeeping Staff",
      email: "cleaner@hotel.com",
      password: "CleanerPassword123!",
      role: ROLES.HOUSEKEEPING,
    });
    housekeepingToken = generateAccessToken(housekeepingUser._id.toString());

    // 4. Regular Guest User
    guestUser = await User.create({
      name: "Standard Guest",
      email: "guest@guest.com",
      password: "GuestPassword123!",
      role: ROLES.GUEST,
    });
    guestToken = generateAccessToken(guestUser._id.toString());
  });

  // ==========================================================================
  // SECTION 1: ADMIN ROOM CATALOG CRUD & VALIDATION
  // ==========================================================================
  describe("Room Administration CRUD Operations", () => {
    it("allows Super-Admin to create a new physical room definition", async () => {
      const res = await request(app)
        .post("/api/v1/rooms")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          roomNumber: "101",
          type: "deluxe",
          pricePerNight: 150,
          capacity: 2,
          description: "Spacious Deluxe Suite with Balcony",
          amenities: ["WiFi", "Mini Bar", "AC", "Balcony"],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.roomNumber).toBe("101");
      expect(res.body.data.type).toBe("deluxe");
      expect(res.body.data.housekeepingStatus).toBe("clean");
      expect(res.body.data.isActive).toBe(true);
    });

    it("rejects duplicate room number with 409 Conflict", async () => {
      // Pehla room banaya
      await Room.create({
        roomNumber: "201",
        type: "suite",
        pricePerNight: 250,
        capacity: 4,
        description: "Suite Room 201 description",
      });

      // Wahi room number dobara create karne ki koshish
      const res = await request(app)
        .post("/api/v1/rooms")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          roomNumber: "201",
          type: "single",
          pricePerNight: 80,
          capacity: 1,
          description: "Duplicate Room description",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("allows Super-Admin to update room details and pricing", async () => {
      const room = await Room.create({
        roomNumber: "301",
        type: "single",
        pricePerNight: 90,
        capacity: 1,
        description: "Single Room 301 description",
      });

      const res = await request(app)
        .patch(`/api/v1/rooms/${room._id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          pricePerNight: 110,
          capacity: 2,
          amenities: ["WiFi", "Smart TV"],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.pricePerNight).toBe(110);
      expect(res.body.data.capacity).toBe(2);
      expect(res.body.data.amenities).toContain("Smart TV");
    });

    it("allows Admin to query paginated directory with type and status filters", async () => {
      await Room.create([
        { roomNumber: "401", type: "deluxe", pricePerNight: 120, capacity: 2, description: "Deluxe 401", housekeepingStatus: "dirty" },
        { roomNumber: "402", type: "deluxe", pricePerNight: 130, capacity: 2, description: "Deluxe 402", housekeepingStatus: "clean" },
        { roomNumber: "403", type: "suite", pricePerNight: 220, capacity: 4, description: "Suite 403", housekeepingStatus: "dirty" },
      ]);

      const res = await request(app)
        .get("/api/v1/rooms/admin/all?type=deluxe&housekeepingStatus=dirty")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rooms.length).toBe(1);
      expect(res.body.data.rooms[0].roomNumber).toBe("401");
      expect(res.body.data.pagination.total).toBe(1);
    });
  });

  // ==========================================================================
  // SECTION 2: HOUSEKEEPING CLEANLINESS WORKFLOW
  // ==========================================================================
  describe("Housekeeping Status Management", () => {
    it("allows housekeeping staff to transition room status from dirty to cleaning to clean", async () => {
      const room = await Room.create({
        roomNumber: "501",
        type: "deluxe",
        pricePerNight: 120,
        capacity: 2,
        description: "Deluxe 501",
        housekeepingStatus: "dirty",
      });

      // 1. dirty -> cleaning
      const step1 = await request(app)
        .patch(`/api/v1/rooms/${room._id}/housekeeping`)
        .set("Authorization", `Bearer ${housekeepingToken}`)
        .send({
          housekeepingStatus: "cleaning",
          notes: "Deep cleaning started by housekeeping staff",
        });

      expect(step1.status).toBe(200);
      expect(step1.body.data.room.housekeepingStatus).toBe("cleaning");

      // 2. cleaning -> clean
      const step2 = await request(app)
        .patch(`/api/v1/rooms/${room._id}/housekeeping`)
        .set("Authorization", `Bearer ${housekeepingToken}`)
        .send({
          housekeepingStatus: "clean",
          notes: "Sanitized and fresh linen applied",
        });

      expect(step2.status).toBe(200);
      expect(step2.body.data.room.housekeepingStatus).toBe("clean");
    });

    it("rejects invalid housekeeping statuses with 400 Bad Request", async () => {
      const room = await Room.create({
        roomNumber: "502",
        type: "single",
        pricePerNight: 70,
        capacity: 1,
        description: "Single 502",
      });

      const res = await request(app)
        .patch(`/api/v1/rooms/${room._id}/housekeeping`)
        .set("Authorization", `Bearer ${housekeepingToken}`)
        .send({ housekeepingStatus: "super-sparkly" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid housekeeping status/i);
    });
  });

  // ==========================================================================
  // SECTION 3: SOFT-DELETE & ACTIVE RESERVATION SAFEGUARDS
  // ==========================================================================
  describe("Room Soft-Delete Safeguards", () => {
    it("blocks room deletion if active future confirmed booking exists (400 Bad Request)", async () => {
      const room = await Room.create({
        roomNumber: "601",
        type: "deluxe",
        pricePerNight: 150,
        capacity: 2,
        description: "Deluxe 601",
      });

      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 3);
      const checkOutDate = new Date();
      checkOutDate.setDate(checkOutDate.getDate() + 6);

      // Mustaqbil ki active confirmed reservation
      await Booking.create({
        bookingReference: "BK-FUTURE-601",
        userId: guestUser._id,
        rooms: [
          {
            roomId: room._id,
            pricePerNight: room.pricePerNight,
          },
        ],
        checkInDate,
        checkOutDate,
        numberOfGuests: 2,
        totalAmount: 450,
        status: BOOKING_STATUS.CONFIRMED,
      });

      const res = await request(app)
        .delete(`/api/v1/rooms/${room._id}`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/upcoming active reservation/i);

      // Verify room remains untouched
      const dbRoom = await Room.findById(room._id);
      expect(dbRoom.isDeleted).toBe(false);
      expect(dbRoom.isActive).toBe(true);
    });

    it("allows soft-deletion when room has no active reservations", async () => {
      const room = await Room.create({
        roomNumber: "602",
        type: "suite",
        pricePerNight: 200,
        capacity: 2,
        description: "Suite 602",
      });

      const res = await request(app)
        .delete(`/api/v1/rooms/${room._id}`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isDeleted).toBe(true);
      expect(res.body.data.isActive).toBe(false);

      // Verify that public find excludes this soft-deleted room
      const foundPublic = await Room.findById(room._id);
      expect(foundPublic).toBeNull(); // Mongoose pre-find middleware filters isDeleted: true
    });
  });

  // ==========================================================================
  // SECTION 4: FRONTEND UI TAB DYNAMIC PERMISSION MANAGEMENT
  // ==========================================================================
  describe("Dynamic Staff Permissions Management Tab", () => {
    it("serves permissions and role templates for the frontend UI tab", async () => {
      const res = await request(app)
        .get("/api/v1/auth/permissions")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.roles).toContain(ROLES.RECEPTIONIST);
      expect(res.body.data.permissions).toContain(PERMISSIONS.ROOMS_CREATE);
      expect(res.body.data.roleDefaultPermissions[ROLES.RECEPTIONIST]).toBeDefined();
    });

    it("denies room creation to default receptionist (PBAC Guard 403 Forbidden)", async () => {
      // Default Receptionist ke paas 'rooms:create' nahi hota
      const res = await request(app)
        .post("/api/v1/rooms")
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({
          roomNumber: "701",
          type: "deluxe",
          pricePerNight: 140,
          capacity: 2,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it("allows Super-Admin to grant custom 'rooms:create' permission to Receptionist, enabling them to create rooms", async () => {
      // 1. Super-Admin updates Receptionist's permissions list in the UI Tab
      const currentPerms = ROLE_DEFAULT_PERMISSIONS[ROLES.RECEPTIONIST];
      const updatedPerms = [...currentPerms, PERMISSIONS.ROOMS_CREATE];

      const patchRes = await request(app)
        .patch(`/api/v1/auth/users/${receptionistUser._id}/permissions`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ permissions: updatedPerms });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.user.permissions).toContain(PERMISSIONS.ROOMS_CREATE);

      // 2. Receptionist now attempts room creation again (Access is immediately unlocked!)
      const createRes = await request(app)
        .post("/api/v1/rooms")
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({
          roomNumber: "702",
          type: "deluxe",
          pricePerNight: 160,
          capacity: 2,
          description: "Created by empowered receptionist",
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.roomNumber).toBe("702");

      // 3. Super-Admin resets Receptionist permissions back to role default
      const resetRes = await request(app)
        .patch(`/api/v1/auth/users/${receptionistUser._id}/permissions`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ resetToDefault: true });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.data.user.permissions).not.toContain(PERMISSIONS.ROOMS_CREATE);

      // 4. Receptionist is once again blocked (403 Forbidden)
      const blockedRes = await request(app)
        .post("/api/v1/rooms")
        .set("Authorization", `Bearer ${receptionistToken}`)
        .send({
          roomNumber: "703",
          type: "suite",
          pricePerNight: 220,
          capacity: 4,
        });

      expect(blockedRes.status).toBe(403);
    });

    it("allows Super-Admin to create new staff user with custom permissions", async () => {
      const res = await request(app)
        .post("/api/v1/auth/staff")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Custom Front Desk Officer",
          email: "custom.reception@hotel.com",
          password: "StaffPassword123!",
          role: ROLES.RECEPTIONIST,
          permissions: [
            PERMISSIONS.BOOKINGS_VIEW,
            PERMISSIONS.CHECKIN_MANAGE,
            PERMISSIONS.ROOMS_CREATE, // Custom extra permission
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe("custom.reception@hotel.com");
      expect(res.body.data.user.permissions).toContain(PERMISSIONS.ROOMS_CREATE);
    });

    it("prevents standard guest from accessing staff permission management endpoints", async () => {
      const res = await request(app)
        .get("/api/v1/auth/permissions")
        .set("Authorization", `Bearer ${guestToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // SECTION 5: MEDIA MANAGEMENT & CLOUDINARY UPLOAD PIPELINE
  // ==========================================================================
  describe("Media Management Pipeline (Multer + Cloudinary)", () => {
    let mediaRoom;

    beforeEach(async () => {
      mediaRoom = await Room.create({
        roomNumber: "801",
        type: "deluxe",
        pricePerNight: 160,
        capacity: 2,
        description: "Room for media pipeline testing",
      });
    });

    it("allows Super-Admin to upload room photos using multipart/form-data", async () => {
      const fakeImageBuffer = Buffer.from("fake-jpg-binary-stream-data");

      const res = await request(app)
        .post(`/api/v1/rooms/${mediaRoom._id}/images`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .attach("images", fakeImageBuffer, "deluxe-balcony.jpg");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.images.length).toBe(1);
      expect(res.body.data.images[0].url).toMatch(/^https:\/\/res\.cloudinary\.com/);
      expect(res.body.data.images[0].publicId).toBeDefined();

      // Database persistence check
      const updatedInDb = await Room.findById(mediaRoom._id);
      expect(updatedInDb.images.length).toBe(1);
      expect(updatedInDb.images[0].publicId).toBe(res.body.data.images[0].publicId);
    });

    it("rejects non-image files with 400 Bad Request", async () => {
      const fakeTextBuffer = Buffer.from("this is plain text not an image");

      const res = await request(app)
        .post(`/api/v1/rooms/${mediaRoom._id}/images`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .attach("images", fakeTextBuffer, "document.txt");

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Only JPEG, PNG, and WEBP/i);
    });

    it("allows Super-Admin to delete an image by publicId from Cloudinary and room catalog", async () => {
      // 1. Upload photo first
      const uploadRes = await request(app)
        .post(`/api/v1/rooms/${mediaRoom._id}/images`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .attach("images", Buffer.from("sample-img-bytes"), "pool-view.png");

      expect(uploadRes.status).toBe(200);
      const uploadedPublicId = uploadRes.body.data.images[0].publicId;

      // 2. Delete photo
      const deleteRes = await request(app)
        .delete(`/api/v1/rooms/${mediaRoom._id}/images`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ publicId: uploadedPublicId });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toMatch(/deleted successfully/i);
      expect(deleteRes.body.data.images.length).toBe(0);

      // Verify deletion in database
      const dbRoom = await Room.findById(mediaRoom._id);
      expect(dbRoom.images.length).toBe(0);
    });

    it("prevents standard guest from uploading photos (PBAC Guard 403 Forbidden)", async () => {
      const res = await request(app)
        .post(`/api/v1/rooms/${mediaRoom._id}/images`)
        .set("Authorization", `Bearer ${guestToken}`)
        .attach("images", Buffer.from("guest-img-bytes"), "guest-view.jpg");

      expect(res.status).toBe(403);
    });
  });
});

