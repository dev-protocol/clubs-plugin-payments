import { addresses } from '@devprotocol/dev-kit'
import { setCartItemsCompleted } from '../../db/cart'
import { assetDocument, createAssetDocument } from '../clubsx/assets'
import { whenNotError, whenNotErrorAll } from '@devprotocol/util-ts'

export const complete = async ({
  scope,
  eoa,
  order_id,
  propertyAddress,
}: {
  readonly scope: string
  readonly eoa: string
  readonly order_id: string
  readonly propertyAddress: string
}) => {
  const orderCompletionResult = await setCartItemsCompleted({
    scope,
    eoa,
    order_id,
  })
  const docs = whenNotError(orderCompletionResult, (result) =>
    result.map((res) =>
      assetDocument({
        type: 'passportItem',
        contract: addresses.polygon.mainnet.sTokens,
        owner: res.eoa,
        payload: res.payload,
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
