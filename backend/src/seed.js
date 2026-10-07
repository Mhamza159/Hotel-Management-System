const path = require("path");
const dotenv = require("dotenv");

// Load .env before requiring any local modules
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { connectDB, closeDB } = require("./config/db");
const Room = require("./models/Room");
const User = require("./models/User");
const Coupon = require("./models/Coupon");
const { ROLES } = require("./config/constants");

const seedData = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    console.log("Cleaning up existing test rooms, seed users, and initial coupons...");
    // Only delete seed test data or leave existing real bookings untouched
    await Room.deleteMany({
      roomNumber: { $in: ["101", "102", "103", "201", "301"] },
    });
    await Coupon.deleteMany({
      code: { $in: ["WELCOME10", "SUMMER20", "VIP50"] },
    });
    await User.deleteMany({
      email: {
        $in: [
          "admin@hotel.com",
          "reception@hotel.com",
          "guest@hotel.com",
          "hamza@hotel.com",
        ],
      },
    });

    console.log("Seeding test users...");
    const users = await User.create([
      {
        name: "Super Administrator",
        email: "admin@hotel.com",
        password: "Password123!",
        role: ROLES.SUPER_ADMIN,
        phone: "+923000000001",
      },
      {
        name: "Front Desk Staff",
        email: "reception@hotel.com",
        password: "Password123!",
        role: ROLES.RECEPTIONIST,
        phone: "+923000000002",
      },
      {
        name: "Hamza Guest",
        email: "hamza@hotel.com",
        password: "Password123!",
        role: ROLES.GUEST,
        phone: "+923001234567",
      },
    ]);

    console.log(`✓ Seeded ${users.length} users (Password: Password123!)`);

    console.log("Seeding test rooms...");
    const rooms = await Room.create([
      {
        roomNumber: "101",
        type: "single",
        description: "Cozy Single Room with city view and ergonomic workstation.",
        capacity: 1,
        pricePerNight: 50,
        amenities: ["Free High-speed WiFi", "Air Conditioning", "32-inch Smart TV", "Work Desk"],
        housekeepingStatus: "clean",
        isActive: true,
        isDeleted: false,
        images: [
          {
            url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304",
            publicId: "seed/rooms/room_101",
          },
        ],
      },
      {
        roomNumber: "102",
        type: "double",
        description: "Comfortable Double Room with queen-size bed and balcony.",
        capacity: 2,
        pricePerNight: 85,
        amenities: ["Free High-speed WiFi", "Air Conditioning", "43-inch Smart TV", "Balcony", "Tea/Coffee Maker"],
        housekeepingStatus: "clean",
        isActive: true,
        isDeleted: false,
        images: [
          {
            url: "https://images.unsplash.com/photo-1590490360182-c33d57733427",
            publicId: "seed/rooms/room_102",
          },
        ],
      },
      {
        roomNumber: "103",
        type: "double",
        description: "Double Room currently under maintenance (to verify search exclusion).",
        capacity: 2,
        pricePerNight: 85,
        amenities: ["Free High-speed WiFi", "Air Conditioning"],
        housekeepingStatus: "maintenance", // Should NOT appear in available search
        isActive: true,
        isDeleted: false,
        images: [
          {
            url: "https://images.unsplash.com/photo-1590490360182-c33d57733427",
            publicId: "seed/rooms/room_103",
          },
        ],
      },
      {
        roomNumber: "201",
        type: "deluxe",
        description: "Spacious Deluxe Room with king-size bed, luxury bathroom and sea view.",
        capacity: 3,
        pricePerNight: 150,
        amenities: [
          "Free High-speed WiFi",
          "Air Conditioning",
          "55-inch OLED TV",
          "Mini Bar",
          "Ocean View Balcony",
          "Room Service",
        ],
        housekeepingStatus: "clean",
        isActive: true,
        isDeleted: false,
        images: [
          {
            url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
            publicId: "seed/rooms/room_201",
          },
        ],
      },
      {
        roomNumber: "301",
        type: "suite",
        description: "Presidential Luxury Suite with private jacuzzi, separate living room, and panoramic view.",
        capacity: 4,
        pricePerNight: 300,
        amenities: [
          "Free High-speed WiFi",
          "King Bed",
          "Private Jacuzzi",
          "Living Lounge",
          "Complimentary Breakfast",
          "Dedicated Butler",
        ],
        housekeepingStatus: "clean",
        isActive: true,
        isDeleted: false,
        images: [
          {
            url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39",
            publicId: "seed/rooms/room_301",
          },
        ],
      },
    ]);

    console.log(`✓ Seeded ${rooms.length} rooms`);
    console.log("\n========================================================");
    console.log("SEEDED ROOMS DETAILS (Use these IDs for Postman Testing):");
    console.log("========================================================");
    rooms.forEach((r) => {
      console.log(
        `Room ${r.roomNumber} [${r.type.toUpperCase()}] | Capacity: ${r.capacity} | Price: $${r.pricePerNight}/night | Status: ${r.housekeepingStatus} | ID: ${r._id}`
      );
    });

    console.log("Seeding promotional discount coupons...");
    const coupons = await Coupon.create([
      {
        code: "WELCOME10",
        discountType: "percentage",
        discountValue: 10,
        minBookingAmount: 50,
        maxDiscountAmount: 50,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        usageLimit: 500,
        isActive: true,
      },
      {
        code: "SUMMER20",
        discountType: "percentage",
        discountValue: 20,
        minBookingAmount: 100,
        maxDiscountAmount: 100,
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        usageLimit: 200,
        isActive: true,
      },
      {
        code: "VIP50",
        discountType: "fixed",
        discountValue: 50,
        minBookingAmount: 200,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        usageLimit: 100,
        isActive: true,
      },
    ]);

    console.log(`✓ Seeded ${coupons.length} promotional coupons`);

    console.log("\n========================================================");
    console.log("PROMOTIONAL COUPONS:");
    console.log("========================================================");
    coupons.forEach((c) => {
      console.log(
        `Code: ${c.code} | ${c.discountType === 'percentage' ? c.discountValue + '%' : '$' + c.discountValue} OFF | Min: $${c.minBookingAmount} | Limit: ${c.usageLimit}`
      );
    });
    console.log("========================================================\n");

    console.log("Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seed failed with error:", error);
    process.exit(1);
  }
};

seedData();
