import { Constants } from "./constants"

let constants: Constants = {
    chainId: 1,
    network: {
        chainId: "1",
        chainName: 'Ethereum',
        nativeCurrency:
            {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
            },
        rpcUrls: [],
        blockExplorerUrls: ['https://etherscan.io/'],
    },
    yieldbox: ""
}
export { constants }