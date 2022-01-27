<template>
    <span>
        <span v-if="info">
            <b-icon v-if="info.type == 'zero'" class="me-1" icon="trash2" />
            <b-icon v-if="info.type == 'wallet'" class="me-1" icon="wallet" />
            <b-icon v-if="info.type == 'contract'" class="me-1" icon="file-text" />
            <span v-if="info.type == 'miner'" class="me-1">👷</span>
            <router-link :to="'/address/' + address">{{ info.name }}</router-link>
        </span>
        <router-link v-else :to="'/address/' + address">{{ address }}</router-link>
    </span>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue"
import { test } from "../classes/Test"

export default defineComponent({
    name: "AddressLink",
    props: ['address'],
    setup(props) {
        const info = computed(function() {
            return test.lookupAddress(props.address) || test.lookupName(props.address)
        })

        return {
            info
        }
    }
})
</script>
