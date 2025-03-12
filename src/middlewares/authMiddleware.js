import { StatusCodes } from "http-status-codes"
import { env } from "~/config/environment"
import { JWTProvider } from "~/providers/JWTProvider"

const isAuthorized = async (req, res, next) => {

  const accessTokenFromLocalStorage = req.headers?.authorization.substring('Bearer '.length)
  if (!accessTokenFromLocalStorage) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Access Token is required!' })
    return
  }

  try {
    const accessTokenDecoded = await JWTProvider.verifyToken(
      accessTokenFromLocalStorage,
      env.ACCESS_TOKEN_SECRET_SIGNATURE
    )

    req.jwtDecoded = accessTokenDecoded
    next()
  } catch (error) {
    console.log(error)
    if (error.message?.includes('jwt expired')) {
      res.status(StatusCodes.GONE).json({ message: 'need to refresh token' })
      return
    }
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Token not found' })
  }
}

export const authMiddleware = {
  isAuthorized
}
