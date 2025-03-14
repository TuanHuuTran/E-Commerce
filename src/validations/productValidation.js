import { StatusCodes } from "http-status-codes"
import Joi from "joi"
import ApiError from "~/utils/ApiError"



const create = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().positive().required(),
    stock: Joi.number().integer().min(0).required()
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
    name: Joi.string().trim().strict(),
    description: Joi.string().trim().strict(),
    price: Joi.number().positive(),
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next( new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const productValidation = {
  create,
  update
}
