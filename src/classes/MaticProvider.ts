import { Contract, ContractFactory, ethers } from "ethers"

class MaticProvider {
    provider: ethers.providers.JsonRpcProvider

    constructor(rpc: string, poll: (block: number) => void) {
        this.provider = new ethers.providers.JsonRpcProvider(rpc)

        this.provider.getBlockNumber().then((block: number) => {
            poll(block)      
            window.setInterval(() => {
                this.provider?.getBlockNumber().then((block: number) => {
                    poll(block)
                })
            }, 10000)
        })  
    }
}

export {
    MaticProvider
}
