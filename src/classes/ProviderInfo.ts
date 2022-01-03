import { ethers } from "ethers";

export type ProviderInfo = {
    name: string
    connected: boolean
    chainId: number
    address: string
    block: number
    connect: () => void
    provider: ethers.providers.Provider | null
}

