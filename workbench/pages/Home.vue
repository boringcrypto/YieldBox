<script setup lang="ts">
import { inject } from "vue"
import Data from "../data-workbench"
import AddressLink from "../components/AddressLink.vue"

const app = inject("app") as typeof Data
</script>

<template>
    <div class="alert alert-danger" role="alert" v-if="hardhat.block.number < 10000">
        Mainnet forking is not enabled. To enable mainnet forking, create a (free) account on
        <a href="https://www.alchemy.com/" target="_blank">Alchemy</a>. Then get an API key for mainnet and add copy the .env.example file to
        .env and add your API key there.
    </div>
    <div class="container-xl">
        <table>
            <tr v-for="contract in app.contracts">
                <td>
                    <AddressLink :address="contract.address" />
                </td>
                <td>
                    {{ contract.address }}
                </td>
            </tr>
        </table>
    </div>
</template>

<style scoped></style>
