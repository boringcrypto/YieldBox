import { Constants } from "./constants"

let constants: Constants = {
    chainId: 80001,
    network: {
        chainId: "0x13881",
        chainName: 'Mumbai (Polygon Testnet)',
        nativeCurrency:
            {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
            },
        rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
        blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
    },
    yieldbox: ""
}
export { constants }