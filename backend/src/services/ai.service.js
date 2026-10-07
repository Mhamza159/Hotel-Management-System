const jwt = require('jsonwebtoken');
const ChatSession = require('../models/ChatSession');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomService = require('./room.service');
const AnalyticsService = require('./analytics.service');
const CancellationService = require('./cancellation.service');
const config = require('../config/env');
const { ROLES, BOOKING_STATUS } = require('../config/constants');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

/**
 * ============================================================================
 * AI SERVICE (MGMT-03: Role-Governed Assistant & Confirmation Protocol)
 * ============================================================================
 * 
 * Yeh service Hotel Assistant ki core brain logic provide karti hai:
 * 1. Role-Scoped Tool Isolation: User ka role determine karta hai ke kaun se tools accessible hain.
 * 2. Two-Step Human Confirmation Gate: Sensitive mutations (e.g. booking cancellation)
 *    ko bina signed confirmation token ke execute nahi hone deti.
 * 3. Session Persistence: Tamam messages, tool invocations, aur results ko ChatSession me store karti hai.
 */
class AiService {
  /**
   * Generates a signed short-lived confirmation token for high-impact mutations.
   * 
   * @param {Object} payload
   * @returns {string} Signed JWT confirmation token
   */
  static generateConfirmationToken(payload) {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: '10m' });
  }

  /**
   * Verifies and decodes a confirmation token.
   * 
   * @param {string} token
   * @returns {Object} Decoded payload
   */
  static verifyConfirmationToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (err) {
      throw ApiError.badRequest('Invalid or expired confirmation token');
    }
  }

  /**
   * Executes a role-governed tool call.
   * 
   * @param {string} toolName
   * @param {Object} args
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>}
   */
  static async executeTool(toolName, args, user) {
    const userRole = user.role;

    // ------------------------------------------------------------------------
    // GUEST TOOLS (Strictly Read-Only & Scoped to Caller)
    // ------------------------------------------------------------------------
    if (toolName === 'checkAvailability') {
      const { checkIn, checkOut, roomType } = args;
      const rooms = await RoomService.findAvailableRooms({
        checkInDate: checkIn,
        checkOutDate: checkOut,
        type: roomType,
      });
      return { availableCount: rooms.length, rooms: rooms.slice(0, 5) };
    }

    if (toolName === 'getRoomDetails') {
      const { roomType } = args;
      const query = { isDeleted: false, isActive: true };
      if (roomType) query.type = roomType.toLowerCase();
      const room = await Room.findOne(query).select('roomNumber type description pricePerNight amenities averageRating');
      if (!room) return { message: 'No rooms found for the requested type' };
      return room;
    }

    if (toolName === 'getMyBookings') {
      const bookings = await Booking.find({ userId: user._id })
        .populate('rooms.roomId', 'roomNumber type pricePerNight')
        .sort({ createdAt: -1 })
        .limit(5);
      return bookings;
    }

    // ------------------------------------------------------------------------
    // STAFF & ADMIN OPERATIONAL TOOLS
    // ------------------------------------------------------------------------
    const isStaffOrAdmin = userRole === ROLES.RECEPTIONIST || userRole === ROLES.SUPER_ADMIN;

    if (toolName === 'getBookingStatus') {
      if (!isStaffOrAdmin) {
        throw ApiError.forbidden('You do not have permission to query arbitrary booking statuses');
      }
      const booking = await Booking.findOne({ bookingReference: args.bookingReference?.toUpperCase() })
        .populate('userId', 'name email phone')
        .populate('rooms.roomId', 'roomNumber type');
      if (!booking) return { message: 'Booking not found' };
      return booking;
    }

    if (toolName === 'getBookingsForDateRange') {
      if (!isStaffOrAdmin) {
        throw ApiError.forbidden('You do not have permission to query operational arrivals');
      }
      const from = args.from ? new Date(args.from) : new Date();
      const to = args.to ? new Date(args.to) : new Date(Date.now() + 86400000);
      const bookings = await Booking.find({
        checkInDate: { $lte: to },
        checkOutDate: { $gte: from },
      })
        .populate('userId', 'name email')
        .limit(10);
      return bookings;
    }

    if (toolName === 'getOccupancyStats') {
      if (!isStaffOrAdmin) {
        throw ApiError.forbidden('You do not have permission to view occupancy metrics');
      }
      return AnalyticsService.getOccupancyMetrics({ date: args.date });
    }

    // ------------------------------------------------------------------------
    // SUPER-ADMIN DESTRUCTIVE TOOLS (Confirmation Gate Required)
    // ------------------------------------------------------------------------
    if (toolName === 'prepareBookingCancellation') {
      if (userRole !== ROLES.SUPER_ADMIN) {
        throw ApiError.forbidden('Only Super-Administrators can prepare booking cancellations via AI');
      }

      const { bookingReference, reason = 'Cancelled via AI Administrative Console' } = args;
      const booking = await Booking.findOne({ bookingReference: bookingReference?.toUpperCase() });
      if (!booking) {
        throw ApiError.notFound(`Booking with reference '${bookingReference}' not found`);
      }

      const confirmationToken = this.generateConfirmationToken({
        action: 'cancelBooking',
        bookingId: booking._id.toString(),
        bookingReference: booking.bookingReference,
        reason,
        adminId: user._id.toString(),
      });

      return {
        requiresConfirmation: true,
        pendingAction: {
          action: 'cancelBooking',
          bookingReference: booking.bookingReference,
          confirmationToken,
        },
        message: `Are you sure you want to cancel booking ${booking.bookingReference}? This action cannot be undone.`,
      };
    }

    throw ApiError.badRequest(`Unknown or unauthorized tool: ${toolName}`);
  }

  /**
   * Processes an incoming chat message, executes authorized tools, and updates the thread.
   * 
   * @param {Object} params
   * @param {Object} params.user - Authenticated user document
   * @param {string} params.message - User prompt text
   * @param {string} [params.toolCallName] - Explicit tool call name (from client or parsed intent)
   * @param {Object} [params.toolCallArgs] - Tool call arguments
   * @returns {Promise<Object>} Assistant response
   */
  static async processMessage({ user, message, toolCallName, toolCallArgs = {} }) {
    if (!message && !toolCallName) {
      throw ApiError.badRequest('Message content or toolCall is required');
    }

    // 1. Find or create user chat session
    let session = await ChatSession.findOne({ userId: user._id });
    if (!session) {
      session = await ChatSession.create({
        userId: user._id,
        role: user.role,
        messages: [],
      });
    }

    // 2. Append incoming user message
    session.messages.push({
      role: 'user',
      content: message || `Execute ${toolCallName}`,
      timestamp: new Date(),
    });

    let toolResult = null;
    let assistantReply = '';
    const toolCalls = [];
    const toolResults = [];

    // 3. Execute tool if requested or inferred
    if (toolCallName) {
      toolCalls.push({
        name: toolCallName,
        args: toolCallArgs,
        callId: `call_${Date.now()}`,
      });

      toolResult = await this.executeTool(toolCallName, toolCallArgs, user);

      toolResults.push({
        callId: toolCalls[0].callId,
        result: toolResult,
      });

      if (toolResult.requiresConfirmation) {
        assistantReply = toolResult.message;
        session.pendingConfirmation = {
          action: toolResult.pendingAction.action,
          payload: toolResult.pendingAction,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        };
      } else {
        assistantReply = `I executed ${toolCallName} successfully.`;
      }
    } else {
      assistantReply = `Hello ${user.name}! I am your Hotel AI Assistant. How can I help you today?`;
    }

    // 4. Append assistant response
    session.messages.push({
      role: 'assistant',
      content: assistantReply,
      toolCalls,
      toolResults,
      timestamp: new Date(),
    });

    await session.save();

    return {
      success: true,
      message: assistantReply,
      toolResult,
      session: {
        id: session._id,
        lastMessage: session.messages[session.messages.length - 1],
      },
    };
  }

  /**
   * Executes a confirmed action using a validated confirmation token.
   * 
   * @param {Object} params
   * @param {string} params.confirmationToken - Signed JWT from prepare step
   * @param {Object} params.user - Super-Admin user
   * @returns {Promise<Object>} Execution result
   */
  static async confirmAction({ confirmationToken, user }) {
    if (user.role !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden('Only Super-Admin accounts can confirm administrative mutations');
    }

    const payload = this.verifyConfirmationToken(confirmationToken);

    if (payload.action === 'cancelBooking') {
      const result = await CancellationService.approveCancellation({
        bookingId: payload.bookingId,
        staffId: user._id.toString(),
        staffRole: ROLES.SUPER_ADMIN,
        notes: payload.reason || 'Cancelled via AI Confirmation Protocol',
      });

      // Clear pending confirmation from session
      await ChatSession.findOneAndUpdate(
        { userId: user._id },
        { $unset: { pendingConfirmation: 1 } }
      );

      return {
        success: true,
        executed: true,
        message: `Booking ${payload.bookingReference} has been cancelled successfully with staff approval.`,
        details: result,
      };
    }

    throw ApiError.badRequest(`Unknown confirmation action: ${payload.action}`);
  }
}

module.exports = AiService;
