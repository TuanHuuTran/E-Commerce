import { StatusCodes } from "http-status-codes"
import { userService } from "~/services/userService"

export const createUser = async (req, res) => {
    const newUser = await userService.createUser(req.body)
    res.status(StatusCodes.CREATED).json(newUser)
}

export const login = async (req, res) => {
  const user = await userService.login(req.body)
  res.status(StatusCodes.CREATED).json(user)
}

export const verifyAccount = async (req, res) => {
  const {token, email} = req.query
  console.log('token, email', token, email)
  const result = await userService.verifyAccount(token, email)
  res.status(StatusCodes.CREATED).json(result)
}

export const refreshToken = async (req, res) => {

  const result = await userService.refreshToken(req.body?.refreshToken)
  res.status(StatusCodes.CREATED).json(result)
}

export const update = async (req, res) => {
  const userId = req.jwtDecoded.id
  const avatarUpload = req.file?.originalname
  const userAvatarFile = req.file
  const result = await userService.update(userId,avatarUpload, userAvatarFile)
  res.status(StatusCodes.OK).json(result)
}

export const userController = {
  createUser,
  login,
  verifyAccount,
  refreshToken,
  update
}
