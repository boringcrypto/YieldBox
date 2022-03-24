<script setup lang="ts">
import { inject } from "vue"
import Data from "../data-workbench"

const app = inject("app") as typeof Data
</script>

<template>
    <div class="container-xl">Bench</div>
</template>

<style scoped></style>
