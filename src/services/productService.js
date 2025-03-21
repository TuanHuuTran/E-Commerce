import { StatusCodes } from "http-status-codes"
import { productModel } from "~/models/productModel"
import { reviewModel } from "~/models/reviewModel"
import { CloudinaryProvider } from "~/providers/CloudinaryProvider"
import ApiError from "~/utils/ApiError"
import { DEFAULT_ITEM_PER_PAGE, DEFAULT_PAGE } from "~/utils/constants"


const getAllProduct = async (page,itemsPerPage,search, sort) => {
  try {
    if (!page) page = DEFAULT_PAGE
    if(!itemsPerPage) itemsPerPage = DEFAULT_ITEM_PER_PAGE

    const products = await productModel.getAllProduct(parseInt(page, 10), parseInt(itemsPerPage, 10),search, sort)
    return products
  } catch (error) {throw error}
}

const getDetailProduct = async (productId) => {
  try {
  const product = await productModel.findOneById(productId)
  return {product}
  } catch (error) {throw error}
}

const createProduct = async (reqData) => {
  try {
    const createData = {
      ...reqData,
      buyturn: 0
    }
    const result = await productModel.createProduct(createData)
    const product = await productModel.findOneById(result.insertedId)
    return {product}
  } catch (error) {throw error}
}

const updateProduct = async (productId, reqData, arrayBuffer) => {
  try {
    const existProduct = await productModel.findOneById(productId)
    if (!existProduct) throw new ApiError(StatusCodes.NOT_FOUND, 'Product Not Found')
    let updateProduct = {}
    if (arrayBuffer?.length) {
      if (arrayBuffer.length > 1) {
        const uploadResults = await Promise.all(
          arrayBuffer.map(buffer => CloudinaryProvider.streamUpload(buffer, 'products'))
        )
        const images = uploadResults.map(i => i.secure_url)
        updateProduct = await productModel.updateProduct(productId, {images: images})
      } else { 
        const uploadResult = await CloudinaryProvider.streamUpload(arrayBuffer[0], 'products')
        updateProduct = await productModel.updateProduct(productId, {thumbnail:  uploadResult.secure_url})
      }
    } else {
      updateProduct = await productModel.updateProduct(productId, reqData)
    }
    return updateProduct
  } catch (error) {throw error}
}

const deleteProduct = async (productId) => {
  try {
    const result = await productModel.deleteProduct(productId)
    return result
  } catch (error) {throw error}
}

const updateImageProduct = async (productId, arrayImage) => {
  try {
    const existProduct = await productModel.findOneById(productId)
      if (!existProduct) throw new ApiError(StatusCodes.NOT_FOUND, "Product not found")
    
        if(arrayImage.length > 0) {
          const result = await Promise.all(
            arrayImage.map(buffer => CloudinaryProvider.streamUpload(buffer, 'products'))
          )
        const arrayImages = result.map(url => url.secure_url)
        const updateProduct = await productModel.updateProduct(productId, { images: arrayImages })
        return updateProduct
      }
  } catch (error) {throw error}

}

const getProductReviews = async (productId, page, itemsPerPage, search, sort) => {
  try {
    if (!page) page = DEFAULT_PAGE
    if(!itemsPerPage) itemsPerPage = DEFAULT_ITEM_PER_PAGE

    const reviews = await reviewModel.getProductReviews(productId, parseInt(page, 10), parseInt(itemsPerPage, 10),search, sort)
    return reviews
  } catch (error) {throw error}
}



export const productService = {
  getAllProduct,
  getDetailProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateImageProduct,
  getProductReviews
}
