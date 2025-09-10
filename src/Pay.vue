<template>
  <span
    class="grid gap-6 animate-[fadeIn_.7s_ease-in-out_forwards]"
    ref="component"
  >
    <span class="grid">
      <button
        @click="clickHandler"
        :disabled="
          !account ||
          !customerEmail ||
          !customerName ||
          loading ||
          waitingForCompleted ||
          Boolean(error)
        "
        class="hs-button relative group is-large is-filled"
        :class="{ 'animate-pulse': loading, 'bg-red-600': error }"
      >
        <IconBouncingArrowRight
          v-if="!loading"
          :justifyLeft="true"
          class="group-disabled:hidden"
        />
        <IconSpinner v-if="loading" class="absolute left-5 size-5" />
        {{ i18n('PayWithACreditCard') }}
      </button>

      <p
        v-if="error"
        class="text-bold mt-2 rounded-md bg-red-600 p-2 text-white"
      >
        {{ error }}
      </p>
    </span>

    <span
      v-if="waitingForCompleted"
      class="fixed inset-0 flex items-center justify-center bg-black/30"
    >
      <span
        class="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 size-52 shadow"
      >
        <video :src="PosMp4" autoplay loop muted playsinline class="size-32" />
        <p class="text-sm text-black/50">{{ i18n('Waiting') }}</p>
      </span>
    </span>
  </span>
</template>

<script lang="ts" setup>
import { ref, onMounted, useTemplateRef } from 'vue'
import type { Failure, Success } from './api/payment-key'
import { CartItemStatus, type CartItem, type ComposedItem } from './types'
import {
  isNotError,
  whenDefined,
  whenDefinedAll,
  whenNotError,
} from '@devprotocol/util-ts'
import { JsonRpcProvider } from 'ethers'
import { clientsSTokens } from '@devprotocol/dev-kit'
import {
  bytes32Hex,
  fetchProfile,
  i18nFactory,
  mintedIdByLogs,
} from '@devprotocol/clubs-core'
import { IconBouncingArrowRight } from '@devprotocol/clubs-core/ui/vue'
import { Strings } from './i18n'
import PosMp4 from './images/pos-terminal.mp4'
import { Signer } from 'ethers'
import { PluginId } from './constants'
import { loadLibrary } from './utils'

const props = defineProps<{
  cart?: boolean
  onchain?: {
    item: ComposedItem
    chainId: number
    rpcUrl: string
  }
  customer?: {
    email?: string
    name?: string
  }
  debugMode: boolean
  base: string
}>()

const account = ref<string | undefined>(undefined)
const loading = ref(false)
const error = ref<string | undefined>(undefined)
const component = useTemplateRef('component')
const waitingForCompleted = ref(false)
const i18nBase = i18nFactory(Strings)
const i18n = ref(i18nBase(['en']))
const dialog = ref<HTMLDialogElement>()
const message = ref<string | undefined>(undefined)
const signature = ref<string | undefined>(undefined)
const orderId = ref<string | undefined>(undefined)
const customerEmail = ref<string | undefined>(props.customer?.email)
const customerName = ref<string | undefined>(props.customer?.name)

let signer: Signer | undefined

onMounted(async () => {
  i18n.value = i18nBase(navigator.languages)

  whenDefined(import.meta.env.PUBLIC_POP_CLIENT_KEY, (clientKey) => {
    loadLibrary({ clientKey })
  })

  const { connection } = await import('@devprotocol/clubs-core/connection')

  connection().account.subscribe(async (acc) => {
    account.value = acc
    if (!acc || customerName.value) return
    const userprofile = await fetchProfile(acc)
    customerName.value = userprofile.profile?.username
  })
  connection().signer.subscribe((_signer) => {
    signer = _signer
  })
  connection().identifiers.subscribe((_id) => {
    customerEmail.value = customerEmail.value ?? _id?.email
  })

  dialog.value = document.createElement('dialog')
})

const onError = (msg: string) => {
  error.value = msg
  setTimeout(() => {
    error.value = undefined
  }, 6000)
}

const waitForCompleted = async () => {
  const _cart = props.cart
  const _onchain = props.onchain
  return _cart
    ? (async () => {
        const url = new URL(`${props.base}/api/${PluginId}/orders`)
        url.searchParams.set('order_id', orderId.value!)
        url.searchParams.set('message', message.value!)
        url.searchParams.set('signature', signature.value!)

        return new Promise<CartItem[]>(async (res, rej) => {
          const polling = setInterval(async () => {
            const result = await fetch(url).catch((err: Error) => err)
            if (result instanceof Error) {
              clearInterval(polling)
              return rej(result)
            }
            const body = await result.json()
            const items = body.data as CartItem[]
            if (
              items.length > 0 &&
              items.every((item) => item.status === CartItemStatus.Completed)
            ) {
              clearInterval(polling)
              return res(items)
            }
          }, 300)
        })
      })()
    : _onchain
      ? (async () => {
          const provider = new JsonRpcProvider(_onchain.rpcUrl)
          const blockNumber = await provider.getBlockNumber()
          const [l1, l2] = await clientsSTokens(provider)
          const client = l1 ?? l2
          const sTokens = client?.contract()
          return new Promise<bigint>(async (res, rej) => {
            const polling = setInterval(async () => {
              const event = await whenDefined(sTokens, (c) =>
                c
                  .queryFilter(c.filters.Minted, blockNumber)
                  .catch((err) => new Error(err)),
              )
              const result = await whenNotError(event, (eve) =>
                whenDefinedAll(
                  [eve, client, account.value],
                  ([ev, sTokensManager, receipent]) =>
                    mintedIdByLogs(ev, {
                      sTokensManager,
                      receipent,
                      payload: _onchain.item.payload,
                    }).catch((err) => new Error(err)),
                ),
              )
              console.log({ blockNumber, event, id: result })
              if (result instanceof Error) {
                clearInterval(polling)
                return rej(result)
              }
              if (result) {
                clearInterval(polling)
                return res(result)
              }
            }, 500)
          })
        })()
      : ('' as never)
}

