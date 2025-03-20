import express from 'express'
import { orderHistoriesController } from '~/controllers/oderHistoriesController'
import asyncHandler from '~/middlewares/asyncHandler'
import { authMiddleware } from '~/middlewares/authMiddleware'


const Router = express.Router()

Router.route('/')
  .get( authMiddleware.isAuthorized, asyncHandler(orderHistoriesController.getAllOrderHistories))

export const orderHistoriesRoute = Router
