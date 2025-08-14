import type { APIRoute } from 'astro'
import { whenDefinedAll, whenNotError } from '@devprotocol/util-ts'
import { verify } from '../utils/account'
import { getCart } from '../db/cart'
import { checkoutPassportItemForPayload } from '@devprotocol/clubs-plugin-passports'
import { Redis } from '@devprotocol/clubs-core/redis'
import type { ClubsConfiguration } from '@devprotocol/clubs-core'

/**
 * Get the cart for the given scope.
 */
export const getCartHandler: ({
  scope,
  config,
}: {
  readonly scope: string
  config: ClubsConfiguration
}) => APIRoute =
  ({ scope, config }) =>
  async ({ url }) => {
    const client = await Redis.client()
    const props =
      whenDefinedAll(
        [url.searchParams.get('message'), url.searchParams.get('signature')],
        ([message, signature]) => ({
          message,
          signature,
        }),
      ) ?? new Error('Missing required fields')

    const eoa = whenNotError(props, ({ signature, message }) =>
      verify({ signature, message }),
    )

    const cart = await whenNotError(eoa, (_eoa) =>
      getCart({ scope, eoa: _eoa, from: '-inf', size: '+inf' }).catch(
        (err) => new Error(err),
      ),
    )

    const result = await whenNotError(cart, async ({ total, data: _data }) => {
      const data = await Promise.all(
        _data.map(async (item) => {
          const passportItem = await checkoutPassportItemForPayload(
            item.payload,
            { config, client },
          )
          return { ...item, passportItem }
        }),
      )
      return {
        total,
        data,
      }
    })

    return result instanceof Error
      ? new Response(
          JSON.stringify({
            error: result.message,
          }),
          { status: 400 },
        )
      : new Response(JSON.stringify(result), { status: 200 })
  }
