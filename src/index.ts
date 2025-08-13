import type { InjectedTier } from '@devprotocol/clubs-core'
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
import { bytes32Hex } from '@devprotocol/clubs-core'
import Icon from './images/Icon.png'
import Readme from './readme/index.astro'
import screenshot1 from './images/clubs-payments-1.jpg'
import screenshot2 from './images/clubs-payments-2.jpg'
import screenshot3 from './images/clubs-payments-3.jpg'
import Admin from './pages/admin.astro'
import { get } from './api/payment-key'
import { post } from './api/fulfillment'
import type { Override, ComposedItem } from './types'
import { PluginId } from './constants'
import { addCartHandler } from './api/add-cart'
import { generateScopeBy } from './utils'
import { getCartHandler } from './api/get-cart'
import { getPaymentKeyByCart } from './api/payment-key-cart'

export const getPagePaths = (async (
  options,
  { propertyAddress, rpcUrl, chainId, offerings, url },
  utils,
) => {
  const items = composeItems(options, utils, offerings)
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
            base: url,
          },
          component: Id,
        })),
      ]
    : []
}) satisfies ClubsFunctionGetPagePaths

export const getAdminPaths = (async (options, { name, offerings }, utils) => {
  const items = composeItems(options, utils, offerings)
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

export const getApiPaths = (async (options, config, utils) => {
  const { propertyAddress, chainId, rpcUrl, offerings: _offerings } = config
  const offerings = [...(_offerings ?? [])]
  const items = composeItems(options, utils, offerings)
  const webhooks =
    (options.find((opt) => opt.key === 'webhooks')?.value as UndefinedOr<{
      fulfillment?: { encrypted: string }
    }>) ?? {}
  const scope = generateScopeBy(config.url)
  const orderPrefix = new URL(config.url).host

  return [
    {
      paths: ['payment-key'],
      method: 'GET',
      handler: get({ config, items, propertyAddress, chainId }),
    },
    {
      paths: ['payment-key', 'cart'],
      method: 'GET',
      handler: getPaymentKeyByCart({ config, scope, orderPrefix, offerings }),
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
    {
      paths: ['cart'],
      method: 'GET',
      handler: getCartHandler({
        scope,
      }),
    },
    {
      paths: ['cart'],
      method: 'POST',
      handler: addCartHandler({
        scope,
        offerings,
      }),
    },
  ]
}) satisfies ClubsFunctionGetApiPaths

export const getSlots = (async (options, { offerings }, utils) => {
  const items = composeItems(options, utils, offerings)
  const tiers = items.map(
    (item) =>
      ({
        ...item,
        currency: item.price.yen
          ? ('yen' as unknown as CurrencyOption)
          : (undefined as never),
        title: item.source.name,
        amount: item.price.yen,
        badgeImageSrc: item.source.imageSrc,
        badgeImageDescription: item.source.description,
        checkoutUrl: `/fiat/yen/${bytes32Hex(item.payload)}`,
      }) satisfies Omit<InjectedTier, 'id'>,
  )

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
  id: PluginId,
  displayName: 'Clubs Payments',
  category: ClubsPluginCategory.Monetization,
  icon: Icon.src,
  description: 'Enables fastest & most secure user onboarding with fiat.',
  readme: Readme,
  previewImages: [screenshot1.src, screenshot2.src, screenshot3.src],
} satisfies ClubsPluginMeta

export { type Override, type ComposedItem }

export default {
  getPagePaths,
  getAdminPaths,
  getApiPaths,
  getSlots,
  meta,
} satisfies ClubsFunctionPlugin
