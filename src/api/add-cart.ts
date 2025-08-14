import type { APIRoute } from 'astro'
import {
  ErrorOr,
  whenDefinedAll,
  whenNotError,
  whenNotErrorAll,
} from '@devprotocol/util-ts'
import { bytes32Hex, ClubsOffering } from '@devprotocol/clubs-core'
import { verify } from '../utils/account'
import { CartItem } from '../types'
import { getCartItem, getLatestSession, updateCart } from '../db/cart'
import { headers } from '../fixtures/url/json'

/**
 * Update the cart with the given offerings.
 * This endpoint works only with the latest `offerings` options, not the memberships plugin.
 */
export const addCartHandler: ({
  scope,
  offerings,
}: {
  scope: string
  offerings: ClubsOffering[]
}) => APIRoute =
  ({ scope, offerings }) =>
  async ({ request }) => {
    const body = (await request
      .json()
      .catch((err) => new Error(err))) as ErrorOr<
      Partial<{
        payload: string
        quantity: number
        message: string
        signature: string
      }>
    >

    const props = whenNotError(
      body,
      (_body) =>
        whenDefinedAll(
          [
            _body.payload,
            typeof _body.quantity === 'number' ? _body.quantity : undefined,
            _body.message,
            _body.signature,
          ],
          ([payload, quantity, message, signature]) => ({
            payload,
            quantity,
            message,
            signature,
          }),
        ) ?? new Error('Missing required fields'),
    )

    const eoa = whenNotError(props, ({ signature, message }) =>
      verify({ signature, message }),
    )

    const exists = whenNotError(
      props,
      ({ payload }) =>
        offerings.find(
          (offering) => bytes32Hex(offering.payload) === payload,
        ) ?? new Error('Offering not found'),
    )

    const session = await whenNotError(eoa, (user) =>
      getLatestSession({ scope, eoa: user }).catch((err) => new Error(err)),
    )

    const existingItem = await whenNotErrorAll(
      [props, eoa, session],
      ([{ payload }, _eoa, _session]) =>
        getCartItem({ scope, eoa: _eoa, payload, session: _session }),
    )

    const item = whenNotErrorAll(
      [eoa, props, existingItem, session, exists],
      ([_eoa, _props, _existingItem, _session]) =>
        ({
          scope,
          eoa: _eoa,
          payload: _props.payload,
          quantity: _props.quantity + (_existingItem?.quantity ?? 0),
          session: _session,
        }) satisfies CartItem,
    )

    const result = await whenNotError(item, (data) =>
      updateCart(data).catch((err) => new Error(err)),
    )

    return result instanceof Error
      ? new Response(
          JSON.stringify({
            error: result.message,
          }),
          { status: 400, headers: headers() },
        )
      : new Response(JSON.stringify({ data: result }), {
          status: 200,
          headers: headers(),
        })
  }
