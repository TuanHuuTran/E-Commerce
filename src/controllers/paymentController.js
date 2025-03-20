import Stripe from 'stripe'
const stripe = new Stripe(env.STRIPE_SECRET_KEY)

import { env } from "~/config/environment"
import { GET_CLIENT } from "~/config/mongodb"
import { cardModel } from "~/models/cardModel"
import { cartDetailModel } from "~/models/cartDetailModel"
import { orderDetailModel } from "~/models/orderDetailModel"
import { orderHistoryModel } from '~/models/orderHistoryModel'
import { orderModel } from "~/models/orderModel"
import { productModel } from '~/models/productModel'
import { userModel } from '~/models/userModel'
import { SendEmailProvider } from '~/providers/SendEmailProvider'
import { ORDER_STATUS, PAYMENT_STATUS } from "~/utils/constants"

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    )
    console.log('Signature verified successfully')
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  console.log(`Processing event: ${event.type} [${event.id}]`)

  // Xử lý các sự kiện Stripe
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object

      // Lấy ID đơn hàng từ metadata
      const orderId = session.metadata.order_id
      const userId = session.metadata.user_id
      
      if (!orderId || !userId) {
        console.error('Missing order_id or user_id in metadata')
        return res.status(200).send()
      }
      
      try {
        // Bắt đầu session MongoDB
        const dbSession = await GET_CLIENT().startSession()
        
        await dbSession.withTransaction(async () => {
          // Cập nhật trạng thái đơn hàng
          await orderModel.updateOrder(
            orderId,
            { 
              paymentStatus: PAYMENT_STATUS.PAID,
              status: ORDER_STATUS.PROCESSING,
              stripePaymentId: session.payment_intent
            },
            dbSession
          )
          
          // Lấy thông tin đơn hàng
          const order = await orderModel.findOneById(orderId, userId, dbSession)

          // Lấy thông tin chi tiết đơn hàng
          const orderDetails = await Promise.all(
            order.items.map(itemId => {
              return orderDetailModel.findByOrderId(itemId, dbSession)
            })
          )
          
          // Cập nhật số lượng sản phẩm
          for (const orderDetail of orderDetails[0]) {
            await productModel.updateStockAndBuyturn(
              orderDetail.productId,
              orderDetail.quantity,
              dbSession
            )
          }
          
          const cart = await cardModel.findCartByUserId(order.userId)
          
          // Xóa giỏ hàng
          if (cart && cart._id) {
            await cardModel.deleteCart(cart._id, dbSession)
            await cartDetailModel.deleteManyByCartId(cart._id, dbSession)
          } else {
            console.log('No cart to delete')
          }

          // Thêm code để lưu lịch sử đơn hàng
          const orderHistoryData = {
            userId: order.userId.toString(),
            orderId: order._id.toString(),
            totalAmount: order.totalAmount,
            finalAmount: order.finalAmount,
            paymentMethod: order.paymentMethod,
            paymentStatus: PAYMENT_STATUS.PAID,
            orderStatus: ORDER_STATUS.PROCESSING,
            stripeSessionId: session.id,
            createdAt: new Date()
          }
          await orderHistoryModel.createOrderHistory(orderHistoryData, dbSession)
          console.log('Order history created successfully')

           // NEW CODE: Send confirmation email
          // Get user email
          const user = await userModel.findOneById(order.userId, dbSession)
          if (user && user.email) {
            // Send email
            // Flatten the orderDetails array if needed
            // If orderDetails is an array of arrays, we need to flatten it
            const flattenedOrderDetails = orderDetails.flat();
            await SendEmailProvider.sendOrderConfirmationEmail(
              user.email, 
              {
                _id: order._id.toString(),
                items: flattenedOrderDetails, // Use the order details we already fetched
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                status: ORDER_STATUS.PROCESSING
              }
            )
          }
          console.log('Transaction completed successfully')
        })
        
        await dbSession.endSession()
      } catch (error) {
        console.error('Error processing checkout completion:', error)
        console.error('Error stack:', error.stack)
        // Không trả về lỗi để Stripe không gửi lại webhook
      }
      break
    }
    
    case 'checkout.session.expired': {
      const session = event.data.object
      const orderId = session.metadata.order_id
      try {
        // Cập nhật trạng thái đơn hàng thành hết hạn
        await orderModel.updateOrder(
          orderId,
          { 
            paymentStatus: PAYMENT_STATUS.EXPIRED,
            status: ORDER_STATUS.CANCELLED
          }
        )
      } catch (error) {
        console.error('Error processing checkout expiration:', error)
        console.error('Error stack:', error.stack)
      }
      
      break
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  console.log(' Webhook handling completed')
  // Trả về 200 để xác nhận với Stripe rằng webhook đã được xử lý
  res.status(200).send()
}
