<script setup lang="ts">
import { computed } from "vue"
import { BigNumber } from "ethers"
import Decimal from "decimal.js-light"
import { Token } from "../classes/TokenManager"

const props = defineProps<{ token?: Token; amount?: BigNumber }>()
const display = computed(() => {
    return props.amount?.toDisplay(props.token) || "0"
})
</script>

<template>
    {{ display }}<template v-if="token?.symbol"> {{ " " + token?.symbol }}</template>
</template>
