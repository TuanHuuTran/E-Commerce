import express from 'express'
import { userRoute } from './userRoute'

const Router = express.Router()

Router.use('/users', userRoute)

export const API_V1 = Router
