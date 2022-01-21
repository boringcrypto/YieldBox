<template>
    <div class="row">
        <div v-if="block" class="mx-auto" style="max-width: 800px">
            <h2>
                Block {{ block.number }}
            </h2>
      <b-pagination
        v-model="current_block"
        :total-rows="hardhat.block.number"
        :per-page="1"
        :hide-ellipsis="true"
      ></b-pagination>
            Hash: {{ block.hash }}<br>
            Miner: <address-link :address="block.miner" /><br>
            Nonce: {{ block.nonce }}<br>
            Extra Data: {{ block.extraData }}<br>
            GasLimit: {{ block.gasLimit.toString() }}<br>
            GasUsed: {{ block.gasUsed.toString() }}<br>
            Difficulty: {{ block.difficulty }}<br>
            Parent Hash: {{ block.parentHash }}<br>
            Timestamp: {{ new Intl.DateTimeFormat({} , {timeStyle: "short", dateStyle: "medium"}).format(block.timestamp * 1000) }} (<ago :timestamp="block.timestamp" />)<br>

            <h3 class="mt-3">Transactions</h3>
            <template v-for="tx in block.transactions" :key="tx.hash">
                <b-card>
                    <b-card-title>
                        <span v-if="tx.creates">
                            Created contract
                            <span v-if="data.contractByAddress[tx.creates]">
                                {{ data.contractByAddress[tx.creates].params.name }}
                            </span>
                            <span v-else>
                                {{ tx.creates }}
                            </span>
                        </span>
                    </b-card-title>
                    <b-card-text>
                        Index: {{ tx.transactionIndex }}<br>
                        Hash: {{ tx.hash }}<br>
                        Type: {{ tx.type }}<br>
                        From: <address-link :address="tx.from" /><br>
                        <span v-if="tx.to">
                            To: <address-link :address="tx.to" /><br>
                        </span>
                        <span v-if="tx.creates">
                            Creates: <address-link :address="tx.creates" /><br>
                        </span>
                        Nonce: {{ tx.nonce }}<br>
                        Gas Limit: {{ tx.gasLimit.toString() }}<br>
                        Gas Price: {{ tx.gasPrice.toString() }}<br>
                        Value: {{ tx.value.toString() }}<br>
                        Max Priority Fee: {{ tx.maxPriorityFeePerGas.toString() }}<br>
                        Max Fee: {{ tx.maxFeePerGas.toString() }}<br>
                        Data: {{ tx.data }}<br>

                    </b-card-text>
                </b-card>
            </template>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "@vue/runtime-core"
import { BlockWithTransactions } from "ethers/node_modules/@ethersproject/abstract-provider";
import { useRoute } from "vue-router";
import { hardhat } from "../classes/HardhatProvider"
import AddressLink from "../components/AddressLink.vue";
import Ago from "../components/Ago.vue";

export default defineComponent({
    name: "Block",
    components: {
        AddressLink,
        Ago
    },
    methods: {
        'load': async function() {
            this.block = await hardhat.getBlock(this.current_block)
        }
    },
    watch: {
        '$route.params.number': function() {
            this.current_block = parseInt(this.$route.params.number as string)
            this.load()
        },
        'current_block': function() {
            if (this.current_block && this.current_block != parseInt(this.$route.params.number as string)) {
                this.$router.push('/block/' + this.current_block)
            }
        }
    },
    mounted() {
        this.load()
    },
    setup() {
        const current_block = ref(parseInt(useRoute().params.number as string))
        return {
            current_block,
            block: ref(null as BlockWithTransactions | null)
        }
    }
})
</script>
