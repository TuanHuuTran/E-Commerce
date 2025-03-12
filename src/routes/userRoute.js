import express from 'express'
import { userController } from '~/controllers/userController'
import asyncHandler from '~/middlewares/asyncHandler'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { userValidator } from '~/validations/userValidation'


const Router = express.Router()

Router.route('/register')
.post(userValidator.create,  asyncHandler(userController.createUser))

Router.route('/login')
.post(userValidator.login,  asyncHandler(userController.login))

Router.route('/refresh-token')
.put(asyncHandler(userController.refreshToken))

Router.route('/verify-account')
.get(userValidator.verifyAccount, asyncHandler(userController.verifyAccount))

Router.route('/update')
.post(authMiddleware.isAuthorized)
  // , userValidator.update,  asyncHandler(userController.update))

export const userRoute = Router
