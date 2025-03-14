import { compareSync, hashSync } from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { env } from '~/config/environment'
import { userModel } from '~/models/userModel'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { JWTProvider } from '~/providers/JWTProvider'
import { SendEmailProvider } from '~/providers/SendEmailProvider'
import ApiError from '~/utils/ApiError'
import Exception from '~/utils/Exception'
import { pickUser } from '~/utils/formatters'

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
    if ( !exitUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, Exception.WRONG_USERNAME_PASSWORD)
    if (!compareSync(reqBody.password, exitUser.password) ) throw new ApiError(StatusCodes.NOT_ACCEPTABLE,Exception.WRONG_USERNAME_PASSWORD)
    
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

const refreshToken = async (refreshToken) => {
  try {
  const refreshTokenDecoded = await JWTProvider.verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET_SIGNATURE)
  const userInfo = {
    id: refreshTokenDecoded.id,
    email: refreshTokenDecoded.email
  }
  const accessToken = await JWTProvider.generateToken(userInfo, env.ACCESS_TOKEN_SECRET_SIGNATURE, env.ACCESS_TOKEN_LIFE)
  return {accessToken}

  } catch (error) {throw error}
}

const verifyAccount = async (token, email) => {
  const existUser = await userModel.findOneByEmail(email)
  if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND,Exception.USER_NOT_FOUND)
  if ( existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, Exception.WRONG_USERNAME_PASSWORD)
  if (token !== existUser.verifyToken) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, Exception.TOKEN_INVALID)
 
  const dataUpdate = {
    isActive: true,
    verifyToken: null
  }
  const updateUser = await userModel.update(existUser._id, dataUpdate)
  return 'Account already!'
}

const update = async (userId, reqData, avatarUpload) => {

  try {
    const existUser = await userModel.findOneById(userId)
    if(!existUser) throw new ApiError(StatusCodes.NOT_FOUND,Exception.USER_NOT_FOUND)
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active')
    let updateUser = {}
  
    if(reqData.oldPassword && reqData.newPassword) {
      if (!compareSync(reqData.oldPassword, existUser.password) ) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE,Exception.WRONG_USERNAME_PASSWORD)
      }
      updateUser = await userModel.update(userId, {password: hashSync(reqData.newPassword, 8)})
    } else if (avatarUpload) {
      const result = await CloudinaryProvider.streamUpload(avatarUpload.buffer, 'users')
      updateUser = await userModel.update(userId, {avatar: result.secure_url})
    } else {
      updateUser = await userModel.update(userId, reqData)
    }
    return updateUser
  } catch (error) {throw error}
}

const updateAvatarLocal = async (userId, avatarLocal) => {
  const existUser = await userModel.findOneById(userId)
  if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, "User not found")

  const userUpdate = await userModel.update(userId, { avatar: avatarLocal })
  return userUpdate
}

const updateAvatarCloudinary = async (userId, avatarCloudinary) => {
  const existUser = await userModel.findOneById(userId)
  if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, "User not found")

  const uploadResult = await CloudinaryProvider.streamUpload(avatarCloudinary.buffer, 'users')
  const userUpdate = await userModel.update(userId, { avatar: uploadResult.secure_url })
  return userUpdate
}

export const userService = {
  createUser,
  login,
  verifyAccount,
  refreshToken,
  update,
  updateAvatarLocal,
  updateAvatarCloudinary
}
