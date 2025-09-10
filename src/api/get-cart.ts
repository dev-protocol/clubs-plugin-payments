import type { APIRoute } from 'astro'
import { whenDefinedAll, whenNotError } from '@devprotocol/util-ts'
import { verify } from '../utils/account'
import { getCart } from '../db/cart'
import { checkoutPassportItemForPayload } from '@devprotocol/clubs-plugin-passports'
import { Redis } from '@devprotocol/clubs-core/redis'
import { type ClubsConfiguration } from '@devprotocol/clubs-core'
import { headers } from '../fixtures/url/json'
import { APICartResult } from '../types'

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
      getCart({ scope, eoa: _eoa }).catch((err) => new Error(err)),
    )

    const result = await whenNotError(cart, async ({ total, data: _data }) => {
      const data = await Promise.all(
        _data.map(async (item) => {
          const passportItem = await checkoutPassportItemForPayload(
            item.payload,
            { config, client },
          )
          const bundledPassportItems = passportItem?.props.offering.bundle
            ? (
                await Promise.all(
                  Array.from(new Set(passportItem.props.offering.bundle)).map(
                    (payload) =>
                      checkoutPassportItemForPayload(payload, {
                        config,
                        client,
                      }),
                  ),
                )
              ).filter((item) => item !== undefined)
            : []
          return { ...item, passportItem, bundledPassportItems }
        }),
      )
      return {
        total,
        data,
      } satisfies APICartResult
    })

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
