import type { Membership } from '@devprotocol/clubs-core'
import type { CheckoutItemPassportOffering } from '@devprotocol/clubs-plugin-passports'

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

export enum CartItemStatus {
  Completed = 'completed',
}

export type CartItem = {
  scope: string
  eoa: string
  payload: string
  quantity: number
  status?: CartItemStatus
  session: string
  order_id?: string
  ordered_at?: number
}

export type APICartResult = {
  total: number
  data: (CartItem & {
    passportItem?: CheckoutItemPassportOffering
    bundledPassportItems?: CheckoutItemPassportOffering[]
  })[]
}

export type ComposedItem = Override & { source: Membership }
