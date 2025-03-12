import JWT from 'jsonwebtoken'


const generateToken = (userInfo, secret, tokenLife) => {
  try {
    return JWT.sign(
      userInfo,
      secret,
      { expiresIn: tokenLife }
    )
  } catch (error) {
    throw error
  }
}

const verifyToken = (token, secret) => {
  try {
    return JWT.verify( token,secret )
  } catch (error) {
    throw error
  } 
}

export const JWTProvider = {
  generateToken,
  verifyToken
}
