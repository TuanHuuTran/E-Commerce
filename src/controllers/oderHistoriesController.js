import { StatusCodes } from "http-status-codes"
import { orderHistoriesService } from "~/services/orderHistoriesService"

const getAllOrderHistories = async (req, res) => {
  const userId = req.jwtDecoded.id
  const orders = await orderHistoriesService.getAllOrderHistories(userId)
  res.status(StatusCodes.OK).json(orders)
}

export const orderHistoriesController = {
  getAllOrderHistories
}
