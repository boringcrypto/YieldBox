<template>
    <table style="width: 1004px; margin: auto; border-spacing: 0;">
        <tr>
            <td style="text-align: left; vertical-align: top">
                <span v-if="yieldbox">Hi {{ yieldbox.address }}</span>
            </td>
            <td style="text-align: right">
                <span v-if="info.chainId == 0">
                    Network not connected
                </span>
                <span v-else-if="!info.address">
                    <button @click="info.connect">Connect Metamask</button>
                </span>
                <span v-else>
                    <strong>Your wallet address</strong><br>
                    {{ info.address }}
                </span>
            </td>
        </tr>
    </table>
</template>

<script lang="ts">
import {defineComponent, PropType } from "@vue/runtime-core"
import { ProviderInfo } from "../classes/ProviderInfo"
import { constants } from "../constants/development"

import Countdown from "../components/Countdown.vue"
import { YieldBox, YieldBox__factory } from "../../types/ethers-contracts"

export default defineComponent({
    name: "Home",
    props: {
        info: {
            type: Object as PropType<ProviderInfo>,
            required: true,
        },
        referrer: String
    },
    components: {
        Countdown
    },
    watch: {
        'info.address': function() {
            this.newBlock()
        },
        'info.block': function() {
            this.newBlock()
        }
    },
    methods: {
        newBlock: async function() {
            if (window.provider) {
                this.yieldbox = YieldBox__factory.connect(constants.yieldbox, window.provider);
                console.log(await this.yieldbox.balanceOf(this.info.address, 0));
            }
        }
    },   
    data() {
        return {
            yieldbox: null as YieldBox | null
        }
    }
})
</script>
