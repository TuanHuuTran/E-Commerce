import express from 'express'
import { userController } from '~/controllers/userController'
import asyncHandler from '~/middlewares/asyncHandler'
import { userValidator } from '~/validations/userValidation'


const Router = express.Router()

Router.route('/register')
.post(userValidator.create,  asyncHandler(userController.createUser))

Router.route('/login')
.post(userValidator.login,  asyncHandler(userController.login))

Router.route('/verify-account')
.get(userValidator.verifyAccount, asyncHandler(userController.verifyAccount))
export const userRoute = Router
