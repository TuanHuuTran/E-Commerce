
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'


// Define 2 roles

// Define Collection (name & schema)
const CARD_DETAIL_COLLECTION_NAME = 'cardDetails'
const CARD_DETAIL_COLLECTION_SCHEMA = Joi.object({
  cartId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  quantity: Joi.number().required().min(0),
  totalPrice: Joi.number().required().min(0),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await CARD_DETAIL_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const findAllProductByCartId=async (cartId, session) => {
  try {
    const result = await GET_DB().collection(CARD_DETAIL_COLLECTION_NAME).find({ cartId: new ObjectId(cartId) }, {session}).toArray()
    return result
  } catch (error) { throw new Error(error)}
}



const findOneById = async (cartDetailId, session) => {
  try {
    const result = await GET_DB().collection(CARD_DETAIL_COLLECTION_NAME).findOne({ _id: new ObjectId(cartDetailId) }, {session})
    return result
  } catch (error) { throw new Error(error)}
}

const findProductInCartDetail = async (productId, cartId, session) => {
  try {
    const query = {
      cartId: cartId,
      productId: new ObjectId(productId)
    }
    const result = await GET_DB().collection(CARD_DETAIL_COLLECTION_NAME).findOne(query, {session})
    return result
  } catch (error) { throw new Error(error)}
}

const create = async (createData, session) => {
  try {
    const validate = await validateBeforeCreate(createData)
    const newData = {
      ...validate,
      cartId: new ObjectId(validate.cartId),
      productId: new ObjectId(validate.productId),
    }
    const result = await GET_DB().collection(CARD_DETAIL_COLLECTION_NAME).insertOne(newData, {session})
    return result
  } catch (error) { throw new Error(error)}
}

const update = async (itemId, dataUpdate, session) => {
  try {
    const result = await GET_DB().collection(CARD_DETAIL_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(itemId) },
      { $set: dataUpdate },
      { returnDocument: 'after', session },
    )
    return result
  } catch (error) { throw error}
}

const deleteCartDetail = async (itemId, session) => {
  try {
    const result = await GET_DB().collection(CARD_DETAIL_COLLECTION_NAME).deleteOne(
      { _id: new ObjectId(itemId) },
      {session}
    )    
    return result
  } catch (error) { throw new Error(error)}
}

const deleteManyByCartId = async (itemId, session) => {
  try {
    const result = await GET_DB().collection(CARD_DETAIL_COLLECTION_NAME).deleteMany(
      { cartId: new ObjectId(itemId) },
      {session}
    )    
    return result
  } catch (error) { throw new Error(error)}
}

export const cartDetailModel = {
  findAllProductByCartId,
  findOneById,
  findProductInCartDetail,
  create,
  update,
  CARD_DETAIL_COLLECTION_NAME,
  deleteCartDetail,
  deleteManyByCartId
}
