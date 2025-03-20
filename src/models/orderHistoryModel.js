import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'
import { PAYMENT_METHOD, PAYMENT_STATUS, ORDER_STATUS } from '~/utils/constants'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'


const ORDER_HISTORY_COLLECTION_NAME = 'orderHistories'
const ORDER_HISTORY_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  orderId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  totalAmount: Joi.number().required().min(0),
  finalAmount: Joi.number().min(0),
  paymentMethod: Joi.string().valid(...Object.keys(PAYMENT_METHOD)).required(),
  paymentStatus: Joi.string().valid(...Object.keys(PAYMENT_STATUS)).required(),
  orderStatus: Joi.string().valid(...Object.keys(ORDER_STATUS)).required(),
  stripeSessionId: Joi.string().allow('', null),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await ORDER_HISTORY_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createOrderHistory = async (data, session = null) => {
  try {
    const validData = await validateBeforeCreate(data)
    const newOrderHistory = {
      ...validData,
      userId: new ObjectId(validData.userId),
      orderId: new ObjectId(validData.orderId)
    }
    
    const options = session ? { session } : {}
    const result = await GET_DB().collection(ORDER_HISTORY_COLLECTION_NAME).insertOne(newOrderHistory, options)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findOrderHistoryByUserId = async (userId) => {
  try {
    const result = await GET_DB().collection(ORDER_HISTORY_COLLECTION_NAME)
      .find({ 
        userId: new ObjectId(userId),
        _destroy: false 
      })
      .sort({ createdAt: -1 })
      .project({ userId: 0, _id: 0 })
      .toArray()
    
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findOrderHistoryByOrderId = async (orderId) => {
  try {
    const result = await GET_DB().collection(ORDER_HISTORY_COLLECTION_NAME)
      .findOne({ 
        orderId: new ObjectId(orderId),
        _destroy: false 
      })
    
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const deleteOrderHistory = async (orderId) => {
  try {
    const result = await GET_DB().collection(ORDER_HISTORY_COLLECTION_NAME)
      .updateOne(
        { orderId: new ObjectId(orderId) },
        { $set: { _destroy: true, updatedAt: new Date() } }
      )
    
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const orderHistoryModel = {
  ORDER_HISTORY_COLLECTION_NAME,
  ORDER_HISTORY_COLLECTION_SCHEMA,
  createOrderHistory,
  findOrderHistoryByUserId,
  findOrderHistoryByOrderId,
  deleteOrderHistory
}
