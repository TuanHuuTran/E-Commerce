import { StatusCodes } from "http-status-codes"
import Joi from "joi"
import ApiError from "~/utils/ApiError"
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "~/utils/validators"



const create = async (req, res, next) => {
  const correctCondition = Joi.object({
  productId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().required().trim(),
  comment: Joi.string().required().trim(),
  images: Joi.array().items(Joi.string()).default([]),
  })
  try {
    await correctCondition.validateAsync(req.body, {abortEarly: false})
    next()
  } catch (error) {
    next( new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}



const update = async (req, res, next) => {
  const correctCondition = Joi.object({
    rating: Joi.number().integer().min(1).max(5),
    title: Joi.string().trim(),
    comment: Joi.string().trim(),
    images: Joi.array().items(Joi.string()).default([]),
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next( new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const reviewValidation = {
  create,
  update
}
