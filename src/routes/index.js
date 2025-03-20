import express from 'express'
import { userRoute } from './userRoute'
import { uploadRoute } from './uploadRoute'
import { productRoute } from './productRoute'
import { cardRoute } from './cardRoute'

const Router = express.Router()
Router.use('/users', userRoute)
Router.use('/uploads', uploadRoute)
Router.use('/products', productRoute)
Router.use('/carts', cardRoute)





export const API_V1 = Router
