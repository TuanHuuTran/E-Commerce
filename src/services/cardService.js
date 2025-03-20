import { StatusCodes } from "http-status-codes"
import { ObjectId } from "mongodb"
import { env } from "~/config/environment"
import { GET_CLIENT } from "~/config/mongodb"
import { cardModel } from "~/models/cardModel"
import { cartDetailModel } from "~/models/cartDetailModel"
import { orderDetailModel } from "~/models/orderDetailModel"
import { orderHistoryModel } from "~/models/orderHistoryModel"
import { orderModel } from "~/models/orderModel"
import { productModel } from "~/models/productModel"
import { userAddressModel } from "~/models/userAddressModel"
import { userModel } from "~/models/userModel"
import { SendEmailProvider } from "~/providers/SendEmailProvider"
import ApiError from "~/utils/ApiError"
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "~/utils/constants"

const stripe = require('stripe')(env.STRIPE_SECRET_KEY)

const getDetailCart = async (cartId, userId) => {
  try {
  const cart = await cardModel.getDetailCart(cartId, userId)
  return cart
  } catch (error) {throw error}
}

const validateProduct = async (productId, quantity, session) => {
  const product = await productModel.findOneById(productId, session)
  if ( product ) {
    if (product.stock < quantity){
      throw new ApiError(StatusCodes.CONFLICT, "Not enough stock!")
    } 
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


const checkoutCart = async (userId, cartId, shippingInfo, note, paymentMethod) => {
  const session = await GET_CLIENT().startSession()
  try {
    return await session.withTransaction(async () => {
      // Kiểm tra cart có tồn tại hay không
      const cart = await cardModel.findOneById(cartId, userId)
      if (!cart || cart.items.length === 0) throw new ApiError(StatusCodes.NOT_FOUND, 'Cart is empty')

      // Kiểm tra xem sản phẩm trong cart có còn đủ số lượng hay không
      // Lấy thông tin chi tiết của từng item trong cart
      const cartDetails = []
      for (const cartItemId of cart.items) {
        // Lấy thông tin chi tiết của cartDetail
        const cartDetail = await cartDetailModel.findOneById(cartItemId, session)
        if (!cartDetail) {
          throw new ApiError(StatusCodes.NOT_FOUND, 'Cart item not found')
        }
        // Lấy thông tin sản phẩm từ productId trong cartDetail
        const product = await productModel.findOneById(cartDetail.productId, session)
        if (!product) {
          throw new ApiError(StatusCodes.NOT_FOUND, `Product not found`)
        }
        // Kiểm tra số lượng tồn kho
        if (product.stock < cartDetail.quantity) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Sản phẩm ${product.name} không đủ số lượng. Hiện chỉ còn ${product.stock} sản phẩm.`
          )
        }
        cartDetails.push({ cartDetail, product })
      }

      // Kiểm tra và áp dụng mã giảm giá nếu được cung cấp
      let invoice
      let stripeSessionData

      // Tạo userAddress 
      const user = await userModel.findOneById(userId)
      if (!user.address) {
        const createAddressUser = await userAddressModel.createAddress(userId, shippingInfo, session)
        // Push vào user
        await userModel.pushUserAddressId(userId, new ObjectId(createAddressUser.insertedId), session)
      } else {
        await userAddressModel.updateAddress(user.address, shippingInfo, session)
      }

      if (paymentMethod === PAYMENT_METHOD.COD) {
        // Xử lý thanh toán COD (giữ nguyên code hiện tại)
        // Tạo order
        const orderData = {
          userId: userId,
          items: [],
          totalAmount: cart.totalPrice,
          paymentMethod: PAYMENT_METHOD.COD,
          paymentStatus: PAYMENT_STATUS.UNPAID,
          status: ORDER_STATUS.PENDING,
          note: note
        }
        const newOrder = await orderModel.createOder(orderData, session)

        // Tạo các chi tiết đơn hàng và thu thập ID
        const orderDetailsIds = []
        for (const { cartDetail, product } of cartDetails) {
          // Tạo orderDetail
          const orderDetailData = {
            orderId: newOrder.insertedId.toString(),
            productId: product._id.toString(),
            productName: product.name,
            productImage: product.thumbnail || '',
            quantity: cartDetail.quantity,
            price: product.price,
            totalPrice: cartDetail.totalPrice,
            createdAt: new Date()
          }
          
          const orderDetail = await orderDetailModel.createOrderDetail(orderDetailData, session)
          orderDetailsIds.push(orderDetail.insertedId)
          
          // Cập nhật stock và buyturn cùng lúc
          const updateResult = await productModel.updateStockAndBuyturn(product._id, cartDetail.quantity, session)
          // Kiểm tra kết quả cập nhật
          if (!updateResult || updateResult.modifiedCount === 0) {
            throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Không thể cập nhật tồn kho cho sản phẩm ${product.name}`)
          }
        }

        // Cập nhật đơn hàng với các ID của orderDetail
        await orderModel.updateOrder(
          newOrder.insertedId,
          { items: orderDetailsIds },
          session
        )
        await cardModel.deleteCart(cart._id, session)
        // Xóa từng chi tiết giỏ hàng (cartDetail)
        await cartDetailModel.deleteManyByCartId(cart._id, session)

        // Thêm đoạn code tạo lịch sử đơn hàng
        const orderHistoryData = {
          userId: userId,
          orderId: newOrder.insertedId.toString(),
          totalAmount: cart.totalPrice,
          finalAmount: cart.totalPrice, // Hoặc tính toán final amount nếu có giảm giá
          paymentMethod: PAYMENT_METHOD.COD,
          paymentStatus: PAYMENT_STATUS.UNPAID,
          orderStatus: ORDER_STATUS.PENDING,
          createdAt: new Date()
        }
        await orderHistoryModel.createOrderHistory(orderHistoryData, session)

        const result = await orderModel.getDetailOrder(userId, newOrder.insertedId.toString(), session)
        // Get user email
        const user = await userModel.findOneById(userId, session);
        if (user && user.email) {
          // Send email directly using the data we already have
          await SendEmailProvider.sendOrderConfirmationEmail(
            user.email, 
            {
              _id: newOrder.insertedId.toString(),
              items: result.orderItems, // Use the order details we already fetched
              totalAmount: result.totalAmount,
              paymentMethod: result.paymentMethod,
              status: ORDER_STATUS.PROCESSING
            }
          );
        }

                
        invoice = {
          ...result,
          userInfo: { ...result.userInfo[0] },
          userAddress: { ...result.userAddress[0] }
        }
      } 
      else if (paymentMethod === PAYMENT_METHOD.STRIPE) {
        // Xử lý thanh toán Stripe
        // Tạo order với trạng thái chờ thanh toán
        const orderData = {
          userId: userId,
          items: [],
          totalAmount: cart.totalPrice,
          paymentMethod: PAYMENT_METHOD.STRIPE,
          paymentStatus: PAYMENT_STATUS.PENDING,
          status: ORDER_STATUS.PENDING,
          note: note
        }
        const newOrder = await orderModel.createOder(orderData, session)
        
        // Tạo các chi tiết đơn hàng và thu thập ID
        const orderDetailsIds = []
        const lineItems = []
        
        for (const { cartDetail, product } of cartDetails) {
          // Tạo orderDetail
          const orderDetailData = {
            orderId: newOrder.insertedId.toString(),
            productId: product._id.toString(),
            productName: product.name,
            productImage: product.thumbnail || '',
            quantity: cartDetail.quantity,
            price: product.price,
            totalPrice: cartDetail.totalPrice,
            createdAt: new Date()
          }
          
          const orderDetail = await orderDetailModel.createOrderDetail(orderDetailData, session)
          orderDetailsIds.push(orderDetail.insertedId)
          
          // Tạo line item cho Stripe
          lineItems.push({
            price_data: {
              currency: 'usd', // Thay đổi theo tiền tệ của bạn
              product_data: {
                name: product.name,
                description: product.description || '',
                images: [product.thumbnail] // Thêm ảnh sản phẩm nếu có
              },
              unit_amount: Math.round((product.price/25000) * 100), // Stripe tính theo cents
            },
            quantity: cartDetail.quantity,
          })
        }
        
        // Cập nhật đơn hàng với các ID của orderDetail
        await orderModel.updateOrder(
          newOrder.insertedId,
          { items: orderDetailsIds },
          session
        )
        
        // Lấy thông tin người dùng để tạo Stripe session
        const userInfo = await userModel.findOneById(userId)
        // const userAddress = await userAddressModel.findOneById(user.address)
        
        // Tạo Stripe Checkout Session
        const stripeSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: `${env.FRONTEND_URL}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${newOrder.insertedId.toString()}`,
          cancel_url: `${env.FRONTEND_URL}/order/cancel?order_id=${newOrder.insertedId.toString()}`,
          metadata: {
            order_id: newOrder.insertedId.toString(),
            user_id: userId.toString()
          },
          customer_email: userInfo.email || null,
          shipping_address_collection: {
            allowed_countries: ['US', 'VN'], // Thêm các quốc gia bạn muốn hỗ trợ
          }
        })
        
        // Lưu thông tin Stripe session vào order
        await orderModel.updateOrder(
          newOrder.insertedId,
          { stripeSessionId: stripeSession.id },
          session
        )
        
        // Không xóa giỏ hàng và cập nhật số lượng sản phẩm cho đến khi thanh toán thành công
        // Việc này sẽ được thực hiện trong webhook handler
        
        const result = await orderModel.getDetailOrder(userId, newOrder.insertedId.toString(), session)
        invoice = {
          ...result,
          userInfo: { ...result.userInfo[0] },
          userAddress: { ...result.userAddress[0] },
          stripeSessionId: stripeSession.id,
          stripeSessionUrl: stripeSession.url
        }
        
        stripeSessionData = {
          sessionId: stripeSession.id,
          url: stripeSession.url
        }
      }
      
      // Trả về thông tin đơn hàng và thông tin thanh toán Stripe (nếu có)
      return {
        invoice,
        stripeSessionData
      }
    })
  } catch (error) {
    console.error("Transaction failed:", error)
    throw error // Ném lại lỗi để caller biết
  } finally {
    await session.endSession() // Đảm bảo session được kết thúc
  }
}

export const cardService = {
  getDetailCart,
  addToCart ,
  checkoutCart
}
