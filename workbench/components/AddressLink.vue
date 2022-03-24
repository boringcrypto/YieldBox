<template>
    <span>
        <span v-if="info">
            <i v-if="info.type == 'zero'" class="bi bi-trash2" />
            <i v-if="info.type == 'wallet'" class="bi bi-wallet" />
            <i v-if="info.type == 'contract'" class="bi bi-file-text" />
            <span v-if="info.type == 'miner'" class="me-1">👷</span>
            <router-link :to="'/address/' + address">{{ info.name }}</router-link>
        </span>
        <router-link v-else :to="'/address/' + address">{{ address }}</router-link>
    </span>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue"
import app from "../data-workbench"

export default defineComponent({
    name: "AddressLink",
    props: ["address"],
    setup(props) {
        const info = computed(function () {
            return app.lookupAddress(props.address) || app.lookupName(props.address)
        })

        return {
            info,
        }
    },
})
</script>
