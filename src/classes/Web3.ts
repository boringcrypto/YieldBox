import { ProviderMessage, ProviderRpcError, ProviderConnectInfo } from 'hardhat/types';
import { BigNumber, ethers, providers } from "ethers"
import { computed, ComputedRef, defineComponent, defineCustomElement, markRaw, reactive, ref, Ref, shallowRef } from 'vue';

export interface EthereumEvent {
    connect: ProviderConnectInfo;
    disconnect: ProviderRpcError;
    accountsChanged: Array<string>;
    chainChanged: string;
    message: ProviderMessage
}

type EventKeys = keyof EthereumEvent;
type EventHandler<K extends EventKeys> = (event: EthereumEvent[K]) => void;

export interface Ethereumish {
    autoRefreshOnNetworkChange: boolean;
    chainId: string;
    isMetaMask?: boolean;
    isStatus?: boolean;
    networkVersion: string;
    selectedAddress: any;

    on<K extends EventKeys>(event: K, eventHandler: EventHandler<K>): void;
    enable(): Promise<any>;
    request?: (request: { method: string, params?: Array<any> }) => Promise<any>
}

declare global {
    interface Window {
        ethereum: Ethereumish
    }
}

interface ConnectInfo {
    chainId: string
}

export enum Network {
    NONE = 0,
    ETHEREUM = 1,
    ROPSTEN = 3,
    KOVAN = 42,
    RINKEBY = 4,
    GOERLI = 5,
    BINANCE = 56,
    BINANCE_TEST = 98,
    POLYGON = 137,
    POLYGON_TEST = 80001,
    XDAI = 100,
    HUOBI = 128,
    HUOBI_TEST = 256,
    ARBITRUM_TEST = 421611,
    AVALANCHE = 43114,
    AVALANCHE_TEST = 43113,
    TOMO = 88,
    TOMO_TEST = 89,
    FANTOM = 250,
    FANTOM_TEST = 4002,
    MOONBEAM_KUSAMA = 1285,
    MOONBEAM_TEST = 1287,
    HARDHAT = 31337
}

const nativeETH = { name: 'Ethereum', symbol: 'ETH', decimals: 18 }

type NetworkDefinition = {
    chainName: string
    nativeCurrency: {
        name: string,
        symbol: string,
        decimals: number
    }
    rpcUrls: string[]
    blockExplorerUrls: string[]
    connector: typeof NetworkConnector
}

interface INetworkConnector {
    provider: providers.Provider
}

class NetworkConnector implements INetworkConnector {
    provider: providers.Provider
    get networkChainId(): Network { return Network.NONE }
    get network() { return networks[this.networkChainId] }

    constructor(provider: providers.Provider | null) {
        if (provider) {
            // Use provided provider (for instance injected MetaMask web3)
            this.provider = provider
        } else {
            // or create one using the RPC Url
            this.provider = new providers.JsonRpcProvider(this.network.rpcUrls[0])
        }
    }
}

class EthereumConnector extends NetworkConnector {
    get networkChainId() { return Network.ETHEREUM }
}

