<template>
    <nav-bar></nav-bar>
    <router-view class="mt-3"></router-view>
</template>

<script lang="ts">
import {defineComponent} from "vue"
import NavBar from "./components/NavBar.vue"

export default defineComponent({
    name: "App",
    components: {
        NavBar
    },
    setup: () => {
        return {
        }
    },
})
</script>
