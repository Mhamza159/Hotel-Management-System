const express = require('express');
const EngagementController = require('../controllers/engagement.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createReviewSchema,
  reviewIdParamSchema,
  joinWaitlistSchema,
  waitlistIdParamSchema,
  roomIdParamSchema,
} = require('../validations/engagement.validation');

// 1. Review Router (/api/v1/reviews)
const reviewRouter = express.Router();
reviewRouter.post('/', authenticate, validate(createReviewSchema), EngagementController.createReview);
reviewRouter.delete('/:id', authenticate, validate(reviewIdParamSchema), EngagementController.deleteReview);
// Also support GET /api/v1/reviews/rooms/:id as an alternate convenience
reviewRouter.get('/rooms/:id', EngagementController.getRoomReviews);

// 2. Loyalty Router (/api/v1/loyalty)
const loyaltyRouter = express.Router();
loyaltyRouter.get('/balance', authenticate, EngagementController.getLoyaltyBalance);

// 3. Waitlist Router (/api/v1/waitlist)
const waitlistRouter = express.Router();
waitlistRouter.post('/', authenticate, validate(joinWaitlistSchema), EngagementController.joinWaitlist);
waitlistRouter.get('/', authenticate, EngagementController.getGuestWaitlists);
waitlistRouter.delete('/:id', authenticate, validate(waitlistIdParamSchema), EngagementController.cancelWaitlist);

// 4. Wishlist Router (/api/v1/wishlist)
const wishlistRouter = express.Router();
wishlistRouter.get('/', authenticate, EngagementController.getWishlist);
wishlistRouter.post('/:roomId', authenticate, validate(roomIdParamSchema), EngagementController.addToWishlist);
wishlistRouter.delete('/:roomId', authenticate, validate(roomIdParamSchema), EngagementController.removeFromWishlist);

module.exports = {
  reviewRouter,
  loyaltyRouter,
  waitlistRouter,
  wishlistRouter,
};