const networks: { [network: string]: NetworkDefinition } = {
    [Network.NONE]: {
        chainName: 'None',
        nativeCurrency: nativeETH,
        rpcUrls: [],
        blockExplorerUrls: [],
        connector: EthereumConnector
    },
    [Network.ETHEREUM]: {
        chainName: 'Ethereum',
        nativeCurrency: nativeETH,
        rpcUrls: ['https://mainnet.infura.io/v3/845b3e08e20a41f185f36a2b73cfa5e4'],
        blockExplorerUrls: ['https://etherscan.io/'],
        connector: EthereumConnector
    },
    [Network.ROPSTEN]: {
        chainName: 'Ropsten',
        nativeCurrency: nativeETH,
        rpcUrls: [],
        blockExplorerUrls: ['https://ropsten.etherscan.io/'],
        connector: EthereumConnector
    },
    [Network.KOVAN]: {
        chainName: 'Kovan',
        nativeCurrency: nativeETH,
        rpcUrls: [],
        blockExplorerUrls: ['https://kovan.etherscan.io/'],
        connector: EthereumConnector
    },
    [Network.RINKEBY]: {
        chainName: 'Rinkeby',
        nativeCurrency: nativeETH,
        rpcUrls: [],
        blockExplorerUrls: ['https://rinkeby.etherscan.io/'],
        connector: EthereumConnector
    },
    [Network.GOERLI]: {
        chainName: 'Goerli',
        nativeCurrency: nativeETH,
        rpcUrls: [],
        blockExplorerUrls: ['https://goerli.etherscan.io/'],
        connector: EthereumConnector
    },
    [Network.BINANCE]: {
        chainName: 'Binance Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com'],
        connector: EthereumConnector
    },
    [Network.BINANCE_TEST]: {
        chainName: 'Binance Smart Chain - Testnet',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
        blockExplorerUrls: ['https://testnet.bscscan.com'],
        connector: EthereumConnector
    },
    [Network.POLYGON]: {
        chainName: 'Matic',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://matic-mainnet.chainstacklabs.com', 'https://rpc-mainnet.matic.network', 'https://rpc-mainnet.maticvigil.com', 'https://rpc-mainnet.matic.quiknode.pro', 'https://matic-mainnet-full-rpc.bwarelabs.com', 'https://matic-mainnet-archive-rpc.bwarelabs.com'],
        blockExplorerUrls: ['https://polygonscan.com/', 'https://polygon-explorer-mainnet.chainstacklabs.com', 'https://explorer-mainnet.maticvigil.com', 'https://explorer.matic.network', 'https://backup-explorer.matic.network'],
        connector: EthereumConnector
    },
    [Network.POLYGON_TEST]: {
        chainName: 'Mumbai',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://matic-mumbai.chainstacklabs.com', 'https://rpc-mumbai.matic.today', 'https://rpc-mumbai.maticvigil.com', 'https://matic-testnet-archive-rpc.bwarelabs.com'],
        blockExplorerUrls: ['https://mumbai.polygonscan.com/', 'https://polygon-explorer-mumbai.chainstacklabs.com', 'https://explorer-mumbai.maticvigil.com', 'https://mumbai-explorer.matic.today', 'https://backup-mumbai-explorer.matic.today'],
        connector: EthereumConnector
    },
    [Network.XDAI]: {
        chainName: 'xDai',
        nativeCurrency: { name: 'xDai', symbol: 'xDAI', decimals: 18 },
        rpcUrls: ['https://rpc.xdaichain.com/'],
        blockExplorerUrls: ['https://blockscout.com/xdai/mainnet'],
        connector: EthereumConnector
    },
    [Network.HUOBI]: {
        chainName: 'Heco',
        nativeCurrency: { name: 'HT', symbol: 'HT', decimals: 18 },
        rpcUrls: ['https://http-mainnet-node.huobichain.com'],
        blockExplorerUrls: ['https://www.hecochain.io/', 'https://hecoinfo.com'],
        connector: EthereumConnector       
    },
    [Network.HUOBI_TEST]: {
        chainName: 'Heco - Testnet',
        nativeCurrency: { name: 'HT', symbol: 'HT', decimals: 18 },
        rpcUrls: ['https://http-testnet.hecochain.com'],
        blockExplorerUrls: ['https://scan-testnet.hecochain.com'],
        connector: EthereumConnector        
    },
    [Network.ARBITRUM_TEST]: {
        chainName: 'Arbitrum Testnet',
        nativeCurrency: nativeETH,
        rpcUrls: ['https://rinkeby.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://rinkeby-explorer.arbitrum.io/#/'],
        connector: EthereumConnector        
    },
    [Network.AVALANCHE]: {
        chainName: 'Avalanche Mainnet C-Chain',
        nativeCurrency: {
            name: 'Avalanche',
            symbol: 'AVAX',
            decimals: 18
        },
        rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
        blockExplorerUrls: ['https://cchain.explorer.avax.network/'],
        connector: EthereumConnector
    },
    [Network.AVALANCHE_TEST]: {
        chainName: 'Avalanche Testnet C-Chain',
        nativeCurrency: {
            name: 'Avalanche',
            symbol: 'AVAX',
            decimals: 18
        },
        rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
        blockExplorerUrls: ['https://cchain.explorer.avax-test.network/'],
        connector: EthereumConnector
    },
    [Network.TOMO]: {
        chainName: 'TomoChain',
        nativeCurrency: { name: 'TOMO', symbol: 'TOMO', decimals: 18 },
        rpcUrls: ['https://rpc.tomochain.com'],
        blockExplorerUrls: ['https://scan.tomochain.com'],
        connector: EthereumConnector        
    },
    [Network.TOMO_TEST]: {
        chainName: 'TomoChain Testnet',
        nativeCurrency: { name: 'TOMO', symbol: 'TOMO', decimals: 18 },
        rpcUrls: ['https://rpc.testnet.tomochain.com'],
        blockExplorerUrls: ['https://scan.testnet.tomochain.com'],
        connector: EthereumConnector        
    },
    [Network.FANTOM]: {
        chainName: 'Fantom Opera',
        nativeCurrency: { name: 'FTM', symbol: 'FTM', decimals: 18 },
        rpcUrls: ['https://rpcapi.fantom.network', 'https://rpc.ftm.tools/'],
        blockExplorerUrls: ['https://ftmscan.com/'],
        connector: EthereumConnector        
    },
    [Network.FANTOM_TEST]: {
        chainName: 'Fantom Testnet',
        nativeCurrency: { name: 'FTM', symbol: 'FTM', decimals: 18 },
        rpcUrls: ['https://rpc.testnet.fantom.network/'],
        blockExplorerUrls: [''],
        connector: EthereumConnector        
    },
    [Network.MOONBEAM_KUSAMA]: {
        chainName: 'Moonriver',
        nativeCurrency: { name: 'MOVR', symbol: 'MOVR', decimals: 18 },
        rpcUrls: ['https://rpc.moonriver.moonbeam.network'],
        blockExplorerUrls: ['https://blockscout.moonriver.moonbeam.network/'],
        connector: EthereumConnector        
    },
    [Network.MOONBEAM_TEST]: {
        chainName: 'Moonbase Alpha',
        nativeCurrency: { name: 'DEV', symbol: 'DEV', decimals: 18 },
        rpcUrls: ['https://rpc.testnet.moonbeam.network'],
        blockExplorerUrls: ['https://moonbase-blockscout.testnet.moonbeam.network/'],
        connector: EthereumConnector        
    },
    [Network.HARDHAT]: {
        chainName: 'Hardhat',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['http://127.0.0.1:8545/'],
        blockExplorerUrls: [''],
        connector: EthereumConnector        
    },
}

