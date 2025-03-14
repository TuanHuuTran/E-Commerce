import { StatusCodes } from "http-status-codes"
import { productService } from "~/services/productService"


const getAllProduct = async (req, res) => {
  const { page, itemsPerPage, search, sort } = req.query
  const products = await productService.getAllProduct(page, itemsPerPage, search, sort)
  res.status(StatusCodes.OK).json(products)
}

const getDetailProduct = async (req, res) => {
  const productId = req.params
  const product = await productService.getDetailProduct(productId)
  res.status(StatusCodes.OK).json(product)

}

const createProduct = async (req, res) => {
  const product = await productService.createProduct(req.body)
  res.status(StatusCodes.CREATED).json(product)
}

const updateProduct = async (req, res) => {
  const productId = req.params.id
  const images = req.files || []
  const arrayBuffer = images.map(image => image.buffer)
  const updateProduct = await productService.updateProduct(productId, req.body,arrayBuffer)
  res.status(StatusCodes.OK).json(updateProduct)
}

const deleteProduct = async (req, res) => {
  const productId = req.params.id
  const deleteProduct = await productService.deleteProduct(productId)
  if (deleteProduct.deletedCount === 0 ) {
    res.status(StatusCodes.OK).json({message: 'Product not found' })
  } else {
    res.status(StatusCodes.OK).json({message: 'Deleted product success!' })
  }
}


export const productController = {
  getAllProduct,
  getDetailProduct,
  createProduct,
  updateProduct,
  deleteProduct
}
