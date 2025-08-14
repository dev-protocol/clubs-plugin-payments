import { escapeTag, Redis } from '@devprotocol/clubs-core/redis'
import { Index } from './prefix'
import { CARTITEM_SCHEMA } from './schema'
import { CartItem, CartItemStatus } from '../types'
import { generateCartItemKey } from './redis'
import {
  isNotError,
  whenDefined,
  whenNotError,
  whenNotErrorAll,
} from '@devprotocol/util-ts'
import { withCheckingIndex } from './reindex'
import { randomHash } from '../utils/hash'

export const getCart = async ({
  scope,
  eoa,
  status = 'nil',
  from = 0,
  size = 900,
}: {
  readonly scope: string
  readonly eoa: string
  readonly status?: CartItemStatus | 'nil'
  readonly from?: number
  readonly size?: number
}) => {
  const client = await withCheckingIndex(Redis.client)
  const search = await whenNotError(client, (redis) =>
    redis.ft.search(
      Index.Cart,
      `@${CARTITEM_SCHEMA['$.scope'].AS}:{${scope}} @${CARTITEM_SCHEMA['$.eoa'].AS}:{${eoa}}` +
        ' ' +
        (status === 'nil'
          ? `-@${CARTITEM_SCHEMA['$.status'].AS}:{${CartItemStatus.Completed}}`
          : `@${CARTITEM_SCHEMA['$.status'].AS}:{${status}}`),
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

export const getLatestSession = async ({
  scope,
  eoa,
}: {
  readonly scope: string
  readonly eoa: string
}) => {
  const search = await getCart({ scope, eoa, status: 'nil', from: 0, size: 1 })
  const session = whenNotError(
    search,
    (result) =>
      whenDefined(result.data[0], (latest) => latest.session) ?? randomHash(8),
  )
  return session
}

export const getOrders = async ({
  scope,
  eoa,
  orderId,
  from = 0,
  size = 900,
}: {
  readonly scope: string
  readonly eoa: string
  readonly orderId: string
  readonly from?: number
  readonly size?: number
}) => {
  const client = await withCheckingIndex(Redis.client)
  const search = await whenNotError(client, (redis) =>
    redis.ft.search(
      Index.Cart,
      `@${CARTITEM_SCHEMA['$.scope'].AS}:{${scope}} @${CARTITEM_SCHEMA['$.eoa'].AS}:{${eoa}} @${CARTITEM_SCHEMA['$.order_id'].AS}:{${escapeTag(orderId)}}}`,
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

export const getCartItem = async ({
  scope,
  eoa,
  payload,
  session,
}: {
  readonly scope: string
  readonly eoa: string
  readonly payload: string
  readonly session: string
}) => {
  const client = await withCheckingIndex(Redis.client)
  const key = generateCartItemKey(scope, eoa, session, payload)
  const result = await whenNotError(client, (redis) =>
    redis.json.get(key).catch((err: Error) => err),
  )
  return whenNotError(result, (res) =>
    whenDefined(res, (data) => data as CartItem),
  )
}

export const updateCart = async ({
  scope,
  eoa,
  payload,
  quantity,
  status,
  session,
  order_id,
  ordered_at,
}: {
  readonly scope: string
  readonly eoa: string
  readonly payload: string
  readonly quantity: number
  readonly session: string
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
    session,
    order_id,
    ordered_at,
  }
  const key = generateCartItemKey(scope, eoa, session, payload)
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
