
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { cartDetailModel } from './cartDetailModel'
import { productModel } from './productModel'


// Define 2 roles

// Define Collection (name & schema)
const CARD_COLLECTION_NAME = 'cards'
const CARD_COLLECTION_SCHEMA = Joi.object({
  userId:Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  totalPrice: Joi.number().required().min(0).default(0),
  items: Joi.array()
  .items(
    Joi.object({
      productId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).required(),
      quantity: Joi.number().integer().min(1).default(1)
    })
  )
  .default([]),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await CARD_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}
const findCartByUserId = async (userId, session) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOne(
      { userId: new ObjectId(userId) },
      { session }
    );
    return result;
  } catch (error) { throw new Error(error); }
};

const findOneById=async (cartId, userId) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOne({ _id: new ObjectId(cartId),
      userId: new ObjectId(userId)
     })
    return result
  } catch (error) { throw new Error(error)}
}

const addToCart = async (cardData) => {
  try {

    const validDate = await validateBeforeCreate(cardData)
    const dataCreate = {
      ...validDate,
      userId: new ObjectId(validDate.userId)
    }
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).insertOne(dataCreate)
    return result
  } catch (error) {throw new Error(error)}
}

  const updateItems = async (cardId, dataUpdate, session) => {
    try {
      const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(cardId) },
      { $push: {items: dataUpdate} },
      { returnDocument: 'after'},
      {session}
    )
    return result
    } catch (error) {throw new Error(error)}
  }

const updatePrice = async (cardId, priceChange, session) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(cardId) },
    { $inc: { totalPrice: priceChange } },
    { returnDocument: 'after'},
    {session}
  )
  return result
  } catch (error) {throw new Error(error)}
}

const getDetailCart = async (cartId, userId) => {
  try {
    const query = {
      _id: new ObjectId(cartId),
      userId: new ObjectId(userId)
    }

    const result = await GET_DB().collection(CARD_COLLECTION_NAME).aggregate([
      { $match: query },
      {
        $lookup: {
          from: cartDetailModel.CARD_DETAIL_COLLECTION_NAME,  
          let: { cartItems: "$items" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$cartItems"]
                }
              }
            },
            {
              $lookup: {
                from: productModel.PRODUCT_COLLECTION_NAME,  
                localField: "productId",  
                foreignField: "_id",
                as: "productInfo"
              }
            },
            { $unwind: "$productInfo" }, 
            {
              $project: {
                _id: 0,
                cartId: 0,
                "productInfo._id": 0 
              }
            }
          ],
          as: "cartItems"
        }
      },
      {
        $project: {
          _id: 0,
          items: 0
        }
      }
    ]).toArray()  
    return result[0] || null 
  } catch (error) {
    throw new Error(error)
  }
}


const removeItem = async (cartId, cartDetailId, session) => {
  try {
    const result = await GET_DB().collection(CARD_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(cartId) },
    { $pull: { items: new ObjectId(cartDetailId) } },
    { returnDocument: "after"} ,
    {session}
  )
  return result
  } catch (error) {throw new Error(error)}
}


  const deleteCart = async (cartId, session) => {
    try {
      const result = await GET_DB().collection(CARD_COLLECTION_NAME).deleteOne(
        { _id: new ObjectId(cartId) },
        {session}
      )
      return result
    } catch (error) { throw new Error(error)}
  }

export const cardModel = {
  findCartByUserId,
  findOneById,
  addToCart,
  updateItems,
  updatePrice,
  getDetailCart,
  removeItem,
  deleteCart
}
