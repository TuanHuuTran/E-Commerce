import { StatusCodes } from "http-status-codes"
import Joi from "joi"
import ApiError from "~/utils/ApiError"
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from "~/utils/validators"



const create = async (req, res, next) => {
  const correctCondition = Joi.object({
    productId:Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    quantity: Joi.number().required().min(0),
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

export const cardValidation = {
  create,
  update
}
