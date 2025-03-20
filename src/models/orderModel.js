import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '~/utils/constants'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { orderDetailModel } from './orderDetailModel'
import { userModel } from './userModel'
import { userAddressModel } from './userAddressModel'


// Define Collection (name & schema) cho Orders
const ORDER_COLLECTION_NAME = 'orders'
const ORDER_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  items: Joi.array().items(
    Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  ).default([]),
  totalAmount: Joi.number().required().min(0),
  discountAmount: Joi.number().min(0).default(0),
  shippingFee: Joi.number().min(0).default(0),
  finalAmount: Joi.number().min(0),
  paymentMethod: Joi.string().valid(...Object.keys(PAYMENT_METHOD)).default('COD'),
  paymentStatus: Joi.string().valid(...Object.keys(PAYMENT_STATUS)).default('PENDING'),
  status: Joi.string().valid(...Object.keys(ORDER_STATUS)).default('PENDING'),
  note: Joi.string().allow('', null),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await ORDER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const getDetailOrder = async (userId, orderId, session) => {
  try {
    const query = {
      _id: new ObjectId(orderId),
      userId: new ObjectId(userId)
    }

    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).aggregate([
      { $match: query },
      {
        $lookup: {
          from: orderDetailModel.ORDER_DETAILS_COLLECTION_NAME, 
          localField: "_id", 
          foreignField: "orderId",
          as: "orderItems"
        }
      },
      {
        $lookup: {
          from: userModel.USER_COLLECTION_NAME, 
          localField: "userId", 
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $lookup: {
          from: userAddressModel.USER_ADDRESS_COLLECTION_NAME,
          localField: "userInfo.address", 
          foreignField: "_id",
          as: "userAddress"
        }
      },
      {
        $project: {
          _id: 0, 
          userId: 0, 
          items: 0,
          discountAmount: 0,
          shippingFee: 0,
          "userInfo._id": 0, 
          "userInfo.password": 0,

          "orderItems._id": 0,
          "orderItems.orderId": 0 ,

          "userAddress._id": 0, 
          "userAddress.userId": 0,
          "userAddress.isDefault": 0
        }
      }
    ],
    { session }).toArray() 
    return result[0]
  } catch (error) {
    console.error("Error in getDetailOrder:", error)
    throw new Error(error)
  }
}

const findOneById = async (orderId, userId) => {
  try {
    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).findOne({ _id: new ObjectId(orderId),
      userId: new ObjectId(userId)
     })
    return result
  } catch (error) { throw new Error(error)}
}

const createOder = async (orderData, session) => {
  try {
    const validDate = await validateBeforeCreate(orderData)
    const cartDetailId = validDate.items.map(item => (new ObjectId(item)))
    const dataCreate = {
      ...validDate,
      items: cartDetailId,
      userId: new ObjectId(validDate.userId)
    }
    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).insertOne(dataCreate, {session})
    return result
  } catch (error) {throw new Error(error)}
}

const updateOrder = async (orderId, dataUpdate, session) => {
  try {
    const result = await GET_DB().collection(ORDER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(orderId) },
      { $set: dataUpdate },
      { returnDocument: 'after',session },
    )
    return result
  } catch (error) { throw error}
}

export const orderModel  = {
  getDetailOrder,
  findOneById,
  createOder,
  updateOrder,
}
