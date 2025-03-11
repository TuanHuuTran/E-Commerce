import JWT from 'jsonwebtoken'

const generateToken = (userInfo, secret, tokenLife) => {
  return JWT.sign(
    userInfo,
    secret,
    { expiresIn: tokenLife }
  )
}

export const JWTProvider = {
  generateToken
}
