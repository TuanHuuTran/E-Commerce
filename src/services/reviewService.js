import { StatusCodes } from "http-status-codes"
import { productModel } from "~/models/productModel"
import { reviewLikeModel } from "~/models/reviewLikeModel"
import { reviewModel } from "~/models/reviewModel"
import ApiError from "~/utils/ApiError"

const createReview = async (userId, reqData) => {
  try {

    const existingReview = await reviewModel.findReviewByUserAndProduct(userId, reqData.productId)
    if(existingReview) throw new ApiError(StatusCodes.CONFLICT, 'You have rated this product before!')

    const product = await productModel.findOneById(reqData.productId)
    if (!product) throw new ApiError(StatusCodes.NOT_FOUND, 'Product does not exist!')

    const createData = {
      userId: userId,
      ...reqData
    }
    const result = await reviewModel.createReview(createData)

    await reviewModel.updateProductRating(reqData.productId)
    const review = await reviewModel.findOneById(result.insertedId)
    return {review}
  } catch (error) {throw error}
}

const updateReview = async (reviewId, userId, reqData, arrayBuffer) => {
  try {

    // Kiểm tra review có tồn tại không
    const existingReview = await reviewModel.findOneById(reviewId)
    if (!existingReview) throw new ApiError(StatusCodes.NOT_FOUND, 'Review Not Found!')
    
    // Kiểm tra người dùng có quyền cập nhật review này không
    if (existingReview.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You can only update your own reviews')
    }
    
    // Lấy productId từ review hiện tại
    const productId = existingReview.productId
    
    // Kiểm tra sản phẩm có tồn tại không
    const existProduct = await productModel.findOneById(productId)
    if (!existProduct) throw new ApiError(StatusCodes.NOT_FOUND, 'Product Not Found')

    let updateProduct = {}
    if (arrayBuffer?.length) {
      if (arrayBuffer.length > 1) {
        const uploadResults = await Promise.all(
          arrayBuffer.map(buffer => CloudinaryProvider.streamUpload(buffer, 'products'))
        )
        const images = uploadResults.map(i => i.secure_url)
        updateProduct = await reviewModel.updateProduct(productId, {images: images})
      } else { 
        const uploadResult = await CloudinaryProvider.streamUpload(arrayBuffer[0], 'products')
        updateProduct = await reviewModel.updateProduct(productId, {thumbnail:  uploadResult.secure_url})
      }
    } else {
      updateProduct = await reviewModel.updateReview(reviewId, {
        ...reqData,
        updatedAt: Date.now()
      })

       // Cập nhật rating trung bình của sản phẩm nếu rating thay đổi
       if (reqData.rating) {
        await reviewModel.updateProductRating(productId.toString())
      }
    }
    return updateProduct
  } catch (error) {throw error}
}

const deleteReview = async (reviewId, userId) => {
  try {
    // Kiểm tra review có tồn tại không
    const existingReview = await reviewModel.findOneById(reviewId)
    if (!existingReview) throw new ApiError(StatusCodes.NOT_FOUND, 'Review Not Found!')
    
    // Kiểm tra người dùng có quyền xóa review này không
    if (existingReview.userId.toString() !== userId.toString()) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You can only delete your own reviews')
    }
    
    // Lấy productId từ review hiện tại để cập nhật rating sau này
    const productId = existingReview.productId
    
    // Xóa mềm (soft delete) - Khuyên dùng cách này
    const deleteResult = await reviewModel.updateReview(reviewId, {
      isDeleted: true,
      deletedAt: Date.now()
    })
    
    // Hoặc xóa cứng (hard delete)
    // const deleteResult = await reviewModel.deleteReview(reviewId)
    
    // Cập nhật lại rating trung bình cho sản phẩm sau khi xóa review
    await reviewModel.updateProductRating(productId.toString())

    return 'Deleted review success!'
  } catch (error) {throw error}
}


const toggleLikeReview = async (reviewId, userId) => {
  try {
  // Kiểm tra xem review có tồn tại không
    const existingReview = await reviewModel.findOneById(reviewId)
    if (!existingReview) throw new ApiError(StatusCodes.NOT_FOUND, 'Review Not Found!')
  // Kiểm tra xem người dùng đã like review này chưa
    const existingLike = await reviewLikeModel.findOneById(reviewId, userId)

    if (existingLike) {
      // Nếu đã like rồi, thì unlike (xóa like)
      await reviewLikeModel.deleteLikeReview(existingLike._id)
      // Giảm số lượng like của review
      const updatedReview = await reviewModel.updateLikeReview(existingReview._id, -1)
      return { 
        liked: true, 
        likes: updatedReview.likes,
        review: updatedReview
      }
    } else{
      // Nếu chưa like, thêm like mới
     await reviewLikeModel.createLikeReview({reviewId, userId})
     // Tăng số lượng like của review
      const updatedReview = await reviewModel.updateLikeReview(existingReview._id, 1)
      return { 
        liked: true, 
        likes: updatedReview.likes,
        review: updatedReview
      }
    }
  } catch (error) {throw error} }

const getLikedUsers = async (reviewId) => {
  try {
    const result = await reviewLikeModel.getUsersWhoLikedReview(reviewId)
    return {result}
  } catch (error) {throw error}}



export const reviewService = {
  createReview,
  updateReview,
  deleteReview,
  toggleLikeReview,
  getLikedUsers
}
