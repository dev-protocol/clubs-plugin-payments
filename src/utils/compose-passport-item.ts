import { createClient } from 'redis'
import type { ComposedItem } from '../types'
import { ClubsConfiguration } from '@devprotocol/clubs-core'
import { checkoutPassportItemForPayload } from '@devprotocol/clubs-plugin-passports/utils'
import { UndefinedOr, whenDefinedAll } from '@devprotocol/util-ts'

export const composePassportItem = async (
  payload: Uint8Array | string,
  {
    config,
    client,
  }: {
    config: ClubsConfiguration
    client: Awaited<ReturnType<typeof createClient>>
  },
): Promise<UndefinedOr<ComposedItem>> => {
  const passportItem = await checkoutPassportItemForPayload(payload, {
    config,
    client,
  })
  return whenDefinedAll(
    [
      passportItem?.props.offering.deprecated !== true ? true : undefined,
      passportItem,
      passportItem?.props.discount?.price.yen ??
        passportItem?.props.fiat?.price.yen,
    ],
    ([, item, yen]) => ({
      payload,
      price: {
        yen,
      },
      source: item.props.offering,
    }),
  )
}