export default class Web3 {
        name = "Loading..."
        connected = false
        chainId = Network.NONE
        address = ""
        addresses = [] as string[]
        block = 0
        provider = null as ethers.providers.JsonRpcProvider | null
        networks = networks
        update?: ComputedRef<string>
        network?: ComputedRef<NetworkDefinition>
        connect() {
            if (this.connected && window.ethereum.request) {
                window.ethereum.request({method:'eth_requestAccounts'})
            }
        }
        switch(chain: Network) {
            if (window.ethereum && window.ethereum.request) {
                window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{chainId: ethers.utils.hexStripZeros(ethers.utils.hexlify(chain))}]})
                    .catch((error: ProviderRpcError) => {
                        console.log(error)
                        if (error.code == 4902 && window.ethereum && window.ethereum.request) {
                            window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [Object.assign(networks[chain], { chainId: ethers.utils.hexStripZeros(ethers.utils.hexlify(chain)) })]
                            })
                        }
                    })
            }
        }
        setup() {
            this.update = computed(() => this.chainId + this.block + this.address)
            this.network = computed(() => networks[this.chainId])
            if (window.ethereum && window.ethereum.request) {
                this.provider = markRaw(new ethers.providers.Web3Provider(window.ethereum))
                if (window.ethereum.isMetaMask) {
                    this.name = "MetaMask"
                } else {
                    this.name = "Other"
                }
    
                window.ethereum.autoRefreshOnNetworkChange = false
                const handleBlock = (blockNumber: number) => {
                    this.block = blockNumber
                }
                const handleChainChanged = (newChainId: string) => {
                    this.chainId = Number(BigNumber.from(newChainId))
                    this.connected = true
                    this.provider?.off("block")
                    this.provider = markRaw(new ethers.providers.Web3Provider(window.ethereum))
                    this.provider.on("block", handleBlock)
                }
                const handleConnect = (info: ConnectInfo) => {
                    handleChainChanged(info.chainId)
                }
                const handleAccountsChanged = (newAddresses: string[] | undefined) => {
                    this.addresses = newAddresses || []
                    if (newAddresses && newAddresses.length) {
                        this.address = newAddresses[0]
                    } else {
                        this.address = ""
                    }
                }
        
                window.ethereum.on("accountsChanged", handleAccountsChanged)
                window.ethereum.on("chainChanged", handleChainChanged)
                window.ethereum.on("connect", handleConnect)
                window.ethereum.on("disconnect", (error: ProviderRpcError) => {
                    this.connected = false
                    this.block = 0
                })
                this.provider.on("block", handleBlock)
    
                window.ethereum.request({method: "eth_accounts"})
                    .then((addresses: string[]) => {
                        handleAccountsChanged(addresses)
                        handleConnect({chainId:window.ethereum.chainId})
                    })
                    .catch((error: ProviderRpcError) => {
                        console.log("Error", error)
                    })
            } else {
                this.name = "None"
            }
        }
        async getNativeBalance() {
            if (this.provider && this.address) {
                return await this.provider.getBalance(this.address)
            }
            return BigNumber.from(0)
        }
}
