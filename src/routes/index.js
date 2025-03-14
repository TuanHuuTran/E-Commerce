import express from 'express'
import { userRoute } from './userRoute'
import { uploadRoute } from './uploadRoute'
import { productRoute } from './productRoute'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/uploads', uploadRoute)
Router.use('/products', productRoute)



export const API_V1 = Router
