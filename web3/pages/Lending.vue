<script setup lang="ts">
import { ref, Ref, inject, watch, computed, reactive } from "vue"
import Data from "../data-web3"
import { Network } from "../classes/Network"
import { ethers, BigNumber } from "ethers"
import { Token, tokens } from "../classes/TokenManager"
import { YieldBox, TokenType, Asset } from "../classes/YieldBox"
import DeployedYieldBox from "../../deployments/localhost/YieldBox.json"
import DeployedSalary from "../../deployments/localhost/Salary.json"
import USDAmount from "../components/USDAmount.vue"
import TokenAmount from "../components/TokenAmount.vue"
import { connectors } from "../classes/NetworkConnectors"
import { CoinGecko } from "../classes/CoinGeckoAPI"
import Web3Modal from "../components/Web3Modal.vue"
import TokenAmountInput from "../components/TokenAmountInput.vue"
import { Salary__factory } from "../../typechain-types"
import AddressInput from "../components/AddressInput.vue"
import YieldBoxModal from "../components/YieldBoxModal.vue"
import Web3Button from "../components/Web3Button.vue"

const app = inject("app") as typeof Data

const yieldBox = new YieldBox(Network.HARDHAT, DeployedYieldBox.address)
const contract = Salary__factory.connect(DeployedSalary.address, app.web3.provider!.getSigner())

const load = async () => {
    console.log("Load assets")
    await yieldBox.loadAssets()

    console.log("Load yieldBox balances")
    await app.web3.account?.loadYieldBoxBalances(yieldBox)

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
        <h1>Lending</h1>
    </div>
</template>

<style scoped></style>
