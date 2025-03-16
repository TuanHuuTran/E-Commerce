import { StatusCodes } from "http-status-codes"
import { ObjectId } from "mongodb"
import { GET_CLIENT } from "~/config/mongodb"
import { cardModel } from "~/models/cardModel"
import { cartDetailModel } from "~/models/cartDetailModel"
import { productModel } from "~/models/productModel"
import ApiError from "~/utils/ApiError"

const getDetailCart = async (cartId, userId) => {
  try {
  const cart = await cardModel.getDetailCart(cartId, userId)
  return cart
  } catch (error) {throw error}
}

const validateProduct = async (productId, quantity, session) => {
  const product = await productModel.findOneById(productId, {session})
  if ( product ) {
    if (product.stock < quantity) throw new ApiError(StatusCodes.CONFLICT, "Not enough stock!")
  } else {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found!")
  }
  return product
}

const addToCart = async (userId, productId, quantity) => {
  const session = await GET_CLIENT().startSession()
  try {
    session.startTransaction()
    let resultCart 

    // Kiểm tra product trong db
    const existProduct = await validateProduct(productId, quantity, session)

    // Kiểm tra xem đã có cart của user đó chưa
    let cart = await cardModel.findCartByUserId(userId, session)

    if (!cart) {
      // Nếu chưa có cart thì tạo mới cart
      cart = await cardModel.addToCart({
        userId,
        items: [],
        totalPrice: quantity * existProduct.price,
      }, session)
      
      const newCartItem = await cartDetailModel.create({
        cartId: cart.insertedId.toString(),
        productId: productId,
        quantity: quantity,
        totalPrice: quantity * existProduct.price // giá của sản phẩm product
      }, session)

      // cập nhật Id vào trong trường items của cart
      resultCart =  await cardModel.updateItems(cart.insertedId, new ObjectId(newCartItem.insertedId),session)
    } else {

      // Nếu có cart kiểm tra xem product đó có trong cart chưa
      const exitsProductInCart = await cartDetailModel.findProductInCartDetail(productId, cart._id, session)
      if(!exitsProductInCart) {

        // Nếu chưa có thì thêm mới vào cart
        const newCartItem = await cartDetailModel.create({
          cartId: cart._id.toString(),
          productId: productId,
          quantity: quantity,
          totalPrice: quantity*existProduct.price // giá của sản phẩm product
        }, session)

        // cập nhật Id vào trong trường items của cart
        await cardModel.updateItems(cart._id, new ObjectId( newCartItem.insertedId),session)
        resultCart = await cardModel.updatePrice(cart._id, quantity * existProduct.price, session)

      } else{

        // Nếu có product trong cart cập nhật số lượng và giá của product 
        const oldQuantity = exitsProductInCart.quantity
        const newQuantity = quantity
        const priceDifference = (newQuantity - oldQuantity) * existProduct.price

        await cartDetailModel.update(
          exitsProductInCart._id,
          { quantity: newQuantity, totalPrice: newQuantity * existProduct.price },
          session
        )

        resultCart =  await cardModel.updatePrice(cart._id, priceDifference, session)
      }
    }
    await session.commitTransaction()
    return resultCart
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export const cardService = {
  getDetailCart,
  addToCart ,
}
