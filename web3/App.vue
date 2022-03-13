<script setup lang="ts">
import Menu from "./components/Menu.vue"
import { ref, inject, watch } from "vue"
import Data from "./data"

const app = inject("app") as typeof Data
const showQueue = ref(false)
watch(
    () => app.web3.active.length,
    (value) => {
        showQueue.value = value > 0
    }
)
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
    <b-modal v-model="showQueue" title="Transactions" hideFooter centered>
        <div v-for="info in app.web3.active">{{ info.description }} - {{ info.status }}</div>
    </b-modal>
</template>

<style></style>
