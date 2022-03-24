<script setup lang="ts">
import { inject, watch, computed, ref } from "vue"
import Data from "../data-workbench"
import { BigNumber } from "ethers"
import { useRoute } from "vue-router"
import { hardhat } from "../classes/HardhatProvider"
const app = inject("app") as typeof Data

const address = computed(() => useRoute().params.address as string)
const info = computed(function () {
    return app.lookupAddress(address.value)
})
const detail = ref({
    ethBalance: BigNumber.from("0"),
})

const load = async function () {
    detail.value.ethBalance = await hardhat.provider.getBalance(address.value)
}
load()

watch(() => [address, hardhat.block.number], load)
</script>

<template>
    <div class="row">
        <div class="mx-auto" style="max-width: 800px">
            <h2>
                <span v-if="info">
                    <b-icon v-if="info.type == 'zero'" class="me-1" icon="trash2" />
                    <b-icon v-if="info.type == 'wallet'" class="me-1" icon="wallet" />
                    <b-icon v-if="info.type == 'contract'" class="me-1" icon="file-text" />
                    <span v-if="app.addresses[address].type == 'miner'" class="me-1">👷</span>
                    {{ app.addresses[address].name }}
                </span>
                <span v-else>{{ address }}</span>
            </h2>
            <span v-if="info"> {{ address }}<br /> </span>

            <b-card v-if="info && info.type == 'wallet'" class="mt-3"> This is a named wallet </b-card>

            ETH Balance {{ detail.ethBalance.toString() }}
        </div>
    </div>
</template>

<script lang="ts"></script>
