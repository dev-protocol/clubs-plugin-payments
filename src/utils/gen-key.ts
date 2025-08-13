import { PluginId } from '../constants'

export const generateFulFillmentParamsId = (orderId: string) =>
  `${PluginId}:order:params:${orderId}`
