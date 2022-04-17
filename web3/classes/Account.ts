import { Network } from "../../sdk/Network"
import { reactive, computed, ComputedRef } from "vue"
import { ethers, BigNumber } from "ethers"
import Web3 from "../../sdk/Web3"
import { connectors } from "../../sdk/NetworkConnectors"
import { IERC20__factory, IUniswapV2Pair__factory } from "./types"
import { NetworkConnector } from "../../sdk/NetworkConnector"
import Decimal from "decimal.js-light"
import { SLPToken, Token, tokens } from "./TokenManager"
import { Asset, TokenType, YieldBox } from "./YieldBox"

export class Account {
    address: string
    balances: { [key: string]: BigNumber } = reactive({})
    tokens: Token[] = reactive([])
    assets: Asset[] = reactive([])

    constructor(address: string) {
        this.address = address
    }

    balance(token: Token | undefined | null) {
        return token && token.address ? this.balances[token.network.toString() + token.address] || BigNumber.from(0) : BigNumber.from(0)
    }

    assetBalance(asset: Asset | undefined | null) {
        return asset ? this.balances[asset.network.toString() + "|" + asset.assetId.toString()] || BigNumber.from(0) : BigNumber.from(0)
    }

    value(token: Token) {
        return token.value(this.balances[token.network.toString() + token.address])
    }

    assetValue(asset: Asset) {
        return asset.token?.value(this.balances[asset.network.toString() + "|" + asset.assetId.toString()]) || new Decimal(0)
    }

    get SLPTokens(): Token[] {
        return this.tokens.filter((token) => token.details instanceof SLPToken)
    }

    async loadNetworkBalances(network: Network) {
        console.log("Getting token balances", network, tokens.tokens[network])
        const connector = new connectors[network]()
        const IERC20 = IERC20__factory.createInterface()
        Object.values(tokens.tokens[network] || []).forEach((token) => {
            connector.queue(
                IERC20__factory.connect(token.address, connector.provider).populateTransaction.balanceOf(this.address),
                IERC20,
                (result) => {
                    const balance = result as BigNumber
                    const key = token.network.toString() + token.address
                    if (!balance.isZero() && !this.balances[key]) {
                        this.tokens.push(token)
                        this.balances[key] = balance
                    } else if (this.balances[key]) {
                        if (balance.isZero() && this.tokens.indexOf(token) !== -1) {
                            this.tokens.splice(this.tokens.indexOf(token), 1)
                        }
                        if (balance.isZero()) {
                            delete this.balances[key]
                        } else {
                            this.balances[key] = balance
                        }
                    }
                }
            )
        })
        await connector.call(100)
    }

    async loadYieldBoxBalances(yieldBox: YieldBox) {
        console.log("Getting yieldBox balances", yieldBox.network)
        const connector = new connectors[yieldBox.network]()
        yieldBox.assets.forEach((asset) => {
            if (asset.tokenType == TokenType.ERC20) {
                connector.queue(
                    yieldBox.yieldBox.populateTransaction.amountOf(this.address, asset.assetId),
                    yieldBox.yieldBox.interface,
                    (result) => {
                        const balance = result as BigNumber
                        const key = yieldBox.network.toString() + "|" + asset.assetId.toString()
                        if (!balance.isZero() && !this.balances[key]) {
                            this.assets.push(asset)
                            this.balances[key] = balance
                        } else if (this.balances[key]) {
                            if (balance.isZero() && this.assets.indexOf(asset) != -1) {
                                this.assets.splice(this.assets.indexOf(asset), 1)
                            }
                            if (balance.isZero()) {
                                delete this.balances[key]
                            } else {
                                this.balances[key] = balance
                            }
                        }
                    }
                )
            }
        })
        await connector.call(100)
    }
}
