import { Network } from "../../sdk/Network"
import { reactive, computed, ComputedRef } from "vue"
import { ethers, BigNumber } from "ethers"
import Web3 from "../../sdk/Web3"
import { connectors } from "../../sdk/NetworkConnectors"
import { IERC20__factory, IUniswapV2Pair__factory } from "./types"
import { NetworkConnector } from "../../sdk/NetworkConnector"
import Decimal from "decimal.js-light"
import axios from "axios"
import { TokenList } from "@uniswap/token-lists"

export class Token {
    network: Network
    address: string
    loaded = false

    details: BaseToken

    constructor(network: Network, address: string) {
        this.network = network
        this.address = address
        this.details = new ERC20Token(this)
    }

    get type() {
        return this.details.type
    }

    get name() {
        return this.details.name
    }

    get symbol() {
        return this.details.symbol
    }

    get decimals() {
        return this.details.decimals
    }

    get price() {
        return this.details.price
    }

    value(balance: BigNumber) {
        return this.details.value(balance)
    }
}

class BaseToken {
    token: Token
    type = ""

    constructor(token: Token) {
        this.token = token
    }

    get name() {
        return ""
    }

    get symbol() {
        return ""
    }

    get decimals() {
        return 0
    }

    get price() {
        return new Decimal(0)
    }

    value(balance: BigNumber) {
        return new Decimal(0)
    }
}

export class ERC20Token extends BaseToken {
    type = "ERC20"
    _name = ""
    _symbol = ""
    _decimals = 0
    _price = new Decimal(0)

    get name() {
        return this._name
    }

    set name(value) {
        this._name = value
    }

    get symbol() {
        return this._symbol
    }

    set symbol(value) {
        this._symbol = value
    }

    get decimals() {
        return this._decimals
    }

    set decimals(value) {
        this._decimals = value
    }

    get price() {
        return this._price
    }

    set price(value) {
        this._price = value
    }

    value(balance: BigNumber) {
        if (balance && this.price) {
            return balance.toDec(this.decimals).mul(this.price)
        } else {
            return new Decimal(0)
        }
    }
}

export class SLPToken extends BaseToken {
    type = "SLP"
    token0?: Token
    token1?: Token
    totalSupply?: BigNumber
    reserve0?: BigNumber
    reserve1?: BigNumber

    get name() {
        return this.token0 && this.token1 ? "SushiSwap " + this.token0.symbol + "/" + this.token1.symbol + " LP (SLP)" : "Sushiswap LP Token"
    }

    get symbol() {
        return this.token0 && this.token1 ? this.token0.symbol + "-" + this.token1.symbol + " SLP" : "SLP"
    }

    get decimals() {
        return 18
    }

    balance0(balance: BigNumber) {
        if (this.token0 && this.totalSupply && !this.totalSupply.isZero() && balance && this.reserve0) {
            return balance.mul(this.reserve0).div(this.totalSupply)
        } else {
            return BigNumber.from(0)
        }
    }

    balance1(balance: BigNumber) {
        if (this.token1 && this.totalSupply && !this.totalSupply.isZero() && balance && this.reserve1) {
            return balance.mul(this.reserve1).div(this.totalSupply)
        } else {
            return BigNumber.from(0)
        }
    }

    value0(balance: BigNumber) {
        if (this.token0 && this.token0.price) {
            return this.balance0(balance).toDec(this.token0.decimals).mul(this.token0.price)
        } else {
            return new Decimal(0)
        }
    }

    value1(balance: BigNumber) {
        if (this.token1 && this.token1.price) {
            return this.balance1(balance).toDec(this.token1.decimals).mul(this.token1.price)
        } else {
            return new Decimal(0)
        }
    }

    value(balance: BigNumber) {
        return this.value0(balance).isZero()
            ? this.value1(balance).mul(2)
            : this.value1(balance).isZero()
            ? this.value0(balance).mul(2)
            : this.value0(balance).add(this.value1(balance))
    }
}

class TokenManager {
    tokenList: Token[] = reactive([])
    tokens: { [network in Network]?: { [address: string]: Token } } = reactive({})
    web3?: Web3

    constructor() {
        this.load()
    }

    get(network: Network, address: string) {
        address = ethers.utils.getAddress(address)
        if (!this.tokens[network]) {
            this.tokens[network] = {}
        }
        if (!this.tokens[network]![address]) {
            const token = new Token(network, address)
            this.tokenList.push(token)
            this.tokens[network]![address] = token
        }
        return this.tokens[network]![address]
    }

    async _handleToLoad(
        filter: (token: Token) => boolean,
        handle: (token: Token, connector: NetworkConnector) => void,
        after?: (token: Token) => void,
        toLoad?: Token[]
    ) {
        if (toLoad) {
            toLoad = [...new Set(toLoad)]
        } else {
            toLoad = this.tokenList
        }
        toLoad = toLoad.filter(filter)
        const loadsByNetwork: { [network in Network]?: Token[] } = {}
        toLoad.forEach((token) => {
            if (!loadsByNetwork[token.network]) {
                loadsByNetwork[token.network] = []
            }
            loadsByNetwork[token.network]?.push(token)
        })
        for (const tokensToLoad of Object.values(loadsByNetwork).filter((t) => t.length)) {
            const connector = new connectors[tokensToLoad[0].network]()

            for (const token of tokensToLoad) {
                handle(token, connector)
            }

            await connector.call(100)

            if (after) {
                for (const token of tokensToLoad) {
                    after(token)
                }
            }
        }
    }

