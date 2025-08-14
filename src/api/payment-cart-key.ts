import type { APIRoute } from 'astro'
import { whenNotError, whenNotErrorAll } from '@devprotocol/util-ts'
import {
  bytes32Hex,
  type ClubsConfiguration,
  ClubsOffering,
} from '@devprotocol/clubs-core'
import { composePassportItem } from '../utils/compose-passport-item'
import { callNRes, PaymentKeyOptions, PaymentTypes } from './payment-key'
import { Redis } from '@devprotocol/clubs-core/redis'
import { verify } from '../utils/account'
import { getCart } from '../db/cart'
import { generateFulFillmentCartParamsId } from '../utils/gen-key'
import { randomHash } from '../utils/hash'

/**
 * This endpoint is expected to be called with the following parameters:
 * ?message={MESSAGE}&signature={SIGNATURE}&email.customer_name={USER_NAME}&email.customer_email_address={USER_EMAIL_ADDRESS}&dummy={OPTIONAL_BOOLEAN}
 */
export const getPaymentKeyByCart: ({
  config,
  scope,
  orderPrefix,
  offerings,
}: {
  config: ClubsConfiguration
  scope: string
  orderPrefix: string
  offerings: ClubsOffering[]
}) => APIRoute =
  ({ config, scope, orderPrefix, offerings }) =>
  async ({ url }) => {
    /**
     * Get request parameters.
     */
    const message =
      url.searchParams.get('message') ?? new Error('Missing message')
    const signature =
      url.searchParams.get('signature') ?? new Error('Missing signature')
    const dummy = url.searchParams.get('dummy') === 'true'
    const customer_name = url.searchParams.get('email.customer_name')
    const customer_email_address = url.searchParams.get(
      'email.customer_email_address',
    )

    const client = await Redis.client()

    const eoa = whenNotErrorAll([message, signature], ([msg, sig]) =>
      verify({ signature: sig, message: msg }),
    )

    const cart = await whenNotError(eoa, (_eoa) =>
      getCart({ scope, eoa: _eoa }),
    )

    const offeringItems = await whenNotError(cart, async (_cart) => {
      const data = await Promise.all(
        _cart.data.map(async (inCart) => {
          const offering = offerings.find(
            (it) => bytes32Hex(it.payload) === inCart.payload,
          )
          const item = await composePassportItem(inCart.payload, {
            config,
            client,
          })
          return offering && item ? { inCart, item, offering } : undefined
        }),
      )
      return data.every((x) => x !== undefined)
        ? data
        : new Error('Some offerings are not found')
    })

    const shortEoa = whenNotError(eoa, (_eoa) => _eoa.slice(0, 8))

    const order_id = whenNotErrorAll(
      [shortEoa],
      ([_shortEoa]) => `ORDER-${orderPrefix}-${_shortEoa}-${randomHash(3)}`,
    )
    const gross_amount = whenNotError(offeringItems, (_items) =>
      _items.reduce(
        (acc, curr) => acc + BigInt(curr.item.price.yen * curr.inCart.quantity),
        BigInt(0),
      ),
    )
    const payment_key_expiry_duration = 1440 // = 1440 minutes
    const push_destination = new URL(
      `${config.url}/api/devprotocol:clubs:plugin:clubs-payments/fulfillment/cart`,
    ).toString()

    const paramsSaved = await whenNotErrorAll(
      [client, eoa, order_id],
      ([db, _eoa, _order_id]) =>
        db.set(generateFulFillmentCartParamsId(scope, _order_id), _eoa),
    )

    const push_url = whenNotError(paramsSaved, () => push_destination)

    const enabled_payment_types = [PaymentTypes.Card]
    const card = {
      '3ds_version': 2,
    }
    const email =
      customer_name && customer_email_address
        ? {
            customer_name,
            customer_email_address,
          }
        : undefined
    const items = whenNotError(offeringItems, (_offeringItems) =>
      _offeringItems.map((offer) => ({
        id: `ITEM-${bytes32Hex(offer.offering.payload).replace(
          /0x(.{4}).*(.{4}$)/,
          '$1-$2',
        )}`,
        name: offer.item.source.name,
        price: offer.item.price.yen,
        quantity: offer.inCart.quantity,
      })),
    )

    const options = whenNotErrorAll(
      [gross_amount, push_url, items],
      ([_gross_amount, _push_url, _items]) =>
        ({
          dummy,
          order_id,
          gross_amount: Number(_gross_amount),
          payment_key_expiry_duration,
          push_url: _push_url,
          enabled_payment_types,
          card,
          email,
          items: _items,
        }) as PaymentKeyOptions,
    )

    console.log({ options })

    return callNRes(options)
  }
