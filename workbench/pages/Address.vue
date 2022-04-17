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
                    <i v-if="info.type == 'zero'" class="bi bi-trash2" />
                    <i v-if="info.type == 'wallet'" class="bi bi-wallet" />
                    <i v-if="info.type == 'contract'" class="bi bi-file-text" />
                    <span v-if="info.type == 'miner'" class="me-1">👷</span>
                    {{ info.name }}
                </span>
                <span v-else>{{ address }}</span>
            </h2>
            <span v-if="info"> {{ address }}<br /> </span>

            <b-card v-if="info && info?.type == 'wallet'" class="mt-3"> This is a named wallet </b-card>

            ETH Balance {{ detail.ethBalance.toString() }}
        </div>
    </div>
</template>

<script lang="ts"></script>
