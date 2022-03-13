import { ethers, PopulatedTransaction, providers, ContractInterface, utils } from "ethers"
import { Multicall2__factory } from "./types/factories/Multicall2__factory"
import { Multicall2 } from "./types/Multicall2"
import { Network } from "./Network"

interface AddEthereumChainParameter {
    chainId: string // A 0x-prefixed hexadecimal string
    chainName: string
    nativeCurrency: {
        name: string
        symbol: string // 2-6 characters long
        decimals: number
    }
    rpcUrls: string[]
    blockExplorerUrls?: string[]
    iconUrls?: string[] // Currently ignored.
}

type MulticallCallback = (result: any, transaction: PopulatedTransaction) => void
type MulticallFailCallback = (transaction: PopulatedTransaction) => void

type MulticallItem = {
    transactionPromise: Promise<PopulatedTransaction>
    transaction?: PopulatedTransaction
    callback?: MulticallCallback
    failcallback?: MulticallFailCallback
    contractInterface?: utils.Interface
}

export class NetworkConnector {
    provider: providers.Provider
    static get chainId(): Network {
        return Network.NONE
    }
    static get chainName(): string {
        return "None"
    }
    static get nativeCurrency(): { name: string; symbol: string; decimals: number } {
        return { name: "None", symbol: "NONE", decimals: 18 }
    }
    static get rpcUrls(): string[] {
        return []
    }
    static get blockExplorerUrls(): string[] {
        return []
    }
    static get multiCallAddress(): string {
        return ""
    }
    static get chainParams(): AddEthereumChainParameter {
        return {
            chainId: ethers.utils.hexStripZeros(ethers.utils.hexlify(this.chainId)),
            chainName: this.chainName,
            nativeCurrency: this.nativeCurrency,
            rpcUrls: this.rpcUrls,
            blockExplorerUrls: this.blockExplorerUrls,
        }
    }

    static get coinGeckoId(): string {
        return ""
    }

    // Add the static values to each instance
    get type() {
        return this.constructor as typeof NetworkConnector
    }
    get chainId() {
        return this.type.chainId
    }
    get chainName() {
        return this.type.chainName
    }
    get nativeCurrency() {
        return this.type.nativeCurrency
    }
    get rpcUrls() {
        return this.type.rpcUrls
    }
    get blockExplorerUrls() {
        return this.type.blockExplorerUrls
    }
    get multiCallAddress() {
        return this.type.multiCallAddress
    }
    get coinGeckoId() {
        return this.type.coinGeckoId
    }

    constructor(provider?: providers.Provider | null) {
        if (provider) {
            // Use provided provider (for instance injected MetaMask web3)
            this.provider = provider
        } else {
            // or create one using the RPC Url
            this.provider = new providers.StaticJsonRpcProvider({
                url: this.rpcUrls[0],
            })
        }
    }

    items: MulticallItem[] = []

    queue(
        transactionPromise: Promise<PopulatedTransaction>,
        contractInterface?: utils.Interface,
        callback?: MulticallCallback,
        failcallback?: MulticallFailCallback
    ) {
        this.items.push({ transactionPromise, contractInterface, callback, failcallback })
    }

    async call(batchSize: number = 0) {
        const results: any[] = []

        while (this.items.length) {
            const contract = Multicall2__factory.connect(this.multiCallAddress, this.provider)

            const batch = this.items.splice(0, batchSize || this.items.length)
            for (let i in batch) {
                batch[i].transaction = await batch[i].transactionPromise
            }

            const calls: Multicall2.CallStruct[] = batch.map((item) => {
                return {
                    target: item.transaction!.to!,
                    callData: item.transaction!.data!,
                }
            })
            const callResult = await contract.callStatic.tryAggregate(false, calls)
            batch.forEach((item, i) => {
                if (callResult[i].success) {
                    let result: any = callResult[i].returnData
                    if (item.contractInterface) {
                        try {
                            result = item.contractInterface.decodeFunctionResult(
                                item.contractInterface.parseTransaction({ data: item.transaction?.data || "" }).name,
                                callResult[i].returnData
                            )

                            if (item.callback) {
                                item.callback(result.length === 1 ? result[0] : result, item.transaction!)
                            }
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    results.push(result.length === 1 ? result[0] : result)
                } else {
                    if (item.failcallback) {
                        item.failcallback(item.transaction!)
                    }
                    console.log("Fail")
                    results.push(new Error("Failed"))
                }
            })
        }
        return results
    }
}
