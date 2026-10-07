const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const Room = require('./models/Room');

const LUXURY_ROOMS = [
  // 1. Single Rooms
  {
    roomNumber: '101',
    type: 'single',
    description: 'Cozy and serene Solo Sanctuary tailored for the discerning individual traveler. Features an ergonomic workstation, high-speed fiber WiFi, and bespoke acoustic dampening for total privacy.',
    capacity: 1,
    pricePerNight: 75,
    averageRating: 4.8,
    amenities: ['High-speed WiFi', 'Air Conditioning', '43-inch Smart TV', 'Ergonomic Workstation', 'Rainfall Shower', 'In-room Safe', 'Tea & Nespresso Maker'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/101_1' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/101_2' }
    ]
  },
  {
    roomNumber: '104',
    type: 'single',
    description: 'Executive Solo Pod overlooking the courtyard gardens. Designed for focused productivity with plush Italian linens, ambient warm lighting, and luxury Malin+Goetz bath amenities.',
    capacity: 1,
    pricePerNight: 95,
    averageRating: 4.9,
    amenities: ['High-speed WiFi', 'Air Conditioning', 'Courtyard View', 'Bespoke Work Desk', 'Mini Fridge', 'Rainfall Shower', 'Soundproofing'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/104_1' },
      { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/104_2' }
    ]
  },

  // 2. Double Rooms
  {
    roomNumber: '102',
    type: 'double',
    description: 'Contemporary Superior Queen Room offering an oasis of calm. Fitted with a handcrafted queen bed, sun-drenched private balcony, and state-of-the-art climate control.',
    capacity: 2,
    pricePerNight: 130,
    averageRating: 4.7,
    amenities: ['High-speed WiFi', 'Air Conditioning', 'Private Balcony', '50-inch 4K TV', 'Nespresso Coffee Bar', 'Mini Bar', 'Plush Bathrobes & Slippers'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/102_1' },
      { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/102_2' }
    ]
  },
  {
    roomNumber: '105',
    type: 'double',
    description: 'Deluxe Double Terrace Suite featuring two queen beds and direct access to the private terrace. Ideal for traveling partners or small families seeking refined comfort.',
    capacity: 2,
    pricePerNight: 155,
    averageRating: 4.8,
    amenities: ['High-speed WiFi', 'Air Conditioning', 'Private Terrace', '55-inch OLED TV', 'Dual Vanity Sinks', 'Mini Bar', 'Daily Housekeeping'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/105_1' },
      { url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/105_2' }
    ]
  },
  {
    roomNumber: '202',
    type: 'double',
    description: 'Skyline Twin Residence situated on an elevated floor with floor-to-ceiling glass framing panoramic city views. Features acoustic soundproofing and marble-clad bathroom.',
    capacity: 2,
    pricePerNight: 145,
    averageRating: 4.9,
    amenities: ['High-speed WiFi', 'City View', 'Air Conditioning', 'Twin Beds', 'Keyless Digital Access', 'Luxury Toiletries', '24/7 Room Service'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/202_1' },
      { url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/202_2' }
    ]
  },

  // 3. Deluxe Rooms
  {
    roomNumber: '201',
    type: 'deluxe',
    description: 'Grand Deluxe Oceanview Suite offering captivating seascape vistas. Boasts a plush King-size bed, private teak-wood balcony, cocktail station, and deep soaking tub.',
    capacity: 3,
    pricePerNight: 220,
    averageRating: 4.9,
    amenities: ['Ocean View', 'Private Teak Balcony', 'King-size Bed', 'Deep Soaking Tub', 'Curated Mini Bar', 'Nespresso Machine', 'High-speed WiFi', '65-inch 4K TV'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/201_1' },
      { url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/201_2' },
      { url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/201_3' }
    ]
  },
  {
    roomNumber: '203',
    type: 'deluxe',
    description: 'Royal Garden Deluxe Haven featuring private courtyard access and an indoor-outdoor living flow. Includes a freestanding soaking tub, custom Egyptian cotton linens, and mood lighting.',
    capacity: 3,
    pricePerNight: 245,
    averageRating: 4.9,
    amenities: ['Garden Patio', 'Freestanding Tub', 'King-size Bed', 'Complimentary Breakfast', 'High-speed WiFi', 'Walk-in Wardrobe', 'Butler Call Button'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/203_1' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/203_2' }
    ]
  },

  // 4. Suites
  {
    roomNumber: '301',
    type: 'suite',
    description: 'Signature Horizon Luxury Suite. Features a master bedroom, an expansive separate living salon with dining table, private jacuzzi bathroom, and 180-degree sunset ocean panorama.',
    capacity: 4,
    pricePerNight: 380,
    averageRating: 5.0,
    amenities: ['Separate Living Salon', 'Private Jacuzzi', 'Dining Area', 'Panoramic Ocean View', 'Nespresso Coffee Bar', '24/7 Dedicated Butler', 'Champagne on Arrival', 'Smart Home Automation'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/301_1' },
      { url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/301_2' },
      { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/301_3' }
    ]
  },
  {
    roomNumber: '302',
    type: 'suite',
    description: 'Penthouse Sky Suite on the top tier. Architecturally designed with dramatic double-height ceilings, wraparound sky terrace, outdoor jacuzzi, and a curated private wine and spirits bar.',
    capacity: 4,
    pricePerNight: 460,
    averageRating: 4.9,
    amenities: ['Wraparound Sky Terrace', 'Outdoor Jacuzzi', 'Double-height Ceilings', 'Wine Cellar', 'Dyson Supersonic Haircare', 'Bang & Olufsen Sound System', 'Private Check-in'],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/302_1' },
      { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/302_2' }
    ]
  },

  // 5. Presidential Suite
  {
    roomNumber: '401',
    type: 'presidential',
    description: 'The Sovereign Presidential Estate — the pinnacle of grand hospitality. Features direct keycard-controlled private elevator entry, two master King wings, a heated plunge pool on the sky deck, Hermès Paris bath amenities, and a private chef dining suite.',
    capacity: 6,
    pricePerNight: 850,
    averageRating: 5.0,
    amenities: [
      'Private Elevator Access',
      'Private Heated Plunge Pool',
      'Two Master Suites',
      'Private Chef Dining Suite',
      'Hermès Paris Amenities',
      '24/7 Dedicated Butler & Chauffeur',
      'Bespoke Bar with Rare Malts',
      'Custom Spa Treatment Room'
    ],
    housekeepingStatus: 'clean',
    isActive: true,
    isDeleted: false,
    reservedRanges: [],
    images: [
      { url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/401_1' },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/401_2' },
      { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/401_3' },
      { url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80', publicId: 'seed/rooms/401_4' }
    ]
  }
];

const seedRooms = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await connectDB();

    console.log(`Upserting ${LUXURY_ROOMS.length} luxury hotel suites and rooms...`);

    for (const roomData of LUXURY_ROOMS) {
      await Room.findOneAndUpdate(
        { roomNumber: roomData.roomNumber },
        { $set: roomData },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`✓ Room ${roomData.roomNumber} [${roomData.type.toUpperCase()}] ($${roomData.pricePerNight}/night) - Clean & Ready`);
    }

    const totalRooms = await Room.countDocuments({ isDeleted: false, isActive: true });
    console.log(`\n======================================================`);
    console.log(`SUCCESS: Total active rooms available for booking: ${totalRooms}`);
    console.log(`======================================================\n`);

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed luxury rooms:', error);
    process.exit(1);
  }
};

seedRooms();
