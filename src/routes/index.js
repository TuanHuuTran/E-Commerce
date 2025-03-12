import express from 'express'
import { userRoute } from './userRoute'
import { uploadRoute } from './uploadRoute'

const Router = express.Router()

Router.use('/users', userRoute)
Router.use('/uploads', uploadRoute)

export const API_V1 = Router
