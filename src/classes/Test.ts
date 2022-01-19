import { Contract, ContractFactory, Signer } from "ethers"
import { reactive, toRaw } from "vue"
import * as factories from "../../typechain-types"

interface IContract {
    name: string
    factoryOrAbi: string
    args: any[]
    address: string | null
}

interface TestSetup {
    contracts: { [name: string]: IContract}
}

class TestData {
    factories = toRaw(factories)
    contracts = {} as { [name: string]: TestContract }
    contractByAddress = {} as { [address: string]: TestContract }
}

let setup: TestSetup
setup = reactive(JSON.parse(window.localStorage.getItem("setup") || "null") as TestSetup || {
    contracts: {}
})

function save() {
    window.localStorage.setItem("setup", JSON.stringify(setup))
}

const data = reactive(new TestData())

class TestContract {
    params: IContract
    contract = null as Contract | null

    constructor(params: IContract) {
        this.params = reactive(Object.assign({}, params))
        if (!setup.contracts[params.name]) {
            setup.contracts[params.name] = params
            save()
        }
        data.contracts[params.name] = this
    }

    async create(signer: Signer) {
        if (this.params.factoryOrAbi.endsWith("__factory")) {
            this.contract = toRaw(await (new data.factories[this.params.factoryOrAbi as "YieldBox__factory"](signer) as ContractFactory)
                .deploy(...this.params.args))
            await this.contract.deployed()
            console.log(this.contract.deployTransaction)
            this.params.address = this.contract.address   
            data.contractByAddress[this.contract.address] = this
        } else {
            this.contract = new Contract(this.params.address!, this.params.factoryOrAbi)
        }
    }

    delete() {
        console.log("Deleting")
        delete setup.contracts[this.params.name]
        delete data.contracts[this.params.name]
        save()
    }
}

async function deploy(signer: Signer) {
    for (const contract_name in setup.contracts) {
        await new TestContract(setup.contracts[contract_name]).create(signer)
    }    
}

export {
    TestContract,
    TestData, 
    data,
    setup,
    deploy
}