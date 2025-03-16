import { MongoClient, ServerApiVersion } from 'mongodb'
import { env } from '~/config/environment'
let eCommerceDatabaseInstance = null

const mongoClientInstance = new MongoClient(env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

export const CONNECT_DB = async () => {
  await mongoClientInstance.connect()
  eCommerceDatabaseInstance = mongoClientInstance.db(env.DATABASE_NAME)
}

export const CLOSE_DB = async () => {
  await mongoClientInstance.close()
}

export const GET_DB = () => {
  if ( !eCommerceDatabaseInstance ) throw new Error('Must connect to Database first')
  return eCommerceDatabaseInstance
}

export const GET_CLIENT = () => {
  if (!mongoClientInstance) throw new Error('Must connect to Database first');
  return mongoClientInstance;
}
