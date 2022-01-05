import { Constants } from "./constants"
import * as YieldBoxDeployment from "../../deployments/localhost/YieldBox.json"

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
    yieldbox: YieldBoxDeployment.address
}
export { constants }