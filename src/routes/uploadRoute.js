import express from 'express'
import { uploadController } from '~/controllers/uploadController'
import asyncHandler from '~/middlewares/asyncHandler'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadCloudinaryMiddleware } from '~/middlewares/multerUploadCloudinaryMiddleware'
import { multerUploadLocalMiddleware } from '~/middlewares/multerUploadLocalMiddleware'


const Router = express.Router()

Router.route('/local')
.put(
  authMiddleware.isAuthorized, 
  multerUploadLocalMiddleware.uploadLocal.single('avatar'),
  asyncHandler(uploadController.uploadAvatarLocal)
)

Router.route('/cloudinary')
.put(
  authMiddleware.isAuthorized, 
  multerUploadCloudinaryMiddleware.uploadCloudinary.single('avatar'),
  asyncHandler(uploadController.uploadAvatarCloudinary)
)

Router.route('/images/product')
.put(
  authMiddleware.isAuthorized, 
  multerUploadCloudinaryMiddleware.uploadCloudinary.array('images', 10),
  asyncHandler(uploadController.uploadImagesToProduct)
)
export const uploadRoute = Router
