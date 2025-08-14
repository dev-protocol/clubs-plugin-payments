import { Redis } from '@devprotocol/clubs-core/redis'
import { Index } from './prefix'
import { CARTITEM_SCHEMA } from './schema'
import { CartItem, CartItemStatus } from '../types'
import { generateCartItemKey } from './redis'
import { isNotError, whenNotError, whenNotErrorAll } from '@devprotocol/util-ts'
import { withCheckingIndex } from './reindex'

export const getCart = async ({
  scope,
  eoa,
  from = 0,
  size = 900,
}: {
  readonly scope: string
  readonly eoa: string
  readonly from?: number | '-inf'
  readonly size?: number | '+inf'
}) => {
  const client = await withCheckingIndex(Redis.client)
  const search = await whenNotError(client, (redis) =>
    redis.ft.search(
      Index.Cart,
      `@${CARTITEM_SCHEMA['$.scope'].AS}:{${scope}} @{${CARTITEM_SCHEMA['$.eoa'].AS}:{${eoa}}} -@{${CARTITEM_SCHEMA['$.status'].AS}:{${CartItemStatus.Completed}}}`,
      {
        LIMIT: { from, size },
      },
    ),
  )
  const res = whenNotError(search, (res) => ({
    total: res.total,
    data: res.documents.map((doc) => doc.value as unknown as CartItem),
  }))
  return res
}

export const updateCart = async ({
  scope,
  eoa,
  payload,
  quantity,
  status,
  order_id,
  ordered_at,
}: {
  readonly scope: string
  readonly eoa: string
  readonly payload: string
  readonly quantity: number
  readonly status?: CartItemStatus
  readonly order_id?: string
  readonly ordered_at?: number
}) => {
  const client = await withCheckingIndex(Redis.client)
  const data: CartItem = {
    scope,
    eoa,
    payload,
    quantity,
    status,
    order_id,
    ordered_at,
  }
  const key = generateCartItemKey(scope, eoa, payload)
  const result = await whenNotError(client, (redis) =>
    quantity > 0
      ? redis.json.set(key, '$', data).catch((err: Error) => err)
      : redis.json.del(key).catch((err: Error) => err),
  )
  return whenNotErrorAll([data, result], ([_data]) => _data)
}

export const setCartItemsCompleted = async ({
  scope,
  eoa,
  order_id,
}: {
  readonly scope: string
  readonly eoa: string
  readonly order_id: string
}) => {
  const all = await getCart({ scope, eoa })
  const marked = await whenNotError(all, ({ data }) =>
    Promise.all(
      data.map((item) =>
        updateCart({
          ...item,
          status: CartItemStatus.Completed,
          order_id,
          ordered_at: Date.now(),
        }),
      ),
    ),
  )
  const res = whenNotError(marked, (marked) =>
    marked.every(isNotError)
      ? marked
      : new Error('Failed to mark all items as completed'),
  )

  return res
}
