import { addresses } from '@devprotocol/dev-kit'
import { setCartItemsCompleted } from '../../db/cart'
import { assetDocument, createAssetDocument } from '../clubsx/assets'
import {
  ErrorOr,
  isNotError,
  whenDefined,
  whenNotError,
  whenNotErrorAll,
} from '@devprotocol/util-ts'
import {
  bytes32Hex,
  ClubsConfiguration,
  ClubsOffering,
} from '@devprotocol/clubs-core'
import type { PassportOffering } from '@devprotocol/clubs-plugin-passports/types'
import { complement, has, repeat } from 'ramda'
import { CartItem } from '../../types'

type BundlePassportOffering = Omit<PassportOffering, 'bundle'> & {
  bundle: NonNullable<PassportOffering['bundle']>
}

const hasBundle = has('bundle')
const hasNoBundle = complement(hasBundle)

const findOffering = <T>(
  payload: ClubsOffering['payload'],
  offerings: ReadonlyArray<ClubsOffering>,
  data: T,
): ErrorOr<ClubsOffering & { __data: T }> => {
  return (
    whenDefined(
      offerings.find(
        (offering) => bytes32Hex(offering.payload) === bytes32Hex(payload),
      ),
      (off) => ({ ...off, __data: data }),
    ) ?? new Error('Offering not found')
  )
}

const duplicateCartItems = (offers: (ClubsOffering & { __data: CartItem })[]) =>
  offers.map((o) => repeat(o, o.__data.quantity)).flat()

export const complete = async ({
  scope,
  eoa,
  order_id,
  config,
}: {
  readonly scope: string
  readonly eoa: string
  readonly order_id: string
  readonly config: ClubsConfiguration
}) => {
  const { propertyAddress, offerings } = config

  const orderCompletionResult = await setCartItemsCompleted({
    scope,
    eoa,
    order_id,
  })
  const singleOfferings = whenNotError(orderCompletionResult, (result) => {
    const resolvedOfferings = result
      .map((res) => findOffering(res.payload, offerings ?? [], res))
      .filter(hasNoBundle)
    return resolvedOfferings.every(isNotError)
      ? duplicateCartItems(resolvedOfferings)
      : new Error('Failed to process single offerings')
  })
  type B = { payload: PassportOffering['payload']; cartItem: CartItem }[]
  const bundledOfferings = whenNotError(orderCompletionResult, (result) => {
    const payloads = result.reduce((acc, cur) => {
      const offering = (offerings ?? []).find(
        (offering): offering is BundlePassportOffering => {
          return (
            hasBundle(offering) &&
            Array.isArray(offering.bundle) &&
            bytes32Hex(offering.payload) === bytes32Hex(cur.payload)
          )
        },
      )
      return [
        ...acc,
        ...((offering?.bundle ?? []).map((p) => ({
          payload: p,
          cartItem: cur,
        })) ?? []),
      ]
    }, [] as B)
    const resolvedOfferings = payloads.map((b) =>
      findOffering(b.payload, offerings ?? [], b.cartItem),
    )

    return resolvedOfferings.every(isNotError)
      ? duplicateCartItems(resolvedOfferings)
      : new Error('Failed to process bundled offerings')
  })
  const offeringsToProcess = whenNotErrorAll(
    [singleOfferings, bundledOfferings],
    ([single, bundled]) => {
      return [...(single ?? []), ...(bundled ?? [])]
    },
  )
  const docs = whenNotError(offeringsToProcess, (result) =>
    result.map((res) =>
      assetDocument({
        type: 'passportItem',
        contract: addresses.polygon.mainnet.sTokens,
        owner: eoa,
        payload: bytes32Hex(res.payload),
        propertyAddress,
      }),
    ),
  )
  const fulfilledAssets = await whenNotError(docs, (result) =>
    Promise.all(result.map((doc) => createAssetDocument({ doc }))),
  )
  console.log('Fulfilled assets:', fulfilledAssets, {
    scope,
    eoa,
    order_id,
    propertyAddress,
    docs,
  })
  const res = whenNotErrorAll([fulfilledAssets, docs], ([result, _docs]) =>
    result.every((ok) => ok === 'OK')
      ? _docs
      : new Error('Failed to mark all items as completed'),
  )

  return res
}
