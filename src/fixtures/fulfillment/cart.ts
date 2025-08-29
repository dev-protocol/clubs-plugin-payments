import { addresses } from '@devprotocol/dev-kit'
import { setCartItemsCompleted } from '../../db/cart'
import { assetDocument, createAssetDocument } from '../clubsx/assets'
import {
  ErrorOr,
  isNotError,
  whenNotError,
  whenNotErrorAll,
} from '@devprotocol/util-ts'
import {
  bytes32Hex,
  ClubsConfiguration,
  ClubsOffering,
} from '@devprotocol/clubs-core'
import type { PassportOffering } from '@devprotocol/clubs-plugin-passports/types'
import { complement, has } from 'ramda'

type BundlePassportOffering = Omit<PassportOffering, 'bundle'> & {
  bundle: NonNullable<PassportOffering['bundle']>
}

const hasBundle = has('bundle')
const hasNoBundle = complement(hasBundle)

const findOffering = (
  payload: ClubsOffering['payload'],
  offerings?: ReadonlyArray<ClubsOffering>,
): ErrorOr<ClubsOffering> => {
  return (
    (offerings ?? []).find(
      (offering) => bytes32Hex(offering.payload) === bytes32Hex(payload),
    ) ?? new Error('Offering not found')
  )
}

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
      .map((res) => findOffering(res.payload, offerings))
      .filter(hasNoBundle)
    return resolvedOfferings.every(isNotError)
      ? resolvedOfferings
      : new Error('Failed to process single offerings')
  })
  const bundledOfferings = whenNotError(orderCompletionResult, (result) => {
    const payloads = result.reduce(
      (acc, cur) => {
        const offering = (offerings ?? []).find(
          (offering): offering is BundlePassportOffering => {
            return (
              hasBundle(offering) &&
              Array.isArray(offering.bundle) &&
              bytes32Hex(offering.payload) === bytes32Hex(cur.payload)
            )
          },
        )
        return [...acc, ...(offering?.bundle ?? [])]
      },
      [] as PassportOffering['payload'][],
    )
    const resolvedOfferings = payloads.map((payload) =>
      findOffering(payload, offerings),
    )

    return resolvedOfferings.every(isNotError)
      ? resolvedOfferings
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
