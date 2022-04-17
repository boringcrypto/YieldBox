<script setup lang="ts">
import { ref, Ref, inject, watch, computed, reactive } from "vue"
import Data from "../data-web3"
import { Network } from "../../sdk/Network"
import { ethers, BigNumber } from "ethers"
import { Token, tokens } from "../classes/TokenManager"
import { YieldBox, TokenType, Asset } from "../classes/YieldBox"
import DeployedYieldBox from "../../deployments/localhost/YieldBox.json"
import DeployedSalary from "../../deployments/localhost/Salary.json"
import USDAmount from "../components/USDAmount.vue"
import TokenAmount from "../components/TokenAmount.vue"
import { connectors } from "../../sdk/NetworkConnectors"
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
class Salary {
    salaryId: number
    asset: Asset
    recipient: string
    cliffPercent: number
    cliffDate: Date
    endDate: Date
    amount: BigNumber
    withdrawn: BigNumber
    available: BigNumber

    constructor(
        salaryId: number,
        assetId: BigNumber,
        recipient: string,
        cliffPercent: BigNumber,
        cliffDate: number,
        endDate: number,
        amount: BigNumber,
        withdrawn: BigNumber,
        available: BigNumber
    ) {
        this.salaryId = salaryId
        this.asset = yieldBox.assets[assetId.toNumber()]
        this.recipient = recipient
        this.cliffPercent = cliffPercent.toNumber()
        this.cliffDate = new Date(cliffDate * 1000)
        this.endDate = new Date(endDate * 1000)
        this.amount = amount
        this.withdrawn = withdrawn
        this.available = available
    }

    async withdraw() {
        await app.web3.send(contract.withdraw(this.salaryId, app.web3.address), "Withdraw salary")
    }
}
const salaries: Salary[] = reactive([])
const loadSalaries = async () => {
    console.log("Load salaries")
    if (app.web3.connector) {
        const salaryCount = (await contract.salaryCount()).toNumber()
        for (let i = 0; i < salaryCount; i++) {
            app.web3.connector.queue(
                contract.populateTransaction.info(i),
                contract.interface,
                (info: {
                    recipient: string
                    assetId: BigNumber
                    withdrawnAmount: BigNumber
                    cliffTimestamp: number
                    endTimestamp: number
                    cliffPercent: BigNumber
                    amount: BigNumber
                    availableAmount: BigNumber
                }) => {
                    salaries[i] = new Salary(
                        i,
                        info.assetId,
                        info.recipient,
                        info.cliffPercent,
                        info.cliffTimestamp,
                        info.endTimestamp,
                        info.amount,
                        info.withdrawnAmount,
                        info.availableAmount
                    )
                }
            )
        }
        app.web3.connector.call(100)
    }
}

const load = async () => {
    console.log("Load assets")
    await yieldBox.loadAssets()

    console.log("Load yieldBox balances")
    await app.account?.loadYieldBoxBalances(yieldBox)

    console.log("Load prices")
    const connector = new connectors[app.web3.chainId]()
    await new CoinGecko().getPrices(connector, Object.values(tokens.tokens[connector.chainId]!))

    await loadSalaries()
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
    return app.account?.assets.length || 0 > addAssetId.value ? app.account?.assets[addAssetId.value] : undefined
})
const addAmount = ref(BigNumber.from(0))
const addRecipient = ref("")
const addCliffPercentage = ref(25)
const addCliffDate = ref(new Date(Date.now()).toISOString().split("T")[0])
const addEndDate = ref(new Date(Date.now()).toISOString().split("T")[0])

const add = async () => {
    if (addAsset.value && app.account) {
        await app.web3.send(
            contract.create(
                addRecipient.value,
                addAsset.value.assetId,
                Date.parse(addCliffDate.value) / 1000,
                Date.parse(addEndDate.value) / 1000,
                addCliffPercentage.value,
                addAmount.value.eq(-1) ? app.account?.assetBalance(addAsset.value) : addAmount.value
            ),
            ""
        )
    }
}
</script>

<template>
    <div class="container-xl">
        <h1>Salary</h1>
        <b-card v-for="salary in salaries" :title="salary.asset.name + ' for ' + salary.recipient">
            Total: <TokenAmount :token="salary.asset.token" :amount="salary.amount"></TokenAmount><br />
            Withdrawn: <TokenAmount :token="salary.asset.token" :amount="salary.withdrawn"></TokenAmount><br />
            Available: <TokenAmount :token="salary.asset.token" :amount="salary.available"></TokenAmount><br />
            <Web3Button v-if="salary.recipient === app.web3.address" class="float-end" :network="yieldBox.network" @click="salary.withdraw()"
                >Withdraw</Web3Button
            >
            <Web3Button v-if="salary.recipient === app.web3.address" class="float-end" :network="yieldBox.network" @click="salary.withdraw()"
                >Cancel</Web3Button
            >
        </b-card>
        <b-button v-b-modal.modal-add>New Salary</b-button>
        {{ contract.address }}

        <YieldBoxModal
            title="Create new Salary"
            id="modal-add"
            :yield-box="yieldBox.yieldBox"
            :operator="contract.address"
            :ok-disabled="
                !addAsset ||
                !addAmount ||
                addAmount.isZero() ||
                !ethers.utils.isAddress(addRecipient) ||
                !addCliffDate ||
                (addCliffPercentage < 100 && !addEndDate)
            "
            @click="add"
        >
            <label>Asset:</label>
            <b-form-select v-model="addAssetId">
                <b-form-select-option v-for="(asset, i) in app.account?.assets" :value="i">
                    {{ asset.name }} ({{ asset.symbol }})
                </b-form-select-option>
            </b-form-select>

            <label class="mt-3">Amount:</label>
            <b-form-group
                :description="
                    'Maximum: ' + (app.account?.assetBalance(addAsset).toDisplay(addAsset?.token) || '0') + ' ' + addAsset?.token?.name
                "
            >
                <TokenAmountInput v-model="addAmount" :token="addAsset?.token" :max="app.account?.assetBalance(addAsset)"></TokenAmountInput>
            </b-form-group>

            <label>Recipient:</label>
            <AddressInput v-model="addRecipient" />

            <label class="mt-3">Cliff Percentage ({{ addCliffPercentage }}%)</label>
            <b-form-input v-model="addCliffPercentage" type="range" min="0" max="100" />

            <label class="mt-3">{{ addCliffPercentage > 0 ? "Cliff Date" : "Start Date" }}</label>
            <b-form-input v-model="addCliffDate" type="date" />
            <div v-if="addCliffPercentage != 100">
                <label class="mt-3">End Date</label>
                <b-form-input v-model="addEndDate" type="date" />
            </div>
        </YieldBoxModal>
    </div>
</template>

<style scoped></style>
