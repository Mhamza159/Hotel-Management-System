const express = require('express');
const ChatController = require('../controllers/chat.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  chatMessageSchema,
  confirmActionSchema,
} = require('../validations/chat.validation');

const router = express.Router();

// 1. Guest AI Assistant
// POST /api/v1/chat/user
router.post('/user', authenticate, validate(chatMessageSchema), ChatController.guestChat);

// 2. Staff AI Assistant
// POST /api/v1/chat/staff
router.post('/staff', authenticate, validate(chatMessageSchema), ChatController.staffChat);

// 3. Super-Admin AI Assistant
// POST /api/v1/chat/admin
router.post('/admin', authenticate, validate(chatMessageSchema), ChatController.adminChat);

// 4. Super-Admin Confirmation Execution
// POST /api/v1/chat/admin/confirm
router.post('/admin/confirm', authenticate, validate(confirmActionSchema), ChatController.confirmAction);

module.exports = router;
