<template>
    <div style="text-align: center;">
        <Web3 :info="info"></Web3>
        <Home :info="info"></Home>
    </div>
</template>

<script lang="ts">
import { ethers } from "ethers"
import {defineComponent, Ref, ref} from "vue"
import { ProviderInfo } from "./classes/ProviderInfo"
import Web3, { EmptyProviderInfo } from "./components/Web3.vue"
import Home from "./pages/Home.vue"

export default defineComponent({
    name: "App",
    components: {
        Web3,
        Home,
    },
    setup: () => {
        const info: Ref<ProviderInfo> = ref(EmptyProviderInfo)

        return {
            info
        }
    },
})
</script>
