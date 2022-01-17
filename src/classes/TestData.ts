import { Contract, ContractFactory, Signer } from "ethers"
import { reactive, ref, toRaw } from "vue"
import * as factories from "../../typechain-types"

class TestData {
    factories = toRaw(factories)
}

const data = new TestData()

class TestContract {
    name: string
    factoryOrAbi: string
    address: string
    args: any[]
    contract = null as Contract | null

    constructor(name: string, factoryOrAbi: string, args: any[], address: string | null) {
        this.name = name
        this.address = address || ""
        this.factoryOrAbi = factoryOrAbi
        this.args = args
    }

    async create(signer: Signer) {
        if (this.factoryOrAbi.endsWith("__factory")) {
            this.contract = await (new data.factories[this.factoryOrAbi as "YieldBox__factory"](signer) as ContractFactory)
                .deploy(...this.args)
            await this.contract.deployed()
            console.log(this.contract.deployTransaction)            
        } else {
            this.contract = new Contract(this.address, this.factoryOrAbi)
        }
    }
}

export {
    TestContract,
    TestData, 
    data
}