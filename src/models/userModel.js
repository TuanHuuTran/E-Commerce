
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE, OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'


// Define 2 roles
const USER_ROLES = {
  CLIENT: 'client',
  ADMIN: 'admin'
}

// Define Collection (name & schema)
const USER_COLLECTION_NAME = 'users'
const USER_COLLECTION_SCHEMA = Joi.object({
  email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
  password: Joi.string().required(),

  username: Joi.string().required().trim().strict(),
  address: Joi.alternatives().try(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    Joi.valid(null)
  ).default(null),
  avatar: Joi.string().default(null),
  role: Joi.string().valid(USER_ROLES.CLIENT, USER_ROLES.ADMIN). default(USER_ROLES.CLIENT),

  isActive: Joi.boolean().default(false),
  verifyToken: Joi.string(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await USER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const findOneById =async (userId) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ _id: new ObjectId(userId) })
    return result
  } catch (error) { throw new Error(error)}
}

const findOneByEmail =async (emailValue) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ email: emailValue })
    return result
  } catch (error) { throw new Error(error)}
}

const createUser = async (userData) => {
  try {
    const validDate = await validateBeforeCreate(userData)
    const createUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validDate)
    return createUser
  } catch (error) {throw new Error(error)}
}

const update = async (userId, dataUpdate) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: dataUpdate },
    { returnDocument: 'after' }
  )
  return result
  } catch (error) {throw new Error(error)}
}

const pushUserAddressId = async (userId, userAddressId, session) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: {address: userAddressId} },
      { returnDocument: 'after', session },
  )
  return result
  } catch (error) {throw new Error(error)}
}

export const userModel = {
  USER_COLLECTION_NAME,
  findOneById,
  findOneByEmail,
  createUser,
  update,
  pushUserAddressId
}
