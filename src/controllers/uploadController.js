import { StatusCodes } from "http-status-codes"
import { userService } from "~/services/userService"

const uploadAvatarLocal = async (req, res) => {
  const userId = req.jwtDecoded.id
  const avatarLocal = req.file?.filename
  const result = await userService.updateAvatarLocal(userId, avatarLocal)
  res.status(StatusCodes.OK).json(result)
}

const uploadAvatarCloudinary = async (req, res) => {
  const userId = req.jwtDecoded.id
  const avatarCloudinary = req.file
  const result = await userService.updateAvatarCloudinary(userId, avatarCloudinary)
  res.status(StatusCodes.OK).json(result)
}

export const uploadController = {
  uploadAvatarLocal,
  uploadAvatarCloudinary
}
