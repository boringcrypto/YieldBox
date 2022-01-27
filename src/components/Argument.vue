<template>
    <span>
        <template v-if="input.type === 'address'">
            <address-link :address="arg" />
        </template>
        <template v-else>
            {{ arg }}
        </template>
    </span>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import AddressLink from "./AddressLink.vue"

export default defineComponent({
    name: "Argument",
    components: {
        AddressLink
    },
    props: ['input', 'arg']
})
</script>
