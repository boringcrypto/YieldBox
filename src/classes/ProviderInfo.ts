import { ethers } from "ethers";

export type ProviderInfo = {
    name: string
    connected: boolean
    chainId: number
    addresses: string[]
    address: string
    block: number
}

