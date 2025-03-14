import express from 'express'
import { productController } from '~/controllers/productController'
import asyncHandler from '~/middlewares/asyncHandler'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadCloudinaryMiddleware } from '~/middlewares/multerUploadCloudinaryMiddleware'
import { productValidation } from '~/validations/productValidation'

const Router = express.Router()

Router.route('/')
  .get( authMiddleware.isAuthorized, asyncHandler(productController.getAllProduct))
  .post( authMiddleware.isAuthorized, productValidation.create, asyncHandler(productController.createProduct))

Router.route('/:id')
  .get( authMiddleware.isAuthorized, asyncHandler(productController.getDetailProduct))
  .delete( authMiddleware.isAuthorized, asyncHandler(productController.deleteProduct))
  .put(
    authMiddleware.isAuthorized,
    multerUploadCloudinaryMiddleware.uploadCloudinary.array('images', 10),
    productValidation.update,
    asyncHandler(productController.updateProduct)
  )

export const productRoute = Router
