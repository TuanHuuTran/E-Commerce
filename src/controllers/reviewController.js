import { StatusCodes } from "http-status-codes"
import { reviewService } from "~/services/reviewService"


const getProductReviews = async (req, res) => {
  const { page, itemsPerPage, search, sort } = req.query
  const products = await reviewService.getProductReviews(page, itemsPerPage, search, sort)
  res.status(StatusCodes.OK).json(products)
}


const createReview = async (req, res) => {
  const userId = req.jwtDecoded.id
  const review = await reviewService.createReview(userId, req.body)
  res.status(StatusCodes.CREATED).json(review)
}

const updateReview = async (req, res) => {
  const reviewId = req.params.id
  const userId = req.jwtDecoded.id
  const images = req.files || []
  const arrayBuffer = images.map(image => image.buffer)
  const updateReview = await reviewService.updateReview(reviewId, userId, req.body,arrayBuffer)
  res.status(StatusCodes.OK).json(updateReview)
}

const deleteReview = async (req, res) => {
  const reviewId = req.params.id
  const userId = req.jwtDecoded.id
  const deleteProduct = await reviewService.deleteReview(reviewId, userId)
  if (deleteProduct.deletedCount === 0 ) {
    res.status(StatusCodes.OK).json({message: 'Product not found' })
  } else {
    res.status(StatusCodes.OK).json({message: 'Deleted product success!' })
  }
}

const toggleLike = async (req, res) => {
  const reviewId = req.params.reviewId
  const userId = req.jwtDecoded.id
  const result = await reviewService.toggleLikeReview(reviewId, userId)
  res.status(StatusCodes.OK).json(result)
}


const getLikedUsers = async (req, res) => {
  const reviewId = req.params.reviewId
  const result = await reviewService.getLikedUsers(reviewId)
  res.status(StatusCodes.OK).json(result)
}


export const reviewController = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleLike,
  getLikedUsers
}
