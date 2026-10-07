const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { BOOKING_STATUS } = require('../config/constants');
const ApiError = require('../utils/apiError');
const {
  uploadStreamToCloudinary,
  deleteFromCloudinary,
} = require('../config/cloudinary');

/**
 * ============================================================================
 * ROOM SERVICE (Business Logic & Availability Engine)
 * ============================================================================
 * 
 * Yeh service Hotel ke rooms ki catalog search aur availability filtering manage karti hai.
 * 
 * Sab se ahem logic: DATE OVERLAP EXCLUSION
 * Jab guest koi date range [checkInDate, checkOutDate] select karta hai, to system un tamaam
 * kamron ko bahar nikal deta hai jin par pehle se koi active booking mojood ho.
 */
class RoomService {
  /**
   * Finds all available rooms for a given date range and optional filtering criteria.
   * Excludes rooms that have active overlapping bookings (pending, confirmed, checked-in).
   *
   * @param {Object} params
   * @param {string|Date} params.checkInDate - Mehmaan ki amad ki tareekh
   * @param {string|Date} params.checkOutDate - Mehmaan ki rawangi ki tareekh
   * @param {string} [params.type] - Kamre ki category (single, double, deluxe, suite)
   * @param {number} [params.minCapacity] - Kam az kam kitne mehmaano ki jagah chahiye
   * @param {number} [params.minPrice] - Minimum budget
   * @param {number} [params.maxPrice] - Maximum budget
   * @returns {Promise<Array>} List of available room documents
   */
  static async findAvailableRooms({
    checkInDate,
    checkOutDate,
    type,
    minCapacity,
    minPrice,
    maxPrice,
    excludeBookingId,
  }) {
    // ------------------------------------------------------------------------
    // STEP 1: DATE INPUT VALIDATION (Dates ka jaiza)
    // ------------------------------------------------------------------------
    if (!checkInDate || !checkOutDate) {
      throw ApiError.badRequest('Both checkInDate and checkOutDate are required');
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Check karein ke dates valid formats me hain ya nahi
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw ApiError.badRequest('Invalid date format for checkInDate or checkOutDate');
    }

    // Checkout date hamesha Checkin ke baad honi chahiye (Kam az kam 1 raat ka stay)
    if (checkIn >= checkOut) {
      throw ApiError.badRequest('checkOutDate must be strictly after checkInDate');
    }

    // Maazi (past) ki dates me booking allow nahi hai. Aaj ki tareekh ki midnight se compare karein:
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      throw ApiError.badRequest('checkInDate cannot be in the past');
    }

    // ------------------------------------------------------------------------
    // STEP 2: MATHEMATICAL OVERLAP DETECTION (Takraao ki shart)
    // ------------------------------------------------------------------------
    // Misaal: Guest maang raha hai: 10 Oct se 15 Oct.
    // Koi purani booking tab takrayegi agar:
    // 1. Purani booking ki checkIn (e.g. 12 Oct) < Requested checkOut (15 Oct)
    //    AND
    // 2. Purani booking ki checkOut (e.g. 14 Oct) > Requested checkIn (10 Oct)
    //
    // Note: Agar purani booking 10 Oct ko check-out ho rahi hai, to naya guest
    // usi din 10 Oct ko check-in kar sakta hai (No overlap).
    //
    // Sirf 'active' bookings takraati hain (Cancelled bookings ko ignore kiya jata hai):
    const activeStatuses = [
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.CHECKED_IN,
    ];

    const bookingQuery = {
      status: { $in: activeStatuses },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    };
    if (excludeBookingId) {
      bookingQuery._id = { $ne: excludeBookingId };
    }

    // .distinct('rooms.roomId') se humein un tamam rooms ki unique IDs ki list mil jaati hai
    // jo in tareekho me doosri bookings ke zariye pehle se busy hain.
    const bookedRoomIds = await Booking.find(bookingQuery).distinct('rooms.roomId');

    // ------------------------------------------------------------------------
    // STEP 3: QUERY AVAILABLE ROOMS (Khali kamron ki list nikaalna)
    // ------------------------------------------------------------------------
    const query = {
      // Jo rooms busy hain unko nikaal do ($nin = Not In)
      _id: { $nin: bookedRoomIds },
      // Sirf active kamray
      isActive: true,
      // Deleted kamray shamil na hon
      isDeleted: false,
      // Maintenance wale kamray booking me nahi aa sakte
      housekeepingStatus: { $ne: 'maintenance' },
    };

    // User ne agar room type ka filter lagaya ho (e.g. 'deluxe')
    if (type) {
      query.type = type.toLowerCase();
    }

    // User ne agar capacity filter lagaya ho (e.g. kam az kam 3 afraad)
    if (minCapacity) {
      query.capacity = { $gte: Number(minCapacity) };
    }

