const AiService = require('../services/ai.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { ROLES } = require('../config/constants');

/**
 * ============================================================================
 * CHAT CONTROLLER (MGMT-03: Role-Governed AI Assistant Endpoints)
 * ============================================================================
 */
class ChatController {
  /**
   * POST /api/v1/chat/user
   * Guest AI Assistant: strictly read-only tools scoped to caller.
   */
  static async guestChat(req, res, next) {
    try {
      const { message, toolCallName, toolCallArgs } = req.body;
      const response = await AiService.processMessage({
        user: req.user,
        message,
        toolCallName,
        toolCallArgs,
      });

      return ApiResponse.success(res, 200, response, 'AI response generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/staff
   * Staff AI Assistant: operational lookups (arrivals, statuses, occupancy).
   */
  static async staffChat(req, res, next) {
    try {
      if (req.user.role !== ROLES.RECEPTIONIST && req.user.role !== ROLES.SUPER_ADMIN) {
        throw ApiError.forbidden('Only staff or administrators can access the staff AI assistant');
      }

      const { message, toolCallName, toolCallArgs } = req.body;
      const response = await AiService.processMessage({
        user: req.user,
        message,
        toolCallName,
        toolCallArgs,
      });

      return ApiResponse.success(res, 200, response, 'Staff AI response generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/admin
   * Super-Admin AI Assistant: full operational queries and prepare-mutation protocol.
   */
  static async adminChat(req, res, next) {
    try {
      if (req.user.role !== ROLES.SUPER_ADMIN) {
        throw ApiError.forbidden('Only Super-Administrators can access the administrative AI assistant');
      }

      const { message, toolCallName, toolCallArgs } = req.body;
      const response = await AiService.processMessage({
        user: req.user,
        message,
        toolCallName,
        toolCallArgs,
      });

      return ApiResponse.success(res, 200, response, 'Admin AI response generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/admin/confirm
   * Confirmation Challenge Execution: executes action after validating signed JWT confirmationToken.
   */
  static async confirmAction(req, res, next) {
    try {
      const { confirmationToken } = req.body;
      if (!confirmationToken) {
        throw ApiError.badRequest('confirmationToken is required');
      }

      const result = await AiService.confirmAction({
        confirmationToken,
        user: req.user,
      });

      return ApiResponse.success(res, 200, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ChatController;
