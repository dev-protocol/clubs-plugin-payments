import type { APIRoute } from 'astro'
import {
  whenDefinedAll,
  whenNotError,
  whenNotErrorAll,
} from '@devprotocol/util-ts'
import { verify } from '../utils/account'
import { getOrders } from '../db/cart'
import { headers } from '../fixtures/url/json'

/**
 * Get orders for a specific user
 */
export const getOrdersHandler: ({
  scope,
}: {
  readonly scope: string
}) => APIRoute =
  ({ scope }) =>
  async ({ url }) => {
    const props =
      whenDefinedAll(
        [
          url.searchParams.get('order_id'),
          url.searchParams.get('message'),
          url.searchParams.get('signature'),
        ],
        ([orderId, message, signature]) => ({
          orderId,
          message,
          signature,
        }),
      ) ?? new Error('Missing required fields')

    const eoa = whenNotError(props, ({ signature, message }) =>
      verify({ signature, message }),
    )

    const cart = await whenNotErrorAll([eoa, props], ([_eoa, { orderId }]) =>
      getOrders({
        scope,
        eoa: _eoa,
        orderId,
      }).catch((err) => new Error(err)),
    )

    const result = whenNotError(cart, (_) => _)

    return result instanceof Error
      ? new Response(
          JSON.stringify({
            error: result.message,
          }),
          { status: 400, headers: headers() },
        )
      : new Response(JSON.stringify(result), {
          status: 200,
          headers: headers(),
        })
  }
