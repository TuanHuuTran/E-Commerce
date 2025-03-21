import express from 'express'
import { reviewController } from '~/controllers/reviewController'
import asyncHandler from '~/middlewares/asyncHandler'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { reviewValidation } from '~/validations/reviewValidation'


const Router = express.Router()

Router.route('/')
.post( authMiddleware.isAuthorized, reviewValidation.create,  asyncHandler(reviewController.createReview))

Router.route('/:id')
  .put( authMiddleware.isAuthorized, reviewValidation.update, asyncHandler(reviewController.updateReview))
  .delete(authMiddleware.isAuthorized, asyncHandler(reviewController.deleteReview))

  // Route để toggle like/unlike
Router.route('/:reviewId/like')
  .post( authMiddleware.isAuthorized, asyncHandler(reviewController.toggleLike))


// Route để lấy danh sách người dùng đã like
Router.route('/:reviewId/likes')
  .get(authMiddleware.isAuthorized, asyncHandler(reviewController.getLikedUsers))


export const reviewRoute = Router
