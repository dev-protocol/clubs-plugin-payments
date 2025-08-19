<template>
  <span
    class="grid gap-6 animate-[fadeIn_.7s_ease-in-out_forwards]"
    ref="component"
  >
    <label class="hs-form-field is-filled is-large">
      <span class="hs-form-field__label">{{ i18n('Email') }}</span>
      <input
        class="hs-form-field__input"
        :placeholder="i18n('EmailPlaceholder')"
        :data-is-filled="Boolean(customerEmail)"
        v-model="customerEmail"
        type="email"
        :disabled="loading || waitingForMinted"
      />
    </label>

    <label class="hs-form-field is-filled is-large">
      <span class="hs-form-field__label">{{ i18n('FullName') }}</span>
      <input
        class="hs-form-field__input"
        :placeholder="i18n('FullNamePlaceholder')"
        :data-is-filled="Boolean(customerName)"
        v-model="customerName"
        type="text"
        :disabled="loading || waitingForMinted"
      />
    </label>

    <Pay
      :customer="{ email: customerEmail, name: customerName }"
      :item="props.item"
      :rpcUrl="props.rpcUrl"
      :chainId="props.chainId"
      :debugMode="props.debugMode"
      :base="props.base"
    />
  </span>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import type { ComposedItem } from './types'
import { i18nFactory } from '@devprotocol/clubs-core'
import { Strings } from './i18n'
import Pay from './Pay.vue'

const props = defineProps<{
  item: ComposedItem
  chainId: number
  rpcUrl: string
  debugMode: boolean
  base: string
}>()

const account = ref<string | undefined>(undefined)
const customerEmail = ref<string | undefined>(undefined)
const customerName = ref<string | undefined>(undefined)
const loading = ref(false)
const waitingForMinted = ref(false)
const i18nBase = i18nFactory(Strings)
const i18n = ref(i18nBase(['en']))
const dialog = ref<HTMLDialogElement>()

onMounted(async () => {
  i18n.value = i18nBase(navigator.languages)
  const { connection } = await import('@devprotocol/clubs-core/connection')

  connection().account.subscribe(async (acc) => {
    account.value = acc
  })

  dialog.value = document.createElement('dialog')
})
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
