import nodemailer from 'nodemailer'
import { env } from '~/config/environment'


const transporter = nodemailer.createTransport({
  service: "gmail", // Dùng Gmail, có thể đổi sang SMTP khác
  auth: {
    user: env.EMAIL_USER, // Email gửi đi
    pass: env.EMAIL_PASS, // Mật khẩu ứng dụng
  },
})

const sendVerificationEmail = async (email, verifyToken) => {
  const verificationLink = `${env.SERVER_URL}/users/verify-account?token=${verifyToken}&email=${email}`

  const mailOptions = {
    from: env.EMAIL_USER,
    to: email,
    subject: "Account Activation",
    html: `
      <h2>Welcome to our platform</h2>
      <p>Click the link below to activate your account:</p>
      <a href="${verificationLink}" target="_blank">Activate Account</a>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log("✅ Email sent successfully!")
  } catch (error) {
    console.error("❌ Error sending email:", error)
  }
}

const sendOrderConfirmationEmail = async (email, orderDetails) => {
  const { _id, items, totalAmount, paymentMethod, status } = orderDetails
  
  // Format currency
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(totalAmount/25000) // Converting to USD as in your Stripe implementation
  
  // Create HTML for order items
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px border-bottom: 1px solid #eee">${item.productName}</td>
      <td style="padding: 10px border-bottom: 1px solid #eee">${item.quantity}</td>
      <td style="padding: 10px border-bottom: 1px solid #eee">$${(item.price/25000).toFixed(2)}</td>
      <td style="padding: 10px border-bottom: 1px solid #eee">$${(item.totalPrice/25000).toFixed(2)}</td>
    </tr>
  `).join('')

  const mailOptions = {
    from: env.EMAIL_USER,
    to: email,
    subject: "Order Confirmation - Thank You For Your Purchase!",
    html: `
      <div style="font-family: Arial, sans-serif max-width: 600px margin: 0 auto padding: 20px border: 1px solid #eee">
        <h2 style="color: #4a4a4a text-align: center">Order Confirmation</h2>
        <p>Dear Customer,</p>
        <p>Thank you for your order! We're pleased to confirm that your order has been received and is being processed.</p>
        
        <div style="background-color: #f8f8f8 padding: 15px margin: 20px 0">
          <h3 style="margin-top: 0 color: #4a4a4a">Order Summary</h3>
          <p><strong>Order ID:</strong> ${_id}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Order Status:</strong> ${status}</p>
          <p><strong>Total Amount:</strong> ${formattedAmount}</p>
        </div>
        
        <h3 style="color: #4a4a4a">Order Items</h3>
        <table style="width: 100% border-collapse: collapse">
          <thead>
            <tr style="background-color: #f8f8f8">
              <th style="padding: 10px text-align: left">Product</th>
              <th style="padding: 10px text-align: left">Quantity</th>
              <th style="padding: 10px text-align: left">Price</th>
              <th style="padding: 10px text-align: left">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 30px">
          <p>If you have any questions about your order, please contact our customer service team.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log("✅ Order confirmation email sent successfully!")
    return true
  } catch (error) {
    console.error("❌ Error sending order confirmation email:", error)
    return false
  }
}

export const SendEmailProvider = {
  sendVerificationEmail,
  sendOrderConfirmationEmail
}
