<template>
    <span>
        <span v-if="test.addresses[address]">
            <b-icon v-if="test.addresses[address].type == 'wallet'" class="me-1" icon="wallet" />
            <b-icon v-if="test.addresses[address].type == 'contract'" class="me-1" icon="file-text" />
            <span v-if="test.addresses[address].type == 'miner'" class="me-1">👷</span>
            <router-link :to="'/address/' + address">{{ test.addresses[address].name }}</router-link>
        </span>
        <router-link v-else :to="'/address/' + address">{{ address }}</router-link>
    </span>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { test } from "../classes/Test"

export default defineComponent({
    name: "AddressLink",
    props: ['address']
})
</script>