const getCCForm = () => document.querySelector('iframe#pop-veritrans')

const clickHandler = async () => {
  const pop = (window as { pop?: any }).pop ?? new Error('Library error')
  const _message = `Pay with a credit card @ts:${new Date().getTime()}`
  message.value = _message
  const params = await whenNotError(
    pop,
    async () =>
      whenDefinedAll(
        [
          // Basic info
          whenDefinedAll(
            [account.value, customerName.value, customerEmail.value],
            ([account_, customerName_, customerEmail_]) => ({
              account: account_,
              customerName: customerName_,
              customerEmail: customerEmail_,
              dummy: props.debugMode,
            }),
          ),
          // Cart-based payment info
          props.cart === true
            ? whenDefinedAll(
                [await signer?.signMessage(_message)],
                ([_signature]) => {
                  signature.value = _signature
                  return {
                    message: _message,
                    signature: _signature,
                  }
                },
              )
            : false,
          // On-chain-based payment info
          props.onchain
            ? whenDefinedAll([props.onchain.item.payload], ([payload]) => ({
                payload,
              }))
            : false,
        ],
        ([info, cart, onchain]) => ({
          info,
          cart,
          onchain,
        }),
      ) ?? new Error('Required fields missing'),
  )

  loading.value = true

  const paymentKeyApi = whenNotError(params, ({ info, cart, onchain }) => {
    const url = new URL(
      `${props.base}/api/${PluginId}/payment-key${cart ? '/cart' : ''}`,
    )
    url.searchParams.set('eoa', info.account)
    url.searchParams.set('email.customer_name', info.customerName)
    url.searchParams.set('email.customer_email_address', info.customerEmail)
    url.searchParams.set('dummy', String(info.dummy))
    if (cart && cart !== true) {
      url.searchParams.set('message', cart.message)
      url.searchParams.set('signature', cart.signature)
    }
    if (onchain && onchain !== true) {
      url.searchParams.set('payload', bytes32Hex(onchain.payload))
    }
    return url
  })
  const res = await whenNotError(paymentKeyApi, (api) =>
    fetch(api, {
      headers: { 'Content-Type': 'application/json' },
    }).catch((err: Error) => err),
  )

  const data = await whenNotError(res, async (result) =>
    result.ok
      ? ((await result.json()) as Success | Failure)
      : new Error('Request error has occurred'),
  )

  console.log(data)

  const paymentKey = whenNotError(data, (d) =>
    d.status === 'success' ? d.payment_key : new Error(d.message),
  )

  const order_id = whenNotError(data, (d) =>
    d.status === 'success' ? d._clubs?.order_id : new Error(d.message),
  )

  orderId.value = isNotError(order_id) ? order_id : undefined

  pop.show()
  const ccForm = getCCForm()
  whenDefinedAll([dialog.value, ccForm], ([dia, form]) => {
    if (!document.body.contains(dia)) {
      document.body.appendChild(dia)
    }
    dia.append(form)
    dia.showModal()
  })

  const pay = await whenNotError(paymentKey, (key) =>
    whenDefined(key, (_key) =>
      new Promise<{}>((resolve, reject) => {
        pop.pay(_key, {
          skipOrderSummary: true,
          autoReturn: true,
          language: 'en', //'en' | 'ja' | 'zh'
          onSuccess: function (result: any) {
            console.log('success')
            console.log(result)
            waitingForCompleted.value = true
            return resolve(result as {})
          },
          onFailure: function (result: any) {
            console.log('failure')
            console.log(result)
            return reject(new Error(`${result.result_code}: ${result.status}`))
          },
          onIncomplete: function (result: any) {
            console.log('incomplete')
            console.log(result)
            return reject(new Error(`${result.status}`))
          },
        })
      }).catch((err: Error) => err),
    ),
  )

  whenDefined(dialog.value, (dia) => {
    dia.close()
  })

  loading.value = false

  const result = await whenNotError(pay, waitForCompleted)

  waitingForCompleted.value = false

  console.log('component.value', component.value)

  return result instanceof Error
    ? onError(result.message)
    : component.value?.dispatchEvent(
        new CustomEvent('checkout:completed', {
          detail: { id: result },
          bubbles: true,
        }),
      )
}
</script>

<style scoped>
@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 100;
  }
}
</style>
