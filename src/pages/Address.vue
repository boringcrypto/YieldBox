<template>
    <div class="row">
        <div class="mx-auto" style="max-width: 800px">
            <h2>
                <span v-if="info">
                    <b-icon v-if="info.type == 'zero'" class="me-1" icon="trash2" />
                    <b-icon v-if="info.type == 'wallet'" class="me-1" icon="wallet" />
                    <b-icon v-if="info.type == 'contract'" class="me-1" icon="file-text" />
                    <span v-if="test.addresses[address].type == 'miner'" class="me-1">👷</span>
                    {{ test.addresses[address].name }}
                </span>
                <span v-else>{{ address }}</span>
            </h2>
            <span v-if="info">
                {{ address }}<br>
            </span>

            <b-card v-if="info && info.type == 'wallet'" class="mt-3">
                This is a named wallet
            </b-card>

            ETH Balance {{ detail.ethBalance.toString() }}
        </div>
    </div>
</template>

<script lang="ts">
import { BigNumber } from "@ethersproject/bignumber";
import { computed, defineComponent, ref } from "@vue/runtime-core"
import { useRoute } from "vue-router";
import { hardhat } from "../classes/HardhatProvider"
import { test } from "../classes/Test";
import AddressLink from "../components/AddressLink.vue";
import Ago from "../components/Ago.vue";

export default defineComponent({
    name: "Block",
    components: {
        AddressLink,
        Ago
    },
    methods: {
        load: async function() {
            this.detail.ethBalance = await hardhat.provider.getBalance(this.address)
        }
    },
    watch: {
        '$route.params.address': function() {
            this.address = this.$route.params.address as string
        },
        'address': async function() {
            this.load()
        },
        'hardhat.block.number': async function() {
            this.load()
        }
    },
    mounted() {
        this.load()
    },
    setup() {
        const address = ref(useRoute().params.address as string)
        const info = computed(function() {
            return test.lookupAddress(address.value)
        })
        return {
            address,
            info,
            detail: ref({
                ethBalance: BigNumber.from("0")
            })
        }
    }
})
</script>
