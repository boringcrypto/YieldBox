<template>
    <nav-bar></nav-bar>
    <router-view class="mt-3"></router-view>
</template>

<script lang="ts">
import {defineComponent} from "vue"
import { test } from "./classes/Test"
import NavBar from "./components/NavBar.vue"

export default defineComponent({
    name: "App",
    components: {
        NavBar
    },
    setup: () => {
        // async running of the script
        test.activate()

        return {
        }
    },
})
</script>
