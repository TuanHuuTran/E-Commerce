import { StatusCodes } from "http-status-codes"
import { cardService } from "~/services/cardService"


const getCard = async (req, res) => {
  const { page, itemsPerPage, search, sort } = req.query
  const products = await cardService.getCard(page, itemsPerPage, search, sort)
  res.status(StatusCodes.OK).json(products)
}

const getDetailCart = async (req, res) => {
  const cartId = req.params
  const userId = req.jwtDecoded.id
  const cart = await cardService.getDetailCart(cartId, userId)
  res.status(StatusCodes.OK).json(cart)

}

const addToCart = async (req, res) => {
  const userId = req.jwtDecoded.id
  const {productId,quantity } = req.body
  const cart = await cardService.addToCart(userId, productId, quantity )
  res.status(StatusCodes.CREATED).json(cart)
}

const updateCard = async (req, res) => {
  const productId = req.params.id
  const images = req.files || []
  const arrayBuffer = images.map(image => image.buffer)
  const updateCard = await cardService.updateCard(productId, req.body,arrayBuffer)
  res.status(StatusCodes.OK).json(updateCard)
}

const deleteCard = async (req, res) => {
  const productId = req.params.id
  const deleteCard = await cardService.deleteCard(productId)
  if (deleteCard.deletedCount === 0 ) {
    res.status(StatusCodes.OK).json({message: 'Product not found' })
  } else {
    res.status(StatusCodes.OK).json({message: 'Deleted product success!' })
  }
}


const checkoutCart = async (req, res) => {
  const userId = req.jwtDecoded.id
  const { cartId ,shippingInfo, note, paymentMethod } = req.body
  const result = await cardService.checkoutCart(userId,  cartId ,shippingInfo, note, paymentMethod)
  res.status(StatusCodes.OK).json(result)
}

export const cardController = {
  getCard,
  getDetailCart,
  addToCart,
  updateCard,
  deleteCard,
  checkoutCart
}
