<script setup lang="ts">
import { defineComponent, ref, watch, computed } from "vue"
import { BlockWithTransactions } from "@ethersproject/abstract-provider"
import { useRoute, useRouter } from "vue-router"
import { hardhat } from "../classes/HardhatProvider"
import AddressLink from "../components/AddressLink.vue"
import Ago from "../components/Ago.vue"

const route = useRoute()
const router = useRouter()

const current_block = ref(parseInt(route.params.number as string))
const block = ref(null as BlockWithTransactions | null)

const load = async function () {
    block.value = await hardhat.getBlock(current_block.value)
}
await load()

watch(
    () => route.params.number,
    () => {
        current_block.value = parseInt(route.params.number as string)
        load()
    }
)

watch(current_block, (value) => {
    router.push("/block/" + value.toString())
    load()
})
</script>

<template>
    <div class="container-xl" v-if="block">
        <h4>Block #{{ block.number }}</h4>
        <b-pagination v-model="current_block" size="sm" :total-rows="hardhat.block.number" :per-page="1" hide-ellipsis></b-pagination>
        <table class="table">
            <tbody>
                <tr>
                    <td>Timestamp</td>
                    <td>
                        <i class="bi bi-clock"></i> <ago :timestamp="block.timestamp" /> ({{
                            new Intl.DateTimeFormat(undefined, { timeStyle: "short", dateStyle: "medium" }).format(block.timestamp * 1000)
                        }})
                    </td>
                </tr>
                <tr>
                    <td>Transactions</td>
                    <td>{{ block.transactions.length }} transaction{{ block.transactions.length == 1 ? "" : "s" }}</td>
                </tr>
                <tr>
                    <td>Mined by</td>
                    <td><address-link :address="block.miner" /></td>
                </tr>
                <tr>
                    <td>Gas Used</td>
                    <td>
                        {{ block.gasUsed.toString() }}
                        ({{ block.gasUsed.mul(10000).div(block.gasLimit).toDec(2).toString() }}%)
                    </td>
                </tr>
                <tr>
                    <td>Base Fee Per Gas</td>
                    <td>{{ block.baseFeePerGas?.toDec(9).toString() }} Gwei</td>
                </tr>
                <tr>
                    <td>Extra Data</td>
                    <td>{{ block.extraData }}</td>
                </tr>
                <tr>
                    <td>Hash</td>
                    <td>{{ block.hash }}</td>
                </tr>
                <tr>
                    <td>Parent Hash</td>
                    <td>{{ block.parentHash }}</td>
                </tr>
                <tr>
                    <td>Nonce</td>
                    <td>{{ block.nonce }}</td>
                </tr>
            </tbody>
        </table>

        <h3 class="mt-3">Transactions</h3>
        <template v-for="tx in block.transactions" :key="tx.hash">
            <b-card>
                <b-card-title>
                    <span v-if="tx.creates">
                        Created contract
                        <span v-if="false && app.contractByAddress[tx.creates]">
                            {{ app.contractByAddress[tx.creates].params.name }}
                        </span>
                        <span v-else>
                            {{ tx.creates }}
                        </span>
                    </span>
                </b-card-title>
                <b-card-text>
                    Index: {{ tx.transactionIndex }}<br />
                    Hash: {{ tx.hash }}<br />
                    Type: {{ tx.type }}<br />
                    From: <address-link :address="tx.from" /><br />
                    <span v-if="tx.to"> To: <address-link :address="tx.to" /><br /> </span>
                    <span v-if="tx.creates"> Creates: <address-link :address="tx.creates" /><br /> </span>
                    Nonce: {{ tx.nonce }}<br />
                    Gas Limit: {{ tx.gasLimit.toString() }}<br />
                    Gas Price: {{ tx.gasPrice.toString() }}<br />
                    Value: {{ tx.value.toString() }}<br />
                    Max Priority Fee: {{ tx.maxPriorityFeePerGas.toString() }}<br />
                    Max Fee: {{ tx.maxFeePerGas.toString() }}<br />
                    Data: {{ tx.data }}<br />
                </b-card-text>
            </b-card>
        </template>
    </div>
</template>
