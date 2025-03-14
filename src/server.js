import express from 'express'
import { API_V1 } from './routes'
import { CONNECT_DB } from './config/mongodb'
import { env } from '~/config/environment'
import { errorHandlingMiddleware } from './middlewares/errorHandlingMiddleware'

const START_SERVER = () => {
  const app = express()

  //middleware config handle JSON 
  app.use(express.json()) // Xử lý JSON body
  app.use(express.urlencoded({ extended: true })) // Xử lý form-urlencoded
  //config route
  app.use('/v1', API_V1)
  
  app.use(errorHandlingMiddleware)

  app.listen(env.APP_PORT, () => {
    console.log(`Example app listening on port ${env.APP_PORT}`)
  })
}

CONNECT_DB()
  .then(() => console.log('Connect mongodb success!'))
  .then(() =>  START_SERVER())
  .catch(error => {console.log(error)})
