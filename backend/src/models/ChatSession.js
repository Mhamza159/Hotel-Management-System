const mongoose = require('mongoose');
const { ROLES } = require('../config/constants');

/**
 * ============================================================================
 * CHAT SESSION MODEL SCHEMA (MGMT-03)
 * ============================================================================
 * 
 * Yeh model AI Assistant ke conversation sessions, messages history,
 * aur role-governed tool call executions ko store karta hai.
 * 
 * Role Isolation & Security:
 * 1. Guest Assistant: Scoped to own bookings and public catalog queries.
 * 2. Staff Assistant: Scoped to front-desk metrics and arrivals.
 * 3. Admin Assistant: Supports confirmation-gated mutations.
 */

const chatMessageSchema = new mongoose.Schema(
  {
    // Message sender role
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: true,
    },

    // Message text content
    content: {
      type: String,
      default: '',
    },

    // Tools called by the AI model during this turn
    toolCalls: [
      {
        name: { type: String, required: true },
        args: { type: mongoose.Schema.Types.Mixed, default: {} },
        callId: { type: String },
      },
    ],

    // Outputs returned by the executed tools
    toolResults: [
      {
        callId: { type: String },
        result: { type: mongoose.Schema.Types.Mixed },
      },
    ],

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    // Conversation owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for chat session'],
      index: true,
    },

    // Role of user during the conversation
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },

    // Chat history thread
    messages: [chatMessageSchema],

    // Pending confirmation state for two-step destructive actions (e.g. cancellation)
    pendingConfirmation: {
      action: { type: String },
      payload: { type: mongoose.Schema.Types.Mixed },
      expiresAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Fast retrieval of recent user conversations
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

module.exports = ChatSession;
