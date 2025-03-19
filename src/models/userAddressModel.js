import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, PHONE_RULE, PHONE_RULE_MESSAGE } from '~/utils/validators'
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'


// Define Collection (name & schema) cho UserAddress
const USER_ADDRESS_COLLECTION_NAME = 'userAddresses'
const USER_ADDRESS_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  fullName: Joi.string().required().min(3).max(100),
  phone: Joi.string().required().pattern(PHONE_RULE).message(PHONE_RULE_MESSAGE),
  address: Joi.string().required().min(5).max(200),
  city: Joi.string().required(),
  district: Joi.string().required(),
  ward: Joi.string().required(),
  isDefault: Joi.boolean().default(false),
  addressType: Joi.string().valid('HOME', 'OFFICE', 'OTHER').default('HOME'),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await USER_ADDRESS_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createAddress = async (userId, shippingInfo,session) => {
  try {
    const validDate = await validateBeforeCreate({...shippingInfo, userId})
    const dataCreate = {
      ...validDate,
      userId: new ObjectId(validDate.userId)
    }
    const result = await GET_DB().collection(USER_ADDRESS_COLLECTION_NAME).insertOne(dataCreate, {session})
    return result
  } catch (error) {throw new Error(error)}
}

const updateAddress = async (addressId, dataUpdate, session) => {
  try {
    const result = await GET_DB().collection(USER_ADDRESS_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(addressId) },
    { $set: dataUpdate },
    { returnDocument: 'after', session },
  )
  return result
  } catch (error) {throw new Error(error)}
}

export const userAddressModel = {
  USER_ADDRESS_COLLECTION_NAME,
  createAddress,
  updateAddress
}
