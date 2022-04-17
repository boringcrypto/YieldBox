import { Network } from "./Network"
import { NetworkConnector } from "./NetworkConnector"

class EthereumConnector extends NetworkConnector {
    static get chainId() {
        return Network.ETHEREUM
    }
    static get chainName() {
        return "Ethereum"
    }
    static get nativeCurrency() {
        return { name: "Ethereum", symbol: "ETH", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://mainnet.infura.io/v3/845b3e08e20a41f185f36a2b73cfa5e4"]
    }
    static get blockExplorerUrls() {
        return ["https://etherscan.io/"]
    }
    static get multiCallAddress() {
        return "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696"
    }
    static get coinGeckoId() {
        return "ethereum"
    }
}

class RopstenConnector extends EthereumConnector {
    static get chainId() {
        return Network.ROPSTEN
    }
    static get chainName() {
        return "Ropsten"
    }
    static get rpcUrls() {
        return ["https://ropsten.infura.io/v3/845b3e08e20a41f185f36a2b73cfa5e4"]
    }
    static get blockExplorerUrls() {
        return ["https://ropsten.etherscan.io/"]
    }
    static get coinGeckoId() {
        return "ethereum"
    }
}

class KovanConnector extends EthereumConnector {
    static get chainId() {
        return Network.KOVAN
    }
    static get chainName() {
        return "Kovan"
    }
    static get rpcUrls() {
        return ["https://kovan.infura.io/v3/845b3e08e20a41f185f36a2b73cfa5e4"]
    }
    static get blockExplorerUrls() {
        return ["https://kovan.etherscan.io/"]
    }
}

class RinkebyConnector extends EthereumConnector {
    static get chainId() {
        return Network.RINKEBY
    }
    static get chainName() {
        return "Rinkeby"
    }
    static get rpcUrls() {
        return ["https://rinkeby.infura.io/v3/845b3e08e20a41f185f36a2b73cfa5e4"]
    }
    static get blockExplorerUrls() {
        return ["https://rinkeby.etherscan.io/"]
    }
}

class GoerliConnector extends EthereumConnector {
    static get chainId() {
        return Network.GOERLI
    }
    static get chainName() {
        return "Görli"
    }
    static get rpcUrls() {
        return ["https://goerli.infura.io/v3/845b3e08e20a41f185f36a2b73cfa5e4"]
    }
    static get blockExplorerUrls() {
        return ["https://goerli.etherscan.io/"]
    }
}

class BinanceConnector extends NetworkConnector {
    static get chainId() {
        return Network.BINANCE
    }
    static get chainName() {
        return "Binance Smart Chain"
    }
    static get nativeCurrency() {
        return { name: "BNB", symbol: "BNB", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://bsc-dataseed.binance.org/"]
    }
    static get blockExplorerUrls() {
        return ["https://bscscan.com/"]
    }
    static get multiCallAddress() {
        return "0xa9193376D09C7f31283C54e56D013fCF370Cd9D9"
    }
    static get coinGeckoId() {
        return "binance-smart-chain"
    }
}

class BinanceTestConnector extends BinanceConnector {
    static get chainId() {
        return Network.BINANCE_TEST
    }
    static get chainName() {
        return "Binance Smart Chain Testnet"
    }
    static get rpcUrls() {
        return ["https://data-seed-prebsc-1-s1.binance.org:8545/"]
    }
    static get blockExplorerUrls() {
        return ["https://testnet.bscscan.com/"]
    }
    static get multiCallAddress() {
        return ""
    }
}

class FuseConnector extends NetworkConnector {
    static get chainId() {
        return Network.FUSE
    }
    static get chainName() {
        return "Fuse"
    }
    static get nativeCurrency() {
        return { name: "Fuse", symbol: "FUSE", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://rpc.fuse.io/"]
    }
    static get blockExplorerUrls() {
        return ["https://explorer.fuse.io/"]
    }
    static get multiCallAddress() {
        return "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"
    }
    static get coinGeckoId() {
        return "fuse"
    }
}

class PolygonConnector extends NetworkConnector {
    static get chainId() {
        return Network.POLYGON
    }
    static get chainName() {
        return "Polygon"
    }
    static get nativeCurrency() {
        return { name: "MATIC", symbol: "MATIC", decimals: 18 }
    }
    static get rpcUrls() {
        return [
            "https://matic-mainnet.chainstacklabs.com/",
            "https://rpc-mainnet.matic.network/",
            "https://rpc-mainnet.maticvigil.com/",
            "https://rpc-mainnet.matic.quiknode.pro/",
            "https://matic-mainnet-full-rpc.bwarelabs.com/",
            "https://matic-mainnet-archive-rpc.bwarelabs.com/",
        ]
    }
    static get blockExplorerUrls() {
        return [
            "https://polygonscan.com/",
            "https://polygon-explorer-mainnet.chainstacklabs.com/",
            "https://explorer-mainnet.maticvigil.com/",
            "https://explorer.matic.network/",
            "https://backup-explorer.matic.network/",
        ]
    }
    static get multiCallAddress() {
        return "0x02817C1e3543c2d908a590F5dB6bc97f933dB4BD"
    }
    static get coinGeckoId() {
        return "polygon-pos"
    }
}

class PolygonTestConnector extends PolygonConnector {
    static get chainId() {
        return Network.POLYGON_TEST
    }
    static get chainName() {
        return "Mumbai (Polygon Testnet)"
    }
    static get rpcUrls() {
        return [
            "https://matic-mumbai.chainstacklabs.com/",
            "https://rpc-mumbai.matic.today/",
            "https://rpc-mumbai.maticvigil.com/",
            "https://matic-testnet-archive-rpc.bwarelabs.com/",
        ]
    }
    static get blockExplorerUrls() {
        return [
            "https://mumbai.polygonscan.com/",
            "https://polygon-explorer-mumbai.chainstacklabs.com/",
            "https://explorer-mumbai.maticvigil.com/",
            "https://mumbai-explorer.matic.today/",
            "https://backup-mumbai-explorer.matic.today/",
        ]
    }
    static get multiCallAddress() {
        return "0xc1400d49baa8e307B4462cD46E0a20109D25F50f"
    }
}

class GnosisConnector extends NetworkConnector {
    static get chainId() {
        return Network.XDAI
    }
    static get chainName() {
        return "Gnosis (xDai)"
    }
    static get nativeCurrency() {
        return { name: "xDai", symbol: "xDAI", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://rpc.gnosischain.com/"]
    }
    static get blockExplorerUrls() {
        return ["https://blockscout.com/xdai/mainnet/"]
    }
    static get multiCallAddress() {
        return "0x67dA5f2FfaDDfF067AB9d5F025F8810634d84287"
    }
    static get coinGeckoId() {
        return "xdai"
    }
}

class HuobiConnector extends NetworkConnector {
    static get chainId() {
        return Network.HUOBI
    }
    static get chainName() {
        return "Heco"
    }
    static get nativeCurrency() {
        return { name: "HT", symbol: "HT", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://http-mainnet-node.huobichain.com/"]
    }
    static get blockExplorerUrls() {
        return ["https://www.hecochain.io/", "https://hecoinfo.com/"]
    }
    static get multiCallAddress() {
        return "0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3"
    }
    static get coinGeckoId() {
        return "huobi-token"
    }
}

class HuobiTestConnector extends HuobiConnector {
    static get chainId() {
        return Network.HUOBI_TEST
    }
    static get chainName() {
        return "Heco Testnet"
    }
    static get rpcUrls() {
        return ["https://http-testnet.hecochain.com/"]
    }
    static get blockExplorerUrls() {
        return ["https://scan-testnet.hecochain.com/"]
    }
    static get multiCallAddress() {
        return ""
    }
}

class ArbitrumConnector extends EthereumConnector {
    static get chainId() {
        return Network.ARBITRUM
    }
    static get chainName() {
        return "Arbitrum"
    }
    static get rpcUrls() {
        return ["https://arb1.arbitrum.io/rpc/"]
    }
    static get blockExplorerUrls() {
        return ["https://arbiscan.io/"]
    }
    static get multiCallAddress() {
        return "0x80C7DD17B01855a6D2347444a0FCC36136a314de"
    }
    static get coinGeckoId() {
        return "arbitrum-one"
    }
}

class ArbitrumTestConnector extends ArbitrumConnector {
    static get chainId() {
        return Network.ARBITRUM_TEST
    }
    static get chainName() {
        return "Arbitrum Testnet"
    }
    static get rpcUrls() {
        return ["https://rinkeby.arbitrum.io/rpc/"]
    }
    static get blockExplorerUrls() {
        return ["https://rinkeby-explorer.arbitrum.io/"]
    }
    static get multiCallAddress() {
        return "0xa501c031958F579dB7676fF1CE78AD305794d579"
    }
}

class AvalancheConnector extends NetworkConnector {
    static get chainId() {
        return Network.AVALANCHE
    }
    static get chainName() {
        return "Avalanche Mainnet C-Chain"
    }
    static get nativeCurrency() {
        return { name: "Avalanche", symbol: "AVAX", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://api.avax.network/ext/bc/C/rpc"]
    }
    static get blockExplorerUrls() {
        return ["https://cchain.explorer.avax.network/"]
    }
    static get multiCallAddress() {
        return "0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3"
    }
    static get coinGeckoId() {
        return "avalanche"
    }
}

class AvalancheTestConnector extends AvalancheConnector {
    static get chainId() {
        return Network.AVALANCHE_TEST
    }
    static get chainName() {
        return "Avalanche Testnet C-Chain"
    }
    static get rpcUrls() {
        return ["https://api.avax-test.network/ext/bc/C/rpc/"]
    }
    static get blockExplorerUrls() {
        return ["https://cchain.explorer.avax-test.network/"]
    }
    static get multiCallAddress() {
        return ""
    }
}

class TomoConnector extends NetworkConnector {
    static get chainId() {
        return Network.TOMO
    }
    static get chainName() {
        return "TomoChain"
    }
    static get nativeCurrency() {
        return { name: "TOMO", symbol: "TOMO", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://rpc.tomochain.com/"]
    }
    static get blockExplorerUrls() {
        return ["https://scan.tomochain.com/"]
    }
    static get coinGeckoId() {
        return "tomochain"
    }
}

class TomoTestConnector extends TomoConnector {
    static get chainId() {
        return Network.TOMO_TEST
    }
    static get chainName() {
        return "TomoChain Testnet"
    }
    static get rpcUrls() {
        return ["https://rpc.testnet.tomochain.com/"]
    }
    static get blockExplorerUrls() {
        return ["https://scan.testnet.tomochain.com/"]
    }
}

class FantomConnector extends NetworkConnector {
    static get chainId() {
        return Network.FANTOM
    }
    static get chainName() {
        return "Fantom Opera"
    }
    static get nativeCurrency() {
        return { name: "FTM", symbol: "FTM", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://rpc.ftm.tools/"]
    }
    static get blockExplorerUrls() {
        return ["https://ftmscan.com/"]
    }
    static get multiCallAddress() {
        return "0x22D4cF72C45F8198CfbF4B568dBdB5A85e8DC0B5"
    }
    static get coinGeckoId() {
        return "fantom"
    }
}

class FantomTestConnector extends FantomConnector {
    static get chainId() {
        return Network.FANTOM
    }
    static get chainName() {
        return "Fantom Testnet"
    }
    static get rpcUrls() {
        return ["https://rpc.testnet.fantom.network/"]
    }
    static get blockExplorerUrls() {
        return []
    }
    static get multiCallAddress() {
        return ""
    }
}

class MoonbeamConnector extends NetworkConnector {
    static get chainId() {
        return Network.MOONBEAM
    }
    static get chainName() {
        return "Moonbeam"
    }
    static get nativeCurrency() {
        return { name: "Moonbeam", symbol: "GLMR", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://rpc.api.moonbeam.network"]
    }
    static get blockExplorerUrls() {
        return ["https://moonscan.io/"]
    }
    static get multiCallAddress() {
        return "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"
    }
}

class MoonbeamTestConnector extends NetworkConnector {
    static get chainId() {
        return Network.MOONBEAM_TEST
    }
    static get chainName() {
        return "Moonbase Alpha"
    }
    static get nativeCurrency() {
        return { name: "DEV", symbol: "DEV", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://rpc.api.moonbase.moonbeam.network"]
    }
    static get blockExplorerUrls() {
        return ["https://moonbase-blockscout.testnet.moonbeam.network/"]
    }
}

class MoonbeamKusamaConnector extends NetworkConnector {
    static get chainId() {
        return Network.MOONBEAM_KUSAMA
    }
    static get chainName() {
        return "Moonriver"
    }
    static get nativeCurrency() {
        return { name: "MOVR", symbol: "MOVR", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://rpc.api.moonriver.moonbeam.network"]
    }
    static get blockExplorerUrls() {
        return ["https://blockscout.moonriver.moonbeam.network/"]
    }
    static get multiCallAddress() {
        return "0x270f2F35bED92B7A59eA5F08F6B3fd34c8D9D9b5"
    }
    static get coinGeckoId() {
        return "moonriver"
    }
}

class HardhatConnector extends EthereumConnector {
    static get chainId() {
        return Network.HARDHAT
    }
    static get chainName() {
        return "Hardhat"
    }
    static get rpcUrls() {
        return ["http://127.0.0.1:8545/"]
    }
    static get blockExplorerUrls() {
        return ["https://localhost:2504/"]
    }
}

class CeloConnector extends NetworkConnector {
    static get chainId() {
        return Network.CELO
    }
    static get chainName() {
        return "Celo"
    }
    static get nativeCurrency() {
        return { name: "Celo", symbol: "CELO", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://forno.celo.org"]
    }
    static get blockExplorerUrls() {
        return ["https://explorer.celo.org/"]
    }
    static get multiCallAddress() {
        return "0x9aac9048fC8139667D6a2597B902865bfdc225d3"
    }
    static get coinGeckoId() {
        return "celo"
    }
}

class HarmonyConnector extends NetworkConnector {
    static get chainId() {
        return Network.HARMONY
    }
    static get chainName() {
        return "Harmony"
    }
    static get nativeCurrency() {
        return { name: "Harmony", symbol: "ONE", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://api.harmony.one"]
    }
    static get blockExplorerUrls() {
        return ["https://explorer.harmony.one/"]
    }
    static get multiCallAddress() {
        return "0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3"
    }
}

class HarmonyTestConnector extends HarmonyConnector {
    static get chainId() {
        return Network.HARMONY_TEST
    }
    static get chainName() {
        return "Harmony Testnet"
    }
    static get rpcUrls() {
        return ["https://api.s0.b.hmny.io/"]
    }
    static get blockExplorerUrls() {
        return ["https://explorer.pops.one/"]
    }
    static get multiCallAddress() {
        return ""
    }
}

class OKExConnector extends NetworkConnector {
    static get chainId() {
        return Network.OKEX
    }
    static get chainName() {
        return "OKExChain"
    }
    static get nativeCurrency() {
        return { name: "OEC Token", symbol: "OKT", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://exchainrpc.okex.org/"]
    }
    static get blockExplorerUrls() {
        return ["https://www.oklink.com/oec/"]
    }
    static get multiCallAddress() {
        return "0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3"
    }
    static get coinGeckoId() {
        return "okex-chain"
    }
}

class OKExTestConnector extends OKExConnector {
    static get chainId() {
        return Network.OKEX_TEST
    }
    static get chainName() {
        return "OKExChain Testnet"
    }
    static get rpcUrls() {
        return ["https://exchaintestrpc.okex.org/"]
    }
    static get blockExplorerUrls() {
        return ["https://www.oklink.com/oec-test/"]
    }
    static get multiCallAddress() {
        return ""
    }
}

class PalmConnector extends NetworkConnector {
    static get chainId() {
        return Network.PALM
    }
    static get chainName() {
        return "Palm"
    }
    static get nativeCurrency() {
        return { name: "Palm", symbol: "PALM", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://palm-mainnet.infura.io/v3/3a961d6501e54add9a41aa53f15de99b"]
    }
    static get blockExplorerUrls() {
        return ["https://explorer.palm.io/"]
    }
    static get multiCallAddress() {
        return "0x0769fd68dFb93167989C6f7254cd0D766Fb2841F"
    }
}

class TelosConnector extends NetworkConnector {
    static get chainId() {
        return Network.TELOS
    }
    static get chainName() {
        return "Telos"
    }
    static get nativeCurrency() {
        return { name: "Telos", symbol: "TLOS", decimals: 18 }
    }
    static get rpcUrls() {
        return ["https://mainnet.telos.net/evm"]
    }
    static get blockExplorerUrls() {
        return ["https://rpc1.us.telos.net/v2/explore/"]
    }
    static get multiCallAddress() {
        return "0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3"
    }
}

export const connectors: { [network: string]: typeof NetworkConnector } = {
    [Network.NONE]: NetworkConnector,
    [Network.ETHEREUM]: EthereumConnector,
    [Network.ROPSTEN]: RopstenConnector,
    [Network.KOVAN]: KovanConnector,
    [Network.RINKEBY]: RinkebyConnector,
    [Network.GOERLI]: GoerliConnector,
    [Network.BINANCE]: BinanceConnector,
    [Network.BINANCE_TEST]: BinanceTestConnector,
    [Network.FUSE]: FuseConnector,
    [Network.POLYGON]: PolygonConnector,
    [Network.POLYGON_TEST]: PolygonTestConnector,
    [Network.XDAI]: GnosisConnector,
    [Network.HUOBI]: HuobiConnector,
    [Network.HUOBI_TEST]: HuobiTestConnector,
    [Network.ARBITRUM]: ArbitrumConnector,
    [Network.ARBITRUM_TEST]: ArbitrumTestConnector,
    [Network.AVALANCHE]: AvalancheConnector,
    [Network.AVALANCHE_TEST]: AvalancheTestConnector,
    [Network.TOMO]: TomoConnector,
    [Network.TOMO_TEST]: TomoTestConnector,
    [Network.FANTOM]: FantomConnector,
    [Network.FANTOM_TEST]: FantomTestConnector,
    [Network.MOONBEAM]: MoonbeamConnector,
    [Network.MOONBEAM_TEST]: MoonbeamTestConnector,
    [Network.MOONBEAM_KUSAMA]: MoonbeamKusamaConnector,
    [Network.HARDHAT]: HardhatConnector,
    [Network.CELO]: CeloConnector,
    [Network.HARMONY]: HarmonyConnector,
    [Network.HARMONY_TEST]: HarmonyTestConnector,
    [Network.OKEX]: OKExConnector,
    [Network.OKEX_TEST]: OKExTestConnector,
    [Network.PALM]: PalmConnector,
    [Network.TELOS]: TelosConnector,
}
