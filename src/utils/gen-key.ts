import { PluginId } from '../constants'

export const generateFulFillmentParamsId = (orderId: string) =>
  `${PluginId}:order:params:${orderId}`

export const generateFulFillmentCartParamsId = (
  scope: string,
  orderId: string,
) => `${PluginId}:order:params:cart:${scope}:${orderId}`
