import type { Membership } from '@devprotocol/clubs-core'
import type {
  ClubsFunctionGetAdminPaths,
  ClubsFunctionGetPagePaths,
  ClubsFunctionGetSlots,
  ClubsFunctionPlugin,
  ClubsPluginMeta,
} from '@devprotocol/clubs-core'
import { ClubsPluginCategory, ClubsPluginSignal } from '@devprotocol/clubs-core'
import { default as Id } from './Id.astro'
import { default as Slot } from './slot.astro'
import { default as SlotTerms } from './slot-terms.astro'
import { default as SlotCurrencyOption } from './slot-currency-option.astro'
import type { ClubsFunctionGetApiPaths } from '@devprotocol/clubs-core'
import { composeItems } from './utils/compose-items'
import type { UndefinedOr } from '@devprotocol/util-ts'
import { CurrencyOption } from '@devprotocol/clubs-core'
import type { InjectedTiers } from '@devprotocol/clubs-core'
import { bytes32Hex } from '@devprotocol/clubs-core'
import Icon from './images/Icon.png'
import Readme from './readme/index.astro'
import screenshot1 from './images/clubs-payments-1.jpg'
import screenshot2 from './images/clubs-payments-2.jpg'
import screenshot3 from './images/clubs-payments-3.jpg'
import Admin from './pages/admin.astro'
import TransactionForm from './TransactionForm.vue'

export type Override = {
  id: string
  importFrom: string
  key: string
  payload: string | Uint8Array
  price: {
    yen: number
  }
}

export type ComposedItem = Override & { source: Membership }

export const getPagePaths = (async (
  options,
  { propertyAddress, rpcUrl, chainId },
  utils,
) => {
  const items = composeItems(options, utils)
  const debugMode = options.find(({ key }) => key === 'debug')?.value === true

  return items
    ? [
        ...items.map((item) => ({
          paths: ['fiat', 'yen', bytes32Hex(item.payload)],
          props: {
            item,
            propertyAddress,
            rpcUrl,
            chainId,
            signals: [ClubsPluginSignal.DisplayFullPage],
            accessControlUrl: item.source.accessControl?.url,
            accessControlDescription: item.source.accessControl?.description,
            debugMode,
          },
          component: Id,
        })),
      ]
    : []
}) satisfies ClubsFunctionGetPagePaths

export const getAdminPaths = (async (options, { name }, utils) => {
  const items = composeItems(options, utils)
  return [
    {
      paths: ['fiat'],
      props: {
        items,
        name,
      },
      component: Admin,
    },
  ]
}) satisfies ClubsFunctionGetAdminPaths

export const getApiPaths = (async (
  options,
  { propertyAddress, chainId, rpcUrl },
  utils,
) => {
  const items = composeItems(options, utils)
  const webhooks =
    (options.find((opt) => opt.key === 'webhooks')?.value as UndefinedOr<{
      fulfillment?: { encrypted: string }
    }>) ?? {}

  const [{ get }, { post }] = await Promise.all([
    import('./api/payment-key'),
    import('./api/fulfillment'),
  ])

  return [
    {
      paths: ['payment-key'],
      method: 'GET',
      handler: get({ items, propertyAddress, chainId }),
    },
    {
      paths: ['fulfillment'],
      method: 'POST',
      handler: post({
        webhookOnFulfillment: webhooks?.fulfillment?.encrypted,
        chainId,
        rpcUrl,
      }),
    },
  ]
}) satisfies ClubsFunctionGetApiPaths

export const getSlots = (async (options, __, utils) => {
  const items = composeItems(options, utils)
  const tiers: InjectedTiers = items.map((item) => ({
    ...item,
    currency: item.price.yen
      ? ('yen' as unknown as CurrencyOption)
      : (undefined as never),
    title: item.source.name,
    amount: item.price.yen,
    badgeImageSrc: item.source.imageSrc,
    badgeImageDescription: item.source.description,
    checkoutUrl: `/fiat/yen/${bytes32Hex(item.payload)}`,
  }))

  return utils.factory === 'page' && items.length > 0
    ? [
        {
          slot: 'checkout:after:transaction-form',
          component: Slot,
          props: {
            items,
          },
        },
        {
          slot: 'join:currency:option',
          component: SlotCurrencyOption,
          props: { injectedTiers: tiers },
        },
        {
          slot: 'page:footer:legal-link',
          component: SlotTerms,
        },
      ]
    : []
}) satisfies ClubsFunctionGetSlots

export const meta = {
  id: 'devprotocol:clubs:plugin:clubs-payments',
  displayName: 'Clubs Payments',
  category: ClubsPluginCategory.Monetization,
  icon: Icon.src,
  description: 'Enables fastest & most secure user onboarding with fiat.',
  readme: Readme,
  previewImages: [screenshot1.src, screenshot2.src, screenshot3.src],
} satisfies ClubsPluginMeta

export default {
  getPagePaths,
  getAdminPaths,
  getApiPaths,
  getSlots,
  meta,
} satisfies ClubsFunctionPlugin

export { TransactionForm }
