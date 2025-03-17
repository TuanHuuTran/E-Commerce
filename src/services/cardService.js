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
    return await session.withTransaction(async () => {
      let resultCart 

      // Kiểm tra product trong DB
      const existProduct = await validateProduct(productId, quantity, session)

      // Kiểm tra xem user đã có cart chưa
      let cart = await cardModel.findCartByUserId(userId, session)

      if (!cart) {
        if (quantity > 0) {
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
          totalPrice: quantity * existProduct.price
        }, session)

        // Cập nhật items của cart
        resultCart = await cardModel.updateItems(cart.insertedId, new ObjectId(newCartItem.insertedId), session)
        } else {
          return null
        }
      } else {
        // Nếu có cart kiểm tra xem product đó có trong cart chưa
        const existsProductInCart = await cartDetailModel.findProductInCartDetail(productId, cart._id, session)

        if (!existsProductInCart) {
          if(quantity > 0 ) {
          // Nếu chưa có thì thêm mới vào cart
          const newCartItem = await cartDetailModel.create({
            cartId: cart._id.toString(),
            productId: productId,
            quantity: quantity,
            totalPrice: quantity * existProduct.price
          }, session)

          await cardModel.updateItems(cart._id, new ObjectId(newCartItem.insertedId), session)
          resultCart = await cardModel.updatePrice(cart._id, quantity * existProduct.price, session)
          } else {
            return null
          }
        }  else {
          if(quantity === 0) {
            if (cart.items.length === 1) {
            await cartDetailModel.deleteCartDetail(existsProductInCart._id, session)
            // Xóa productId khỏi mảng items của cart
            await cardModel.deleteCart(cart._id, session)
            return 'cart not exits!'
           // Nếu cart không còn sản phẩm nào thì xóa luôn cart
            } else {
              // Xóa cartDetail nếu quantity = 0
              await cartDetailModel.deleteCartDetail(existsProductInCart._id, session)

              // Xóa productId khỏi mảng items của cart
              await cardModel.removeItem(cart._id, existsProductInCart._id, session)
              // Nếu cart không còn sản phẩm nào thì xóa luôn cart

              resultCart = await cardModel.updatePrice(cart._id, -existsProductInCart.totalPrice, session)
            }
          }  else {
            // Nếu có product trong cart, cập nhật số lượng và giá
            const oldQuantity = existsProductInCart.quantity
            const newQuantity = quantity
            const priceDifference = (newQuantity - oldQuantity) * existProduct.price

            await cartDetailModel.update(
              existsProductInCart._id,
              { quantity: newQuantity, totalPrice: newQuantity * existProduct.price },
              session
            )

            resultCart = await cardModel.updatePrice(cart._id, priceDifference, session)
          }
        }
      }
      return resultCart
    })
  } catch (error) {
    console.error("Transaction failed:", error)
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to add to cart")}
    finally {
    session.endSession()
  }
}


const checkoutCart = () => {
  // Kiểm tra cart có tồn tại hay không
  // Kiểm tra xem sản phẩm trong cart có còn đủ số lượng hay không
  // Tạo đơn hàng
  // Cập nhật số lượng product trong kho
  // Xóa giỏ hàng 
}


export const cardService = {
  getDetailCart,
  addToCart ,
  checkoutCart
}
