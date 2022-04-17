<script setup lang="ts">
import { inject, ref } from "vue"
import { ethers, BigNumber } from "ethers"
import { connectors } from "../../sdk/NetworkConnectors"
import Data from "../data-web3"
import { IERC20__factory } from "../classes/types"
import { Token } from "../classes/TokenManager"

const props = defineProps<{
    network?: number
    contract?: string
    spender?: string
    amount?: BigNumber
}>()
const app = inject("app") as typeof Data
const allowance = ref(BigNumber.from(0))
const loaded = ref(false)

const load = async () => {
    const connector = new connectors[app.web3.chainId]()
    if (props.contract && props.spender && app.web3.address) {
        const erc20 = await IERC20__factory.connect(props.contract, connector.provider)
        allowance.value = await erc20.allowance(app.web3.address, props.spender)
    }
    loaded.value = true
}
load()

const allow = async () => {
    const connector = new connectors[app.web3.chainId]()
    if (props.contract && props.spender && app.web3.address) {
        const erc20 = await IERC20__factory.connect(props.contract, connector.provider)
        await erc20.connect(app.web3.provider!.getSigner()).approve(props.spender, ethers.constants.MaxUint256)
    }
}
</script>

<template>
    <b-button>
        <span v-if="!loaded">...</span>
        <span v-else-if="!app.web3.address" @click="app.web3.connect">Connect</span>
        <span v-else-if="network && app.web3.connector?.chainId !== network" @click="app.web3.switch(props.network!)">Switch</span>
        <span v-else-if="allowance.lt(props.amount || 0)" @click="allow">Allow</span>
        <slot v-else></slot>
    </b-button>
</template>
