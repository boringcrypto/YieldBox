<script setup lang="ts">
import { inject, ref, computed, watch } from "vue"
import { ethers, BigNumber } from "ethers"
import { connectors } from "../../sdk/NetworkConnectors"
import Data from "../data-web3"
import { IERC20__factory } from "../classes/types"
import { Token } from "../classes/TokenManager"
import Decimal from "decimal.js-light"

const props = defineProps<{
    modelValue?: string | null
}>()
const emit = defineEmits(["update:modelValue"])
const app = inject("app") as typeof Data
const state = ref(null as boolean | null)

const updateAddress = (value: Event | string) => {
    try {
        emit("update:modelValue", ethers.utils.getAddress(value as string))
        state.value = null
    } catch {
        emit("update:modelValue", value)
        state.value = false
    }
}
</script>

<template>
    <b-form-input type="text" @input="updateAddress" :value="modelValue" :state="state" />
</template>
