
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { pagingSkipValue } from '~/utils/algorithms'


// Define Collection (name & schema)
const PRODUCT_COLLECTION_NAME = 'products'
const PRODUCT_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  price: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0),
  category_id: Joi.number().integer().allow(null), 
  thumbnail: Joi.string().allow("").optional(),  
  images: Joi.array().items(Joi.string()).default([]), 
  buyturn: Joi.number().integer().min(0).optional(),  
  createdAt: Joi.date().timestamp('javascript').default(Date.now), 
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

const validateBeforeCreate = async (data) => {
  return await PRODUCT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const findOneById =async (productId, session) => {
  try {
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOne({ _id: new ObjectId(productId) }, {session})
    return result
  } catch (error) { throw new Error(error)}
}


const getAllProduct =async (page,itemsPerPage,search,sort) => {
  try {
    const queryCondition = {}

    if (search) {
      const isNumeric = !isNaN(search)
      queryCondition.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { description: { $regex: new RegExp(search, "i") } }
      ]
      if (isNumeric) {
        queryCondition.$or.push({ price: parseFloat(search) })
      }
    }

    let sortCondition = { createdAt: -1 } 
    if (sort) {
      sortCondition = {}
      if (sort.price) {
        sortCondition.price = sort.price === "desc" ? -1 : 1
      }
      if (sort.buyturn) {
        sortCondition.buyturn = sort.buyturn === "desc" ? -1 : 1
      }
    }
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).aggregate([
      {$match: queryCondition},
      {$sort: sortCondition},
      {$facet: {
        'products': [
          {$skip: pagingSkipValue(page, itemsPerPage)},
          {$limit: itemsPerPage}
        ],
        'totalProduct': [{$count: 'CountedTotalProduct'} ]
      }}
    ]).toArray()

    const res = result[0]
    return {
      products: res.products || [],
      totalProduct: res.totalProduct[0].CountedTotalProduct || 0
    }
  } catch (error) { throw new Error(error)}
}


const createProduct = async (reqData) => {
  try {
    const validDate = await validateBeforeCreate(reqData)
    const createUser = await GET_DB().collection(PRODUCT_COLLECTION_NAME).insertOne(validDate)
    return createUser
  } catch (error) {throw new Error(error)}
}

const updateProduct = async (productId, dataUpdate) => {
  try {
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(productId) },
    { $set: dataUpdate },
    { returnDocument: 'after' }
  )
  return result
  } catch (error) {throw new Error(error)}
}

const updateStockAndBuyturn = async (productId, quantity, session) => {
  try {
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).findOneAndUpdate(
      { _id: productId },
      { 
        $inc: { 
          stock: -quantity,   // Giảm stock
          buyturn: quantity   // Tăng buyturn
        } 
      },
      { returnDocument: 'after', session},
    )
    return result
  } catch (error) {
    throw error
  }
}

const deleteProduct = async (productId, dataUpdate) => {
  try {
    const result = await GET_DB().collection(PRODUCT_COLLECTION_NAME).deleteOne(
    { _id: new ObjectId(productId) }
  )
  return result
  } catch (error) {throw new Error(error)}
}

export const productModel = {
  PRODUCT_COLLECTION_NAME,
  findOneById,
  getAllProduct,
  // getDetailProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStockAndBuyturn
}
