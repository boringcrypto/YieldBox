<script setup lang="ts">
import { inject, ref, computed, watch } from "vue"
import { ethers, BigNumber } from "ethers"
import { connectors } from "../../sdk/NetworkConnectors"
import Data from "../data-web3"
import { IERC20__factory } from "../classes/types"
import { Token } from "../classes/TokenManager"
import Decimal from "decimal.js-light"

const props = defineProps<{
    modelValue?: BigNumber | null
    token?: Token | null
    max?: BigNumber
}>()
const emit = defineEmits(["update:modelValue"])
const app = inject("app") as typeof Data
const state = ref(null as boolean | null)
const amount = ref(props.token && props.modelValue ? props.modelValue.toDec(props.token.decimals).toString() : "")
const updateAmount = (amountIn: Event | string) => {
    if (props.token?.decimals) {
        try {
            amount.value = amountIn as string
            const newValue = new Decimal((amountIn as string) || 0).toInt(props.token.decimals)
            if (newValue.gte(0)) {
                emit("update:modelValue", new Decimal((amountIn as string) || 0).toInt(props.token.decimals))
                state.value = null
            } else {
                emit("update:modelValue", BigNumber.from(0))
                state.value = false
            }
        } catch (e) {
            emit("update:modelValue", BigNumber.from(0))
            state.value = false
        }
    }
}
watch(
    () => props.modelValue,
    (value) => {
        if (value === null) {
            amount.value = ""
        }
    }
)
watch(
    () => props.token,
    () => {
        emit("update:modelValue", null)
    }
)
const setMax = () => {
    if (props.token?.decimals && props.max) {
        amount.value = props.max.toDec(props.token.decimals).toString()
        emit("update:modelValue", BigNumber.from(-1))
    }
}
</script>

<template>
    <b-input-group>
        <b-form-input type="number" min="0" @input="updateAmount" :value="amount" :state="state" />
        <b-button v-if="max && token" @click="setMax">Max</b-button>
    </b-input-group>
</template>

<style scoped>
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

/* Firefox */
input[type="number"] {
    -moz-appearance: textfield;
}
</style>
