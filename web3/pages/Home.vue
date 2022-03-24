<script setup lang="ts">
import { ref, inject, watch } from "vue"
import Data from "../data-web3"
import { Network } from "../classes/Network"
import { ethers, BigNumber } from "ethers"
import { Token, tokens } from "../classes/TokenManager"
import { YieldBox, TokenType, Asset } from "../classes/YieldBox"
import DeployedYieldBox from "../../deployments/localhost/YieldBox.json"
import USDAmount from "../components/USDAmount.vue"
import TokenAmount from "../components/TokenAmount.vue"
import { connectors } from "../classes/NetworkConnectors"
import { CoinGecko } from "../classes/CoinGeckoAPI"
import Web3Modal from "../components/Web3Modal.vue"
import TokenAmountInput from "../components/TokenAmountInput.vue"

const app = inject("app") as typeof Data
const tokenAddress = ref("")

const yieldBox = new YieldBox(Network.HARDHAT, DeployedYieldBox.address)

const load = async () => {
    console.log("Load assets")
    await yieldBox.loadAssets()

    console.log("Load balances")
    await app.web3.account?.loadNetworkBalances(app.web3.chainId)
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

const depositToken = ref(null as Token | null)
const depositAmount = ref(null as BigNumber | null)

const addToken = async () => {
    tokens.get(app.web3.chainId, tokenAddress.value)
    tokens.loadInfo()
    load()
}

const deposit = async () => {
    if (depositToken.value && depositAmount.value) {
        const amount = depositAmount.value.eq(-1) ? app.web3.account?.balance(depositToken.value) || 0 : depositAmount.value
        await app.web3.send(
            yieldBox.yieldBox
                .connect(app.web3.provider!.getSigner())
                .deposit(
                    TokenType.ERC20,
                    depositToken.value.address,
                    ethers.constants.AddressZero,
                    0,
                    app.web3.address,
                    app.web3.address,
                    amount,
                    0
                ),
            "Depositing " + depositToken.value.symbol + " into the YieldBox"
        )
    }
}

const withdrawAsset = ref(null as Asset | null)
const withdrawAmount = ref(null as BigNumber | null)

const withdraw = async () => {
    if (withdrawAsset.value && withdrawAmount.value) {
        if (withdrawAmount.value.eq(-1)) {
            const share = await yieldBox.yieldBox.balanceOf(app.web3.address, withdrawAsset.value.assetId)
            await app.web3.send(
                yieldBox.yieldBox
                    .connect(app.web3.provider!.getSigner())
                    .withdraw(withdrawAsset.value.assetId, app.web3.address, app.web3.address, 0, share),
                "Withdrawing all " + withdrawAsset.value.token?.symbol + " from the YieldBox"
            )
        } else {
            await app.web3.send(
                yieldBox.yieldBox
                    .connect(app.web3.provider!.getSigner())
                    .withdraw(withdrawAsset.value.assetId, app.web3.address, app.web3.address, withdrawAmount.value, 0),
                "Withdrawing " + withdrawAsset.value.token?.symbol + " from the YieldBox"
            )
        }
    }
}
</script>

<template>
    <div class="container-xl">
        <div class="row">
            <div class="col-12 col-md-6">
                <h1>Wallet</h1>
                <table class="table">
                    <thead>
                        <th>Token</th>
                        <th>Balance</th>
                        <th>Value</th>
                    </thead>
                    <tbody>
                        <tr v-for="token in app.web3.account?.tokens">
                            <td>{{ token.symbol }}</td>
                            <td>
                                <TokenAmount :token="token" :amount="app.web3.account?.balance(token)" />
                            </td>
                            <td>
                                <USDAmount :amount="app.web3.account?.value(token)" />
                            </td>
                            <td class="text-end">
                                <b-button v-b-modal.modal-deposit @click="depositToken = token">Deposit</b-button>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <b-input-group>
                    <b-form-input v-model="tokenAddress" placeholder="Token Address"></b-form-input>
                    <b-button @click="addToken">Add</b-button>
                </b-input-group>
            </div>
            <div class="col-12 col-md-6">
                <h1>YieldBox</h1>
                <table class="table">
                    <thead>
                        <th>Token</th>
                        <th>Balance</th>
                        <th>Value</th>
                    </thead>
                    <tbody>
                        <tr v-for="asset in app.web3.account?.assets">
                            <td>
                                <template v-if="asset.token">
                                    {{ asset.token.symbol }}
                                </template>
                            </td>
                            <td>
                                <TokenAmount :token="asset.token" :amount="app.web3.account?.assetBalance(asset)" />
                            </td>
                            <td>
                                <USDAmount :amount="app.web3.account?.assetValue(asset)" />
                            </td>
                            <td class="text-end">
                                <b-button v-b-modal.modal-withdraw @click="withdrawAsset = asset">Withdraw</b-button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <Web3Modal
            id="modal-deposit"
            :token="depositToken"
            :spender="yieldBox.yieldBox.address"
            :amount="app.web3.account?.balance(depositToken)"
            @click="deposit"
        >
            <label>Amount:</label>
            <TokenAmountInput v-model="depositAmount" :token="depositToken" :max="app.web3.account?.balance(depositToken)"></TokenAmountInput>
        </Web3Modal>

        <Web3Modal id="modal-withdraw" @click="withdraw">
            <label>Amount:</label>
            <TokenAmountInput
                v-model="withdrawAmount"
                :token="withdrawAsset?.token"
                :max="app.web3.account?.assetBalance(withdrawAsset)"
            ></TokenAmountInput>
        </Web3Modal>
    </div>
</template>

<style scoped></style>