    queueERC20(token: Token, connector: NetworkConnector) {
        if (token.loaded) {
            return
        }
        const contract = IERC20__factory.connect(token.address, connector.provider)
        connector.queue(
            contract.populateTransaction.name(),
            IERC20__factory.createInterface(),
            (result) => ((token.details as ERC20Token).name = result),
            () => console.log(connector.chainName, token.address, "Name")
        )
        connector.queue(
            contract.populateTransaction.symbol(),
            IERC20__factory.createInterface(),
            (result) => ((token.details as ERC20Token).symbol = result),
            () => console.log(connector.chainName, token.address, "Symbol")
        )
        connector.queue(
            contract.populateTransaction.decimals(),
            IERC20__factory.createInterface(),
            (result) => {
                ;(token.details as ERC20Token).decimals = result
                if (token.name === "SushiSwap LP Token" && token.symbol === "SLP" && token.decimals === 18) {
                    token.details = new SLPToken(token)
                    this.queueSLP(token, connector)
                    token.loaded = true
                }
            },
            () => console.log(connector.chainName, token.address, "Decimals")
        )
    }

    queueSLP(token: Token, connector: NetworkConnector) {
        if (token.loaded) {
            return
        }
        const pair = IUniswapV2Pair__factory.connect(token.address, connector.provider)
        connector.queue(pair.populateTransaction.token0(), IUniswapV2Pair__factory.createInterface(), (result) => {
            ;(token.details as SLPToken).token0 = this.get(connector.chainId, result)
            this.queueERC20((token.details as SLPToken).token0!, connector)
        })
        connector.queue(pair.populateTransaction.token1(), IUniswapV2Pair__factory.createInterface(), (result) => {
            ;(token.details as SLPToken).token1 = this.get(connector.chainId, result)
            this.queueERC20((token.details as SLPToken).token1!, connector)
            token.loaded = true
        })
    }

    async loadInfo(toLoad?: Token[]) {
        await this._handleToLoad(
            (token) => !token.loaded,
            (token, connector) => {
                if (token.details instanceof SLPToken) {
                    this.queueSLP(token, connector)
                } else {
                    this.queueERC20(token, connector)
                }
            },
            (token) => (token.loaded = true),
            toLoad
        )

        this.save()
    }

    async loadSLPInfo(toLoad?: Token[]) {
        await this._handleToLoad(
            (token) => token.details instanceof SLPToken,
            (token, connector) => {
                const pair = IUniswapV2Pair__factory.connect(token.address, connector.provider)
                connector.queue(pair.populateTransaction.getReserves(), IUniswapV2Pair__factory.createInterface(), (result) => {
                    ;(token.details as SLPToken).reserve0 = result.reserve0
                    ;(token.details as SLPToken).reserve1 = result.reserve1
                })
                connector.queue(
                    pair.populateTransaction.totalSupply(),
                    IUniswapV2Pair__factory.createInterface(),
                    (result) => ((token.details as SLPToken).totalSupply = result)
                )
            },
            undefined,
            toLoad
        )
    }

    async loadTokenList() {
        const response = await axios.get("https://cdn.furucombo.app/furucombo.tokenlist.json")
        if (response.status == 200) {
            const list = response.data as TokenList
            list.tokens.forEach((info) => {
                const token = this.get(info.chainId == 1 ? 31337 : info.chainId, info.address)
                const tokenDetail = new ERC20Token(token)
                tokenDetail.name = info.name
                tokenDetail.symbol = info.symbol
                tokenDetail.decimals = info.decimals
                token.details = tokenDetail
                token.loaded = true
            })
        }
    }

    load() {
        const data = JSON.parse(localStorage.getItem("Tokens") || "[]")
        for (const token of data) {
            const t: Token | SLPToken = this.get(token.network, token.address)
            t.network = token.network
            t.address = token.address
            t.loaded = token.loaded

            if (token.type === "SLP") {
                t.details = new SLPToken(token)
                ;(t.details as SLPToken).token0 = this.get(token.network, token.token0)
                ;(t.details as SLPToken).token1 = this.get(token.network, token.token1)
            } else {
                ;(t.details as ERC20Token).name = token.name
                ;(t.details as ERC20Token).symbol = token.symbol
                ;(t.details as ERC20Token).decimals = token.decimals
            }
        }
    }

    save() {
        localStorage.setItem(
            "Tokens",
            JSON.stringify(
                this.tokenList.map((token) => {
                    if (token.details instanceof SLPToken) {
                        return {
                            type: token.type,
                            network: token.network,
                            address: token.address,
                            loaded: token.loaded,

                            token0: (token.details as SLPToken).token0?.address,
                            token1: (token.details as SLPToken).token1?.address,
                        }
                    } else {
                        return {
                            type: token.type,
                            network: token.network,
                            address: token.address,
                            loaded: token.loaded,

                            name: token.name,
                            symbol: token.symbol,
                            decimals: token.decimals,
                        }
                    }
                })
            )
        )
    }
}

const tokens = new TokenManager()

export { tokens }
