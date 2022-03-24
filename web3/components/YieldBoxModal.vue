<script setup lang="ts">
import { inject, ref, computed, watch } from "vue"
import { connectors } from "../classes/NetworkConnectors"
import Data from "../data-web3"
import { YieldBox } from "../../typechain-types"

const props = defineProps<{
    network?: number
    yieldBox: YieldBox
    operator?: string
    show?: boolean
    okDisabled?: boolean
}>()
const emit = defineEmits(["cancel", "click"])
const app = inject("app") as typeof Data
const approved = ref(true)
const loaded = ref(false)

const load = async () => {
    const connector = new connectors[app.web3.chainId]()
    if (props.operator) {
        approved.value = await props.yieldBox.isApprovedForAll(app.web3.address, props.operator)
    }
    loaded.value = true
}
load()

watch(
    () => props.operator,
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
    if (!approved.value) {
        return "Approve"
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
    if (!approved.value) {
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
    } else if (!approved.value) {
        if (props.operator && app.web3.provider) {
            await app.web3.send(
                props.yieldBox.connect(app.web3.provider.getSigner()).setApprovalForAll(props.operator, true),
                "Approving access to YieldBox"
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
            <b-button
                type="button"
                class="btn btn-primary"
                :data-bs-dismiss="okDismiss"
                variant="primary"
                @click="ok"
                :disabled="props.okDisabled"
            >
                {{ okTitle }}
            </b-button>
        </template>
        <slot></slot>
    </b-modal>
</template>
