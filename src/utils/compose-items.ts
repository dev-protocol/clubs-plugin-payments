import {
  bytes32Hex,
  type ClubsFactoryUtils,
  type ClubsPluginOptions,
} from '@devprotocol/clubs-core'
import { whenDefined, type UndefinedOr } from '@devprotocol/util-ts'

import type { ComposedItem, Override } from '../types'
import type { ClubsConfiguration, Membership } from '@devprotocol/clubs-core'
import type { Collection } from '../types'

export const composeItems = (
  options: ClubsPluginOptions,
  { getPluginConfigById }: ClubsFactoryUtils,
  offerings: ClubsConfiguration['offerings'] = [],
): ComposedItem[] => {
  const overrides =
    (options.find((opt) => opt.key === 'override')?.value as UndefinedOr<
      Override[]
    >) ?? []

  const items: ComposedItem[] = overrides
    .map((ov) => {
      const [sourceConfig] = ov.importFrom
        ? getPluginConfigById(ov.importFrom)
        : [undefined]
      const source = sourceConfig
        ? (
            sourceConfig.options?.find((op) => op.key === ov.key)?.value as
              | undefined
              | Membership[]
              | Collection[]
          )?.find((s) => {
            // Check if the keys from collection object are present in s, if yes then it's a collection.
            return 'memberships' in s ||
              'requiredMemberships' in s ||
              'endTime' in s
              ? !!(s as Collection).memberships.find(
                  // This is a collection, so find the membership and return boolean.
                  (m) => bytes32Hex(m.payload) === bytes32Hex(ov.payload),
                )
              : bytes32Hex(s.payload) === bytes32Hex(ov.payload) // This is a membership so directly compare payload.
          })
        : offerings?.find(
            (s) => bytes32Hex(s.payload) === bytes32Hex(ov.payload),
          )
      const composed = whenDefined(source, (so) => ({ ...ov, source: so }))
      return composed
    })
    .filter((x) => x !== undefined) as ComposedItem[]

  return items
}
