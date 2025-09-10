<template>
  <span class="grid">
    <button
      @click="onClick"
      :disabled="loading || Boolean(error)"
      class="hs-button relative group is-large is-filled"
      :class="{ 'animate-pulse': loading, 'bg-red-600': error }"
    >
      <IconBouncingArrowRight
        v-if="completed || (!completed && !loading)"
        :justifyLeft="true"
        class="group-disabled:hidden"
      />
      <IconSpinner v-if="loading" class="absolute left-5 size-5" />
      {{ i18n('AddCart') }}
    </button>

    <p v-if="error" class="text-bold mt-2 rounded-md bg-red-600 p-2 text-white">
      {{ error }}
    </p>
  </span>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { UndefinedOr, whenDefined, whenDefinedAll } from '@devprotocol/util-ts'
import {
  bytes32Hex,
  ClubsOffering,
  i18nFactory,
  Signal,
} from '@devprotocol/clubs-core'
import { Strings } from './i18n'
import { Signer } from 'ethers'
import { PluginId } from './constants'
import { IconBouncingArrowRight } from '@devprotocol/clubs-core/ui/vue'
import type { connection as ConnectionType } from '@devprotocol/clubs-core/connection'

const props = defineProps<{
  payload: ClubsOffering['payload']
  quantity?: number
  onComplete: () => void | Promise<() => void>
  base: string
}>()

const account = ref<string | undefined>(undefined)
const loading = ref(false)
const completed = ref(false)
const error = ref<string | undefined>(undefined)
const i18nBase = i18nFactory(Strings)
const i18n = ref(i18nBase(['en']))
const clubsConnection = ref<ReturnType<typeof ConnectionType>>()
const message = `Add Cart: ${bytes32Hex(props.payload)}`

let signer: Signer | undefined

const onClick = async () => {
  loading.value = true
  if (!signer) {
    return clubsConnection.value?.signal.next(Signal.SignInRequest)
  }
  const signature = await signer?.signMessage(message)
  const url = new URL(`${props.base}/api/${PluginId}/cart`)

  const params = whenDefinedAll(
    [props.payload, signature],
    ([payload, sig]) => {
      return {
        quantity: props.quantity ?? 1,
        payload: bytes32Hex(payload),
        message,
        signature: sig,
      }
    },
  )
  const apiCall = await whenDefined(params, (params) =>
    fetch(url, { method: 'POST', body: JSON.stringify(params) }),
  )
  const err = await whenDefined(apiCall, (res) =>
    res.json().then((x) => x.error as UndefinedOr<string>),
  )
  error.value = err
  loading.value = false
  if (!err) {
    completed.value = true
    props.onComplete()
  }
}

onMounted(async () => {
  i18n.value = i18nBase(navigator.languages)
  const { connection } = await import('@devprotocol/clubs-core/connection')

  clubsConnection.value = connection()

  connection().account.subscribe(async (acc) => {
    account.value = acc
  })

  connection().signer.subscribe((_signer) => {
    signer = _signer
  })
})
</script>
