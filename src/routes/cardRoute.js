import express from 'express'
import { cardController } from '~/controllers/cardController'
import asyncHandler from '~/middlewares/asyncHandler'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { cardValidation } from '~/validations/cardValidation'


const Router = express.Router()

Router.route('/add-to-cart')
  .post( authMiddleware.isAuthorized, cardValidation.create, asyncHandler(cardController.addToCart))


Router.route('/:id')
.get( authMiddleware.isAuthorized, asyncHandler(cardController.getDetailCart))

Router.route('/check-out-cart')
  .post( authMiddleware.isAuthorized, cardValidation.checkoutCart, asyncHandler(cardController.checkoutCart))

export const cardRoute = Router
