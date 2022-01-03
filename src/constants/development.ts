import { Constants } from "./constants"
//import * as PixelDeployment from "../../deployments/localhost/PixelV2.json"
import * as CanvasDeployment from "../../deployments/localhost/Canvas.json"

let constants: Constants = {
    chainId: 31337,
    network: {
        chainId: "0x7A69",
        chainName: 'Hardhat (localhost)',
        nativeCurrency:
            {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
            },
        rpcUrls: ['http://localhost:8545'],
        blockExplorerUrls: ['https://localhost/'],
    },
    pixel: "0x1590ABe3612Be1CB3ab5B0f28874D521576e97Dc",
    canvas: CanvasDeployment.address
}
export { constants }