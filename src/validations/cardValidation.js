import { StatusCodes } from "http-status-codes"
import Joi from "joi"
import ApiError from "~/utils/ApiError"
import { PAYMENT_METHOD } from "~/utils/constants"
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

const checkoutCart = async (req, res, next) => {
  const correctCondition = Joi.object({
    cartId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    shippingInfo: Joi.object({
      fullName: Joi.string().required().min(3).max(100).trim(),
      phone: Joi.string().required().pattern(/^[0-9]{10,11}$/).message('Phone number must have 10-11 digits'),
      address: Joi.string().required().min(5).max(200).trim(),
      city: Joi.string().required().trim(),
      district: Joi.string().required().trim(),
      ward: Joi.string().required().trim()
    }),
    note: Joi.string().allow('', null).trim(),
    paymentMethod: Joi.string().valid(...Object.keys(PAYMENT_METHOD))
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const cardValidation = {
  create,
  update,
  checkoutCart
}
