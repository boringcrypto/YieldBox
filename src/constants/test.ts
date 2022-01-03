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
    pixel: "0x390d01b1437029C0CD21586B9Bfe3C0fDBAf8c66",
    canvas: ""
}
export { constants }