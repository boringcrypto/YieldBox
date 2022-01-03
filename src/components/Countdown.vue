<template>
    <span v-if="diff >= 0">
        <slot name="before">
        </slot>
        <span v-if="days">{{ days }} days </span>
        <span v-if="days || hours">{{ hours }} hours </span>
        <span v-if="days || hours || minutes">{{ minutes }} min </span>
        {{ seconds }} sec
    </span>
    <span v-else>
        <slot></slot>
    </span>
</template>

<script lang="ts">

import {defineComponent, Ref, ref} from "vue"

let now: Ref<number> = ref(Date.now())

window.setInterval(
    () => now.value = Date.now(), 
    1000
);

export default defineComponent({
    name: "Countdown",
    props: {
        goal: {
            type: Number,
            required: true
        },
        pre: {
            type: String
        }
    },
    computed: {
        diff(): number { return this.goal ? this.goal * 1000 - now.value : 0 },
        days(): number { return Math.floor(this.diff / (24 * 60 * 60 * 1000)) },
        hours(): number { return Math.floor(this.diff / (60 * 60 * 1000)) % 24 },
        minutes(): number { return Math.floor(this.diff / (60 * 1000)) % 60 },
        seconds(): number { return Math.floor(this.diff / (1000)) % 60 },
        countdown(): string {
            if (this.diff >= 0) {
                return (this.days ? this.days + " days" : "") +
                    (this.days || this.hours ? this.hours + " hours" : "") +
                    (this.days || this.hours || this.minutes ? this.minutes + " min" : "") +
                    this.seconds + " sec"
            } else {
                return "reached"
            }
        },
        reached(): boolean { return this.goal ? this.goal * 1000 <= now.value : false },
    }
})
</script>
