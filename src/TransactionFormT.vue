<template>
  <div>
    <h1>Transaction Form</h1>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import type { Failure, Success } from './api/payment-key'
import type { ComposedItem } from '.'
import { whenDefined, whenDefinedAll, whenNotError } from '@devprotocol/util-ts'
import { JsonRpcProvider } from 'ethers'
import { clientsSTokens } from '@devprotocol/dev-kit'
import { i18nFactory, mintedIdByLogs } from '@devprotocol/clubs-core'
import {
  IconBouncingArrowRight,
  IconSpinner,
} from '@devprotocol/clubs-core/ui/vue'
import { Strings } from './i18n'

export default {


    props: {
        item: Object as () => ComposedItem,
        chainId: Number,
        rpcUrl: String,
        debugMode: Boolean,
    },
}
</script>