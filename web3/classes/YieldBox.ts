import { Network } from "./Network"
import { reactive, ref } from "vue"
import { ethers, BigNumber } from "ethers"
import Web3 from "./Web3"
import { connectors } from "./NetworkConnectors"
import { NetworkConnector } from "./NetworkConnector"
import Decimal from "decimal.js-light"
import { YieldBox as YieldBoxContract, YieldBox__factory } from "../../typechain-types"
import app from "../data-web3"
import { Token, tokens } from "./TokenManager"
import { TokenType } from "../../sdk"

export { TokenType }

export class Asset {
    network: Network
    assetId: number
    tokenType: TokenType
    contractAddress: string
    strategyAddress: string
    tokenId: BigNumber
    loaded = false
    token?: Token
    name?: string
    symbol?: string

    constructor(network: Network, assetId: number, tokenType: TokenType, contractAddress: string, strategyAddress: string, tokenId: BigNumber) {
        this.network = network
        this.assetId = assetId
        this.tokenType = tokenType
        this.contractAddress = contractAddress
        this.strategyAddress = strategyAddress
        this.tokenId = tokenId
    }
}

export class YieldBox {
    network: Network
    yieldBox: YieldBoxContract
    assets = reactive([] as Asset[])

    constructor(network: Network, address: string) {
        this.network = network
        this.yieldBox = new YieldBox__factory(app.web3.provider!.getSigner()).attach(address)
    }

    async loadAssets() {
        const len = (await this.yieldBox.assetCount()).toNumber()

        const connector = new connectors[app.web3.chainId]()
        for (let i = this.assets.length; i < len; i++) {
            connector.queue(this.yieldBox.populateTransaction.assets(i), this.yieldBox.interface, (result) => {
                const asset = new Asset(this.network, i, result[0], result[1], result[2], result[3])
                this.assets[i] = asset
                if (asset.tokenType == TokenType.ERC20) {
                    asset.token = tokens.get(this.network, asset.contractAddress)
                }
            })
            connector.queue(this.yieldBox.populateTransaction.name(i), this.yieldBox.interface, (result) => (this.assets[i].name = result))
            connector.queue(this.yieldBox.populateTransaction.symbol(i), this.yieldBox.interface, (result) => (this.assets[i].symbol = result))
        }
        await connector.call(100)
        await tokens.loadInfo()
    }
}
