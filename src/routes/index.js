import express from 'express'
import { userRoute } from './userRoute'
import { uploadRoute } from './uploadRoute'
import { productRoute } from './productRoute'
import { cardRoute } from './cardRoute'
import { orderHistoriesRoute } from './orderHistoriesRoute'

const Router = express.Router()
Router.use('/users', userRoute)
Router.use('/uploads', uploadRoute)
Router.use('/products', productRoute)
Router.use('/carts', cardRoute)
Router.use('/order-histories', orderHistoriesRoute)

export const API_V1 = Router
