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

export type Override = {
  importFrom?: string
  key?: string
  payload: string | Uint8Array
  price: {
    yen: number
  }
}

export type CartItem = {
  scope: string
  eoa: string
  payload: string
  quantity: number
}

export type ComposedItem = Override & { source: Membership }
