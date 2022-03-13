<script setup lang="ts">
import { ref, Ref, inject, watch, computed } from "vue"
import Data from "../data"
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

const app = inject("app") as typeof Data
const tokenAddress = ref("")

const yieldBox = new YieldBox(Network.HARDHAT, DeployedYieldBox.address)
const salary = Salary__factory.connect(DeployedSalary.address, app.web3.provider!.getSigner())

const loadSalaries = async () => {
    if (app.web3.connector) {
        app.web3.connector.queue
    }
}

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

const addAssetId = ref(0)
const addAsset = computed(() => {
    return app.web3.account?.assets.length || 0 > addAssetId.value ? app.web3.account?.assets[addAssetId.value] : undefined
})
const addAmount = ref(BigNumber.from(0))
const addRecipient = ref("")
const addCliffPercentage = ref(25)
const addCliffDate = ref(new Date(Date.now()).toISOString().split("T")[0])
const addEndDate = ref(new Date(Date.now()).toISOString().split("T")[0])

const add = async () => {
    if (addAsset.value && app.web3.account) {
        await app.web3.send(
            salary.create(
                addRecipient.value,
                addAsset.value.assetId,
                Date.parse(addCliffDate.value) / 1000,
                Date.parse(addEndDate.value) / 1000,
                addCliffPercentage.value,
                addAmount.value.eq(-1) ? app.web3.account?.assetBalance(addAsset.value) : addAmount.value
            ),
            ""
        )
    }
}
</script>

<template>
    <div class="container-xl">
        <h1>Salary</h1>
        <b-button v-b-modal.modal-add>New Salary</b-button>

        <YieldBoxModal
            title="Create new Salary"
            id="modal-add"
            :yield-box="yieldBox.yieldBox"
            :operator="salary.address"
            :ok-disabled="!addAsset || addAmount.isZero() || !ethers.utils.isAddress(addRecipient) || !addCliffDate || !addEndDate"
            @click="add"
        >
            <label>Asset:</label>
            <b-form-select v-model="addAssetId">
                <b-form-select-option v-for="(asset, i) in app.web3.account?.assets" :value="i">
                    {{ asset.name }} ({{ asset.symbol }})
                </b-form-select-option>
            </b-form-select>

            <label class="mt-3">Amount:</label>
            <b-form-group
                :description="
                    'Maximum: ' + (app.web3.account?.assetBalance(addAsset).toDisplay(addAsset?.token) || '0') + ' ' + addAsset?.token?.name
                "
            >
                <TokenAmountInput
                    v-model="addAmount"
                    :token="addAsset?.token"
                    :max="app.web3.account?.assetBalance(addAsset)"
                ></TokenAmountInput>
            </b-form-group>

            <label>Recipient:</label>
            <AddressInput v-model="addRecipient" />

            <label class="mt-3">Cliff Percentage ({{ addCliffPercentage }}%)</label>
            <b-form-input v-model="addCliffPercentage" type="range" min="0" max="100" />

            <label class="mt-3">Cliff Date</label>
            <b-form-input v-model="addCliffDate" type="date" />

            <label class="mt-3">End Date</label>
            <b-form-input v-model="addEndDate" type="date" />
        </YieldBoxModal>
    </div>
</template>

<style scoped></style>
