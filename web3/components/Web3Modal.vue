<script setup lang="ts">
import { inject, ref, computed, watch } from "vue"
import { ethers, BigNumber } from "ethers"
import { connectors } from "../classes/NetworkConnectors"
import Data from "../data-web3"
import { IERC20__factory } from "../classes/types"
import { Token } from "../classes/TokenManager"

const props = defineProps<{
    network?: number
    token?: Token | null
    spender?: string
    amount?: BigNumber
    show?: boolean
}>()
const emit = defineEmits(["cancel", "click"])
const app = inject("app") as typeof Data
const allowance = ref(BigNumber.from(0))
const loaded = ref(false)

const load = async () => {
    const connector = new connectors[app.web3.chainId]()
    if (props.token?.address && props.spender && app.web3.address) {
        const erc20 = await IERC20__factory.connect(props.token.address, connector.provider)
        allowance.value = await erc20.allowance(app.web3.address, props.spender)
    }
    loaded.value = true
}
load()

watch(
    () => props.token,
    () => {
        loaded.value = false
        load()
    }
)

watch(
    () => app.web3.update,
    () => {
        load()
    }
)

const okTitle = computed(() => {
    if (!loaded) {
        return "..."
    }
    if (!app.web3.address) {
        return "Connect"
    }
    if (props.network && app.web3.connector?.chainId !== props.network) {
        return "Switch"
    }
    if (allowance.value.lt(props.amount || 0)) {
        return "Allow"
    }
    return "Ok"
})

const okDismiss = computed(() => {
    if (!loaded) {
        return ""
    }
    if (!app.web3.address) {
        return ""
    }
    if (props.network && app.web3.connector?.chainId !== props.network) {
        return ""
    }
    if (allowance.value.lt(props.amount || 0)) {
        return ""
    }
    return "modal"
})

const ok = async () => {
    if (!loaded) {
        return
    } else if (!app.web3.address) {
        app.web3.connect()
    } else if (props.network && app.web3.connector?.chainId !== props.network) {
        app.web3.switch(props.network!)
    } else if (allowance.value.lt(props.amount || 0)) {
        const connector = new connectors[app.web3.chainId]()
        if (props.token?.address && props.spender && app.web3.address) {
            const erc20 = await IERC20__factory.connect(props.token.address, connector.provider)
            await app.web3.send(
                erc20.connect(app.web3.provider!.getSigner()).approve(props.spender, ethers.constants.MaxUint256),
                "Approve " + props.token.symbol
            )
        }
    } else {
        emit("click")
    }
}
</script>

<template>
    <b-modal :okTitle="okTitle">
        <template v-slot:footer>
            <b-button type="button" class="btn btn-secondary" data-bs-dismiss="modal" variant="secondary" @click="$emit('cancel')">
                Cancel
            </b-button>
            <b-button type="button" class="btn btn-primary" :data-bs-dismiss="okDismiss" variant="primary" @click="ok">
                {{ okTitle }}
            </b-button>
        </template>
        <slot></slot>
    </b-modal>
</template>
