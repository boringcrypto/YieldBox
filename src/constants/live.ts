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
    pixel: "0x1590ABe3612Be1CB3ab5B0f28874D521576e97Dc",
    canvas: "0x08759550264b7f8078D95EfF8a0577001c833483"
}
export { constants }