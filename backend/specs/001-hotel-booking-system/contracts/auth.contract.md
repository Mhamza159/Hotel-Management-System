# API Contract: Authentication & User Accounts

**Base URL**: `/api/auth`

---

## 1. Register User
- **Method / Route**: `POST /api/auth/register`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "User registered successfully. Verification email dispatched.",
      "data": {
        "user": {
          "id": "651f8a7e2b10a9001b92a101",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "role": "user",
          "permissions": []
        }
      }
    }
    ```
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: Email already registered.

---

## 2. Login User
- **Method / Route**: `POST /api/auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi...",
        "user": {
          "id": "651f8a7e2b10a9001b92a101",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "role": "user",
          "permissions": []
        }
      }
    }
    ```
  - `401 Unauthorized`: Invalid credentials or account deactivated.

---

## 3. Refresh Access Token
- **Method / Route**: `POST /api/auth/refresh-token`
- **Auth**: Public (Valid Refresh Token required)
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Responses**:
  - `200 OK`: Returns new `accessToken`.
  - `401 Unauthorized`: Expired or revoked refresh token.

---

## 4. Password Recovery
- **POST `/api/auth/forgot-password`**: `{ "email": "jane@example.com" }` → `200 OK`
- **POST `/api/auth/reset-password`**: `{ "token": "abc123token", "newPassword": "NewPassword123!" }` → `200 OK`
- **POST `/api/auth/verify-email`**: `{ "token": "verify123token" }` → `200 OK`
