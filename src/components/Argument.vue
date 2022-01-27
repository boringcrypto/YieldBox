<template>
    <span>
        <template v-if="input.type === 'address'">
            <address-link :address="arg" />
        </template>
        <template v-else-if="input.type.startsWith('uint')">
            <span v-b-popover.hover="arg.toString()" :title="render_uint(arg)">{{ render_uint(arg) }}</span>
        </template>
        <template v-else>
            {{ arg }}
        </template>
    </span>
</template>

<script lang="ts">
import { BigNumber } from "@ethersproject/bignumber"
import { defineComponent } from "vue"
import AddressLink from "./AddressLink.vue"

export default defineComponent({
    name: "Argument",
    components: {
        AddressLink
    },
    props: ['input', 'arg'],
    methods: {
        render_uint(value: string) {
            let number = BigNumber.from(value || "0")
            let exponent = 0
            if (number.gt("999999")) {
                while (number.mod(1000).isZero() && exponent !== 18) {
                    exponent += 3
                    number = number.div(1000)
                }
            }

            if (exponent) {
                return number.toString() + "e" + exponent.toString()
            } else {
                return number.toString()
            }
        }
    }
})
</script>
