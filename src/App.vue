<template>
    <b-nav>
        <b-nav-item>Home</b-nav-item>
    </b-nav>
    <Home></Home>

    <span v-if="web3.chainId == 0">
        Network not connected
    </span>
    <span v-else-if="!web3.address">
        <button @click="web3.connect">Connect Metamask</button>
    </span>
    <span v-else>
        <strong>Your {{ web3.network.chainName }} address</strong><br>
        {{ web3.address }}
    </span>

</template>

<script lang="ts">
import {defineComponent} from "vue"
import Home from "./pages/Home.vue"

export default defineComponent({
    name: "App",
    components: {
        Home,
    },
    setup: () => {
        return {
        }
    },
})
</script>
