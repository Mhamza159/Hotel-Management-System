/**
 * Standardized API response helper for clean, predictable JSON responses.
 * Follows: { success: boolean, statusCode: number, message: string, data: any }
 */
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  static success(res, statusCode = 200, data = null, message = 'Success') {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return res.status(201).json(new ApiResponse(201, data, message));
  }
}

module.exports = ApiResponse;
