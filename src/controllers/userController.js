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
export const userController = {
  createUser,
  login,
  verifyAccount
}
