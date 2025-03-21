import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { userModel } from './userModel'


const REVIEW_LIKES_COLLECTION_NAME = 'review_likes'
const REVIEW_LIKES_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  reviewId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  createdAt: Joi.date().timestamp('javascript').default(Date.now)
})

const validateBeforeCreate = async (data) => {
  return await REVIEW_LIKES_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const findOneById = async (reviewId, userId) => {
   try {
      const result = await GET_DB().collection(REVIEW_LIKES_COLLECTION_NAME).findOne(
        { 
          reviewId: new ObjectId(reviewId),
          userId: new ObjectId(userId)
        }
      )
      return result
    } catch (error) { throw new Error(error)}
}

const deleteLikeReview = async (reviewLikeId) => {
  try {
    const result = await GET_DB().collection(REVIEW_LIKES_COLLECTION_NAME).deleteOne(
      { _id: new ObjectId(reviewLikeId) }
    )
    return result
  } catch (error) { throw new Error(error) }
}

const createLikeReview = async (reqData) => {
  try {
    const validData = await validateBeforeCreate(reqData)
    const data = {
      reviewId: new ObjectId(validData.reviewId),
      userId: new ObjectId(validData.userId)  
    }
    const result = await GET_DB().collection(REVIEW_LIKES_COLLECTION_NAME).insertOne(data)
    return result
  } catch (error) { throw new Error(error) }
}


const getUsersWhoLikedReview = async (reviewId) => {
  try {
    const result = await GET_DB().collection(REVIEW_LIKES_COLLECTION_NAME).aggregate([
      { 
        $match: { 
          reviewId: new ObjectId(reviewId) 
        } 
      },
      {
        $lookup: {
          from: userModel.USER_COLLECTION_NAME,
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          '_id': 1,
          'createdAt': 1,
          'user._id': 1,
          'user.username': 1,
          'user.avatar': 1
        }
      }
    ]).toArray()
    return result
  } catch (error) {throw new Error(error)}
}

export const reviewLikeModel = {
  findOneById,
  deleteLikeReview,
  createLikeReview,
  getUsersWhoLikedReview
}
