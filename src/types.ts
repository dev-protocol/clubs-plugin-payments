import type { Membership } from '@devprotocol/clubs-core'

export type PricedMembership = Membership & {
  price: NonNullable<Membership['price']>
  currency: NonNullable<Membership['currency']>
}

export type CollectionMembership = PricedMembership & {
  memberCount?: number
}

export type Collection = {
  id: string
  name: string
  imageSrc: string
  status: 'Draft' | 'Published'
  endTime?: number
  description: string
  memberships: CollectionMembership[]
  requiredMemberships?: string[]
}