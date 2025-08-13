import { Redis } from '@devprotocol/clubs-core/redis'
import { Index } from './prefix'
import { CARTITEM_SCHEMA } from './schema'
import { CartItem } from '../types'
import { generateCartItemKey } from './redis'
import { whenNotError, whenNotErrorAll } from '@devprotocol/util-ts'
import { withCheckingIndex } from './reindex'

export const getCart = async ({
  scope,
  eoa,
  from = 0,
  size = 900,
}: {
  scope: string
  eoa: string
  from?: number
  size?: number | '+inf'
}) => {
  const client = await withCheckingIndex(Redis.client)
  const search = await whenNotError(client, (redis) =>
    redis.ft.search(
      Index.Cart,
      `@${CARTITEM_SCHEMA['$.scope'].AS}:{${scope}} @{${CARTITEM_SCHEMA['$.eoa'].AS}:{${eoa}}}`,
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
}: {
  scope: string
  eoa: string
  payload: string
  quantity: number
}) => {
  const client = await withCheckingIndex(Redis.client)
  const data: CartItem = {
    scope,
    eoa,
    payload,
    quantity,
  }
  const key = generateCartItemKey(scope, eoa, payload)
  const result = await whenNotError(client, (redis) =>
    quantity > 0
      ? redis.json.set(key, '$', data).catch((err: Error) => err)
      : redis.json.del(key).catch((err: Error) => err),
  )
  return whenNotErrorAll([data, result], ([_data]) => _data)
}
