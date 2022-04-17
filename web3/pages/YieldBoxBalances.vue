<script setup lang="ts">
import { ref, inject, watch } from "vue"
import { ethers } from "ethers"
import Data from "../data-web3"
import { Network } from "../../sdk/Network"
import { tokens } from "../classes/TokenManager"
import { YieldBox } from "../classes/YieldBox"
import DeployedYieldBox from "../../deployments/localhost/YieldBox.json"
import USDAmount from "../components/USDAmount.vue"
import TokenAmount from "../components/TokenAmount.vue"
import { connectors } from "../../sdk/NetworkConnectors"
import { CoinGecko } from "../classes/CoinGeckoAPI"
import { Account } from "../classes/Account"
import { useRoute } from "vue-router"

const address = ethers.utils.getAddress(useRoute().params.address as string)
const app = inject("app") as typeof Data
const yieldBox = new YieldBox(Network.HARDHAT, DeployedYieldBox.address)
const account = new Account(address) //0x0ed64d01D0B4B655E410EF1441dD677B695639E7

const load = async () => {
    console.log("Load assets")
    await yieldBox.loadAssets()

    console.log("Load yieldBox balances")
    await account?.loadYieldBoxBalances(yieldBox)

    console.log("Load prices")
    const connector = new connectors[app.web3.chainId]()
    await new CoinGecko().getPrices(connector, Object.values(tokens.tokens[connector.chainId]!))
}
load()

watch(
    () => app.web3.nonce,
    () => {
        console.log("Reloading")
        load()
    }
)
</script>

<template>
    <div class="container-xl">
        <h1>YieldBox</h1>
        {{ address }}
        <table class="table">
            <thead>
                <th>Token</th>
                <th>Balance</th>
                <th>Value</th>
            </thead>
            <tbody>
                <tr v-for="asset in account.assets">
                    <td>
                        <template v-if="asset.token">
                            {{ asset.token.symbol }}
                        </template>
                    </td>
                    <td>
                        <TokenAmount :token="asset.token" :amount="account.assetBalance(asset)" />
                    </td>
                    <td>
                        <USDAmount :amount="account.assetValue(asset)" />
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped></style>
