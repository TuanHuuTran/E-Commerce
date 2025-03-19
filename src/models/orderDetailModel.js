import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const ORDER_DETAILS_COLLECTION_NAME = 'orderDetails'
const ORDER_DETAILS_COLLECTION_SCHEMA = Joi.object({
  orderId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productName: Joi.string().required().min(1).max(200),
  productImage: Joi.string().allow('', null),
  quantity: Joi.number().integer().required().min(1),
  price: Joi.number().required().min(0),
  totalPrice: Joi.number().required().min(0),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateSchema = async (data) => {
  return await ORDER_DETAILS_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createOrderDetail = async (data, session) => {
  try {
    const validData = await validateSchema(data)
    const dataCreate = {
      ...validData,
      orderId: new ObjectId(validData.orderId),
      productId: new ObjectId(validData.productId)
    }
    const result = await GET_DB().collection(ORDER_DETAILS_COLLECTION_NAME).insertOne(
      dataCreate,
      { session }
    )
    return result
  } catch (error) {
    throw error
  }
}

const findByOrderId = async (orderId) => {
  try {
    const result = await GET_DB().collection(ORDER_DETAILS_COLLECTION_NAME).find({
      orderId: orderId
    }).toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

export const orderDetailModel = {
  ORDER_DETAILS_COLLECTION_NAME,
  ORDER_DETAILS_COLLECTION_SCHEMA,
  createOrderDetail,
  findByOrderId
}
