<script setup lang="ts">
import { computed, ComputedRef } from "vue"
import { BigNumber } from "ethers"
import Decimal from "decimal.js-light"
import { Token } from "../classes/TokenManager"

const props = defineProps<{ amount?: Decimal }>()
const display = computed(() => {
    return props.amount?.toFixed(2) || "0.00"
})
</script>

<template>
    <template v-if="amount"> ${{ display }} </template>
</template>
