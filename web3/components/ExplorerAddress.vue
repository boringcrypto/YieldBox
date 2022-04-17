<script setup lang="ts">
import { computed, useSlots, PropType, toRefs } from "vue"
import { connectors } from "../../sdk/NetworkConnectors"

const props = defineProps<{
    address: String | undefined | null
    network: number
}>()
const connector = computed(() => (props.network ? connectors[props.network] : null))
const slots = useSlots()
</script>

<template>
    <a :href="connector?.blockExplorerUrls[0] + 'address/' + props.address" target="_blank">
        <slot v-if="slots.default"></slot>
        <span v-else>{{ address }}</span>
    </a>
</template>
