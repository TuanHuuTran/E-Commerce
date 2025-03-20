import { orderHistoryModel } from "~/models/orderHistoryModel"

const getAllOrderHistories = async (userId) => {
  try {
    const orders = await orderHistoryModel.findOrderHistoryByUserId(userId)
    return {orders}
  } catch (error) {
    throw error
  }
}

export const orderHistoriesService = {
  getAllOrderHistories
}
