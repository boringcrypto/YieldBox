<script setup lang="ts">
import { inject } from "vue"
import Data from "../data-workbench"

const app = inject("app") as typeof Data
</script>

<template>
    <div class="alert alert-danger" role="alert" v-if="hardhat.block.number < 10000">
        Mainnet forking is not enabled. To enable mainnet forking, create a (free) account on
        <a href="https://www.alchemy.com/" target="_blank">Alchemy</a>. Then get an API key for mainnet and add copy the .env.example file to
        .env and add your API key there.
    </div>
    <div class="container-xl">Bench</div>
</template>

<style scoped></style>