    // Budget price filter (min aur max price)
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.pricePerNight = {};
      if (minPrice !== undefined) query.pricePerNight.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.pricePerNight.$lte = Number(maxPrice);
    }

    // Saste se mehngay (Low to High) ki tarteeb me return karo
    const availableRooms = await Room.find(query).sort({ pricePerNight: 1 });
    return availableRooms;
  }

  /**
   * Retrieves a single active room by ID.
   *
   * @param {string} roomId
   * @param {boolean} [includeDeleted=false]
   * @returns {Promise<Object>} Room document
   */
  static async getRoomById(roomId, includeDeleted = false) {
    const filter = { _id: roomId };
    if (includeDeleted) {
      filter.isDeleted = { $in: [true, false] };
    } else {
      filter.isDeleted = false;
    }

    const room = await Room.findOne(filter);
    if (!room) {
      throw ApiError.notFound(`Room with ID '${roomId}' not found`);
    }
    return room;
  }

  // ==========================================================================
  // SUPER-ADMIN ROOM CATALOG MANAGEMENT (CRUD)
  // ==========================================================================

  /**
   * Creates a new physical room definition in the catalog.
   *
   * @param {Object} roomData
   * @param {string} roomData.roomNumber - Unique room code (e.g. '401', 'PH-1')
   * @param {string} roomData.type - Room tier (single, double, deluxe, suite, presidential)
   * @param {string} roomData.description - Room marketing description
   * @param {number} roomData.capacity - Max guest capacity
   * @param {number} roomData.pricePerNight - Base price per night
   * @param {Array<string>} [roomData.amenities] - List of amenities
   * @param {Array<Object>} [roomData.images] - [{ url, publicId }]
   * @returns {Promise<Object>} Newly created room document
   */
  static async createRoom(roomData) {
    const formattedRoomNumber = String(roomData.roomNumber || "").trim().toUpperCase();

    if (!formattedRoomNumber) {
      throw ApiError.badRequest("Room number is required");
    }

    // 1. Room number uniqueness check (including existing soft-deleted rooms to prevent index conflicts)
    const existingRoom = await Room.findOne({
      roomNumber: formattedRoomNumber,
      isDeleted: false,
    });

    if (existingRoom) {
      throw ApiError.conflict(
        `Room with number '${formattedRoomNumber}' already exists in catalog`
      );
    }

    // 2. Base pricing & capacity validation
    if (roomData.pricePerNight !== undefined && Number(roomData.pricePerNight) < 0) {
      throw ApiError.badRequest("Price per night cannot be negative");
    }

    if (roomData.capacity !== undefined && Number(roomData.capacity) < 1) {
      throw ApiError.badRequest("Room capacity must be at least 1 guest");
    }

    // 3. Create room document
    const room = await Room.create({
      roomNumber: formattedRoomNumber,
      type: roomData.type,
      description: (roomData.description && String(roomData.description).trim()) || `${roomData.type ? roomData.type.charAt(0).toUpperCase() + roomData.type.slice(1) : 'Deluxe'} Suite with modern comfort and bespoke amenities.`,
      capacity: Number(roomData.capacity),
      pricePerNight: Number(roomData.pricePerNight),
      amenities: Array.isArray(roomData.amenities) ? roomData.amenities : [],
      images: Array.isArray(roomData.images) ? roomData.images : [],
      housekeepingStatus: roomData.housekeepingStatus || "clean",
      isActive: roomData.isActive !== undefined ? Boolean(roomData.isActive) : true,
      isDeleted: false,
    });

    return room;
  }

  /**
   * Updates an existing room definition (pricing, type, capacity, amenities).
   *
   * @param {string} roomId
   * @param {Object} updateData
   * @returns {Promise<Object>} Updated room document
   */
  static async updateRoom(roomId, updateData) {
    const room = await this.getRoomById(roomId);

    // Agar room number change kiya ja raha ho toh uniqueness verify karein
    if (updateData.roomNumber) {
      const formattedNum = String(updateData.roomNumber).trim().toUpperCase();
      if (formattedNum !== room.roomNumber) {
        const duplicate = await Room.findOne({
          roomNumber: formattedNum,
          _id: { $ne: roomId },
          isDeleted: false,
        });

        if (duplicate) {
          throw ApiError.conflict(`Room number '${formattedNum}' is already in use`);
        }
        room.roomNumber = formattedNum;
      }
    }

    if (updateData.type !== undefined) room.type = updateData.type;
    if (updateData.description !== undefined) room.description = updateData.description.trim();
    if (updateData.capacity !== undefined) {
      if (Number(updateData.capacity) < 1) {
        throw ApiError.badRequest("Capacity must be at least 1 guest");
      }
      room.capacity = Number(updateData.capacity);
    }
    if (updateData.pricePerNight !== undefined) {
      if (Number(updateData.pricePerNight) < 0) {
        throw ApiError.badRequest("Price per night cannot be negative");
      }
      room.pricePerNight = Number(updateData.pricePerNight);
    }
    if (updateData.amenities !== undefined && Array.isArray(updateData.amenities)) {
      room.amenities = updateData.amenities;
    }
    if (updateData.isActive !== undefined) {
      room.isActive = Boolean(updateData.isActive);
    }
    if (updateData.images !== undefined && Array.isArray(updateData.images)) {
      room.images = updateData.images;
    }

    await room.save();
    return room;
  }

  /**
   * Soft-deletes a physical room record to preserve historical booking audit trails.
   *
   * @param {string} roomId
   * @returns {Promise<Object>} Deletion receipt
   */
  static async softDeleteRoom(roomId) {
    const room = await this.getRoomById(roomId);

    // Guard: Check karein kya is room ki aainda (future) ki koi confirmed/checked-in booking mojood hai?
    const activeFutureBookings = await Booking.find({
      "rooms.roomId": room._id,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
      checkOutDate: { $gt: new Date() },
    });

    if (activeFutureBookings.length > 0) {
      throw ApiError.badRequest(
        `Cannot delete room '${room.roomNumber}'. It has ${activeFutureBookings.length} upcoming active reservation(s). Please reassign or cancel those bookings first.`
      );
    }

    // Soft delete: Room ko inactive aur isDeleted mark karein
    room.isDeleted = true;
    room.isActive = false;
    await room.save();

    return {
      success: true,
      message: `Room '${room.roomNumber}' has been successfully soft-deleted from active catalog.`,
      roomId: room._id,
      isDeleted: room.isDeleted,
      isActive: room.isActive,
    };
  }

  /**
   * Super-Admin & Staff view for browsing all rooms with filters and pagination.
   *
   * @param {Object} query - { page, limit, type, housekeepingStatus, isActive, search }
   * @returns {Promise<Object>} Paginated room list
   */
  static async getAdminRooms(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };

    if (query.type) {
      filter.type = query.type.toLowerCase();
    }
    if (query.housekeepingStatus) {
      filter.housekeepingStatus = query.housekeepingStatus.toLowerCase();
    }
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === "true" || query.isActive === true;
    }
    if (query.search) {
      filter.roomNumber = { $regex: query.search.trim(), $options: "i" };
    }

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .sort({ roomNumber: 1 })
        .skip(skip)
        .limit(limit),
      Room.countDocuments(filter),
    ]);

    return {
      rooms,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================================================
  // HOUSEKEEPING STATUS WORKFLOW
  // ==========================================================================

  /**
   * Updates room cleanliness status (clean, dirty, cleaning, maintenance).
   *
   * @param {string} roomId
   * @param {Object} params
   * @param {string} params.housekeepingStatus - Target status
   * @param {string} [params.notes] - Housekeeping notes
   * @returns {Promise<Object>} Updated room document
   */
  static async updateHousekeepingStatus(roomId, { housekeepingStatus, notes }) {
    const validStatuses = ["clean", "dirty", "cleaning", "maintenance"];
    const status = String(housekeepingStatus || "").toLowerCase();

    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest(
        `Invalid housekeeping status '${housekeepingStatus}'. Allowed: ${validStatuses.join(", ")}`
      );
    }

    const room = await this.getRoomById(roomId);
    room.housekeepingStatus = status;
    await room.save();

    return {
      success: true,
      message: `Room '${room.roomNumber}' housekeeping status transitioned to '${status}'.`,
      room: {
        _id: room._id,
        roomNumber: room.roomNumber,
        type: room.type,
        housekeepingStatus: room.housekeepingStatus,
        notes: notes || null,
        updatedAt: room.updatedAt,
      },
    };
  }

  // ==========================================================================
  // MEDIA MANAGEMENT WORKFLOW (Cloudinary + Multer)
  // ==========================================================================

  /**
   * Uploads multiple room photos to Cloudinary and attaches them to the Room record.
   *
   * @param {string} roomId
   * @param {Array<Object>} files - Array of Multer file objects with in-memory buffer
   * @returns {Promise<Object>} Updated Room document
   */
  static async uploadRoomImages(roomId, files) {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw ApiError.badRequest("Please select at least one image file to upload.");
    }

    const room = await this.getRoomById(roomId);

    // Parallel stream upload to Cloudinary
    const uploadPromises = files.map((file) =>
      uploadStreamToCloudinary(file.buffer, {
        folder: `hotel-management/rooms/${room.roomNumber}`,
      })
    );

    const uploadedAssets = await Promise.all(uploadPromises);

    // Append new photos to existing room images
    room.images.push(...uploadedAssets);
    await room.save();

    return room;
  }

  /**
   * Removes an image from Cloudinary remote CDN and detaches it from the Room record.
   *
   * @param {string} roomId
   * @param {string} publicId - The Cloudinary asset public ID
   * @returns {Promise<Object>} Deletion receipt & updated room
   */
  static async deleteRoomImage(roomId, publicId) {
    if (!publicId) {
      throw ApiError.badRequest("publicId is required to delete an image.");
    }

    const room = await this.getRoomById(roomId);

    const imageExists = room.images.some((img) => img.publicId === publicId);
    if (!imageExists) {
      throw ApiError.notFound(`Image with publicId '${publicId}' not found on this room.`);
    }

    // Remote Cloudinary destruction
    await deleteFromCloudinary(publicId);

    // Remove from MongoDB
    room.images = room.images.filter((img) => img.publicId !== publicId);
    await room.save();

    return {
      success: true,
      message: "Room image deleted successfully from Cloudinary and catalog.",
      images: room.images,
    };
  }
}

module.exports = RoomService;
