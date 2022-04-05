import { reactive, markRaw } from "vue"
import { ethers } from "ethers"
import Contracts from "./contracts.json"

export interface IAddressInfo {
    address: string
    type: "wallet" | "contract" | "miner" | "zero"
    name: string
    object: ethers.Wallet | ethers.Contract | null
}

export default reactive({
    title: "Boring WorkBench",
    name: "Boring WorkBench",
    addresses: {} as { [address: string]: IAddressInfo },
    names: {} as { [name: string]: IAddressInfo },
    contracts: {} as { [address: string]: ethers.Contract },

    lookupAddress: function (name: string) {
        if (name) {
            return this.addresses[name.toLowerCase()]
        }
        return null
    },

    lookupName: function (name: string) {
        return this.names[name.toLowerCase()]
    },

    addNamedAddress: function (address: IAddressInfo) {
        this.addresses[address.address.toLowerCase()] = address
        this.names[address.name.toLowerCase()] = address
    },

    setup: function () {
        this.addNamedAddress({
            type: "zero",
            address: "0x0000000000000000000000000000000000000000",
            name: "Zero",
            object: null,
        })

        this.addNamedAddress({
            address: "0xC014BA5EC014ba5ec014Ba5EC014ba5Ec014bA5E",
            type: "miner",
            name: "Hardhat Miner",
            object: null,
        })

        for (let name of Object.keys(Contracts.contracts)) {
            const contractInfo = Contracts.contracts[name as keyof typeof Contracts.contracts]
            const contract = new ethers.Contract(contractInfo.address, contractInfo.abi)
            this.contracts[contract.address] = contract
            this.addNamedAddress({
                type: "contract",
                address: contract.address,
                name: name,
                object: markRaw(contract),
            })
        }
    },
})
