import { compareSync, hashSync } from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { env } from '~/config/environment'
import { userModel } from '~/models/userModel'
import { JWTProvider } from '~/providers/JWTProvider'
import { SendEmailProvider } from '~/providers/SendEmailProvider'
import ApiError from '~/utils/ApiError'
import Exception from '~/utils/Exception'
import { pickUser } from '~/utils/formaters'

const createUser = async (reqBody) => {
  try {
    const isExitUser = await userModel.findOneByEmail(reqBody.email)
    if (isExitUser) throw new ApiError(StatusCodes.CONFLICT,Exception.USER_EXIST)
    const nameFromEmail = reqBody.email.split('@')[0]

    const userData = {
      ...reqBody,
      password: hashSync(reqBody.password, 8),
      username: nameFromEmail,
      isActive: false,
      verifyToken: uuidv4()
    }
    const user = await userModel.createUser(userData)
    const getUser = await userModel.findOneById(user.insertedId)

    await SendEmailProvider.sendVerificationEmail(getUser.email, getUser.verifyToken)
    return pickUser(getUser)
  } catch (error) {throw error}
}

const login = async (reqBody) => {
  try {
    const exitUser = await userModel.findOneByEmail(reqBody.email)
    if (!exitUser) throw new ApiError(StatusCodes.NOT_FOUND,Exception.USER_NOT_FOUND)
    if ( !exitUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')
    if (!compareSync(reqBody.password, exitUser.password) ) throw new ApiError(StatusCodes.NOT_ACCEPTABLE,ExceptionWRONG_USERNAME_PASSWORD)
    
    const userInfo = {
      id: exitUser._id,
      email: exitUser.email
    }
    
    const accessToken = JWTProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )

    const refreshToken = JWTProvider.generateToken(
      userInfo,
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_LIFE
    )

    return {
      ...pickUser(exitUser),
      accessToken,
      refreshToken
    }
  } catch (error) {throw error}
}

const verifyAccount = async (token, email) => {
  const existUser = await userModel.findOneByEmail(email)
  if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND,Exception.USER_NOT_FOUND)
  if ( existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is already active!')
  if (token !== existUser.verifyToken) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Token is invalid!')
 
  const dataUpdate = {
    isActive: true,
    verifyToken: null
  }
  const updateUser = await userModel.update(existUser._id, dataUpdate)
  return 'Account already!'
}

export const userService = {
  createUser,
  login,
  verifyAccount
}
