<template>
    <span v-if="days">{{ days }}d </span>
    <span v-if="!days && hours">{{ hours }}h </span>
    <span v-if="!days && (hours || minutes)">{{ minutes }}m </span>
    <span v-if="!days && !hours && (hours || minutes)">{{ seconds }}s </span>
    ago
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    name: "Ago",
    props: {
        timestamp: {
            type: Number || String,
            required: true,
        },
    },
    computed: {
        diff(): number {
            return this.timestamp ? this.now.value - (typeof this.timestamp == "string" ? parseInt(this.timestamp) : this.timestamp) * 1000 : 0
        },
        days(): number {
            return Math.floor(this.diff / (24 * 60 * 60 * 1000))
        },
        hours(): number {
            return Math.floor(this.diff / (60 * 60 * 1000)) % 24
        },
        minutes(): number {
            return Math.floor(this.diff / (60 * 1000)) % 60
        },
        seconds(): number {
            return Math.floor(this.diff / 1000) % 60
        },
    },
})
</script>
