import type { APIRoute } from 'astro'
import { whenDefinedAll, whenNotError } from '@devprotocol/util-ts'
import { verify } from '../utils/account'
import { getCart } from '../db/cart'

/**
 * Get the cart for the given scope.
 */
export const getCartHandler: ({ scope }: { scope: string }) => APIRoute =
  ({ scope }) =>
  async ({ url }) => {
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

    const result = await whenNotError(eoa, (_eoa) =>
      getCart({ scope, eoa: _eoa }).catch((err) => new Error(err)),
    )

    return result instanceof Error
      ? new Response(
          JSON.stringify({
            error: result.message,
          }),
          { status: 400 },
        )
      : new Response(JSON.stringify(result), { status: 200 })
  }
