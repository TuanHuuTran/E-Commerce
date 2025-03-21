import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { productModel } from './productModel'
import { pagingSkipValue } from '~/utils/algorithms'

// Define Collection (name & schema)
const REVIEW_COLLECTION_NAME = 'reviews'
const REVIEW_COLLECTION_SCHEMA = Joi.object({
  userId:Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().required().trim(),
  comment: Joi.string().required(),
  images: Joi.array().items(Joi.string()).default([]),
  likes: Joi.number().integer().min(0).default(0),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  deletedAt: Joi.date().timestamp('javascript').default(null),
  isDeleted: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await REVIEW_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const findOneById = async (reviewId) => {
  try {
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).findOne(
      { _id: new ObjectId(reviewId), isDeleted: { $ne: true }}
    )
    return result
  } catch (error) { throw new Error(error)}
}

const createReview = async (reqData) => {
  try {
    const validData = await validateBeforeCreate(reqData)
    const data = {
      ...validData,
      productId: new ObjectId(validData.productId),
      userId: new ObjectId(validData.userId)
    }
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).insertOne(data)
    return result
  } catch (error) { throw new Error(error) }
}

const findReviewsByProductId = async (productId, page = 1, itemsPerPage = 10, sort = { createdAt: -1 }) => {
  try {
    let sortCondition = { createdAt: -1 }
    
    if (sort) {
      sortCondition = {}
      if (sort.createdAt) {
        sortCondition.createdAt = sort.createdAt === "desc" ? -1 : 1
      }
      if (sort.rating) {
        sortCondition.rating = sort.rating === "desc" ? -1 : 1
      }
      if (sort.likes) {
        sortCondition.likes = sort.likes === "desc" ? -1 : 1
      }
    }

    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).aggregate([
      { $match: { product_id: new ObjectId(productId) } },
      { $sort: sortCondition },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          product_id: 1,
          rating: 1,
          comment: 1,
          images: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          'user._id': 1,
          'user.name': 1,
          'user.avatar': 1
        }
      },
      {
        $facet: {
          'reviews': [
            { $skip: pagingSkipValue(page, itemsPerPage) },
            { $limit: itemsPerPage }
          ],
          'totalReviews': [{ $count: 'count' }],
          'ratingStats': [
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 },
                rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
              }
            }
          ]
        }
      }
    ]).toArray()

    const res = result[0]
    return {
      reviews: res.reviews || [],
      totalReviews: res.totalReviews[0]?.count || 0,
      ratingStats: res.ratingStats[0] || {
        averageRating: 0,
        totalRatings: 0,
        rating5: 0,
        rating4: 0,
        rating3: 0,
        rating2: 0,
        rating1: 0
      }
    }
  } catch (error) { throw new Error(error) }
}

const findReviewByUserAndProduct = async (userId, productId) => {
  try {
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).findOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId)
    })
    return result
  } catch (error) { throw new Error(error) }
}

const updateReview = async (reviewId, dataUpdate) => {
  try {
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(reviewId) },
      { 
        $set: {
          ...dataUpdate,
          updatedAt: Date.now()
        } 
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const deleteReview = async (reviewId) => {
  try {
    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).deleteOne(
      { _id: new ObjectId(reviewId) }
    )
    return result
  } catch (error) { throw new Error(error) }
}



const updateProductRating = async (productId) => {
  try {
    // Calculate average rating for the product
    const ratingStats = await GET_DB().collection(REVIEW_COLLECTION_NAME).aggregate([
      { $match: { productId: new ObjectId(productId) } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]).toArray()

    // If there are reviews, update the product with average rating
    if (ratingStats.length > 0) {
      await GET_DB().collection(productModel.PRODUCT_COLLECTION_NAME).updateOne(
        { _id: new ObjectId(productId) },
        {
          $set: {
            averageRating: parseFloat(ratingStats[0].averageRating.toFixed(1)),
            totalReviews: ratingStats[0].totalReviews,
            updatedAt: Date.now()
          }
        }
      )
    }
    
    return ratingStats[0] || { averageRating: 0, totalReviews: 0 }
  } catch (error) { throw new Error(error) }
}

const getProductReviews = async (productId, page, itemsPerPage, search, sort) => {
  try {
    const queryCondition = { 
      productId: new ObjectId(productId),
      isDeleted: { $ne: true } 
    }

    if (search) {
      queryCondition.$or = [
        { title: { $regex: new RegExp(search, "i") } },
        { comment: { $regex: new RegExp(search, "i") } }
      ]
    }

    let sortCondition = { createdAt: -1 }
    
    if (sort) {
      sortCondition = {}
      
      if (sort.rating) {
        sortCondition.rating = sort.rating === "desc" ? -1 : 1
      }
      
      if (sort.likes) {
        sortCondition.likes = sort.likes === "desc" ? -1 : 1
      }
      
      if (sort.createdAt) {
        sortCondition.createdAt = sort.createdAt === "desc" ? -1 : 1
      }
    }

    const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).aggregate([
      { $match: queryCondition },
      { $sort: sortCondition },
      { $facet: {
        'reviews': [
          { $skip: pagingSkipValue(page, itemsPerPage) },
          { $limit: itemsPerPage },
          {$project: {deletedAt: 0, isDeleted: 0, updatedAt : 0}}
        ],
        'totalReviews': [{ $count: 'CountedTotalReviews' }]
      }}
    ]).toArray()

    const res = result[0]
    
    return {
      reviews: res.reviews || [],
      totalReviews: res.totalReviews[0]?.CountedTotalReviews || 0
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateLikeReview = async (reviewId, like) => {
  const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(reviewId) },
    { $inc: { likes: like } },
    { returnDocument: 'after' }
  )
  return result
}
export const reviewModel = {
  REVIEW_COLLECTION_NAME,
  findOneById,
  createReview,
  findReviewsByProductId,
  findReviewByUserAndProduct,
  updateReview,
  deleteReview,
  updateLikeReview,
  updateProductRating,
  getProductReviews
}
