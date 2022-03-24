<script setup lang="ts">
import Menu from "./components/Menu.vue"
import { ref, inject, watch } from "vue"
import Data from "./data-workbench"

const app = inject("app") as typeof Data
</script>

<template>
    <Menu></Menu>
    <router-view v-slot="{ Component }" style="height: 100%">
        <suspense>
            <div>
                <component :is="Component" />
            </div>
            <template #fallback> Loading... </template>
        </suspense>
    </router-view>
    <footer class="fixed-bottom bg-light text-dark text-center py-2">Unaudited and just for testing. @Boring_crypto.</footer>
</template>

<style></style>
