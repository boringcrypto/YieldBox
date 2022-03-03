import { BigNumber, Contract, ContractFactory, ethers } from "ethers"
import { markRaw, reactive, Ref, ref } from "vue"
import * as factories from "../../typechain-types"
import { BaseFactory } from "./FactoryInterface"
import { CallError, hardhat, WalletName } from "./HardhatProvider"
import { TransactionResponse } from "@ethersproject/abstract-provider"
import { FunctionFragment, LogDescription, ParamType } from "ethers/lib/utils"

interface IAddressInfo {
    address: string
    type: "wallet" | "contract" | "miner" | "zero"
    name: string
    object: ethers.Wallet | ethers.Contract | null
}

type StepType = "deploy" | "attach" | "call"

interface IStep {
    type: StepType
    user: string
}

interface IDeployStep extends IStep {
    name: string
    factory: string
    args: any[]
    value: string
}

interface IAttachStep extends IStep {
    name: string
    address: string
    abi: string
}

interface ICallStep extends IStep {
    contract: string
    method: string
    args: any[]
    value: string
}

function call_args(args: any[], inputs: ParamType[]) {
    const args_out = []
    for (const i in inputs || []) {
        const input = inputs[i]
        if (input.type === "address") {
            args_out.push(
                test.lookupName(args[i])?.address ||
                args[i]
            )
        } else {
            args_out.push(args[i])
        }
    }
    return args_out
}

function equal(a: any, b: any) {
    if (typeof(a) !== typeof(b)) {
        return false
    }

    if (a instanceof BigNumber && b instanceof BigNumber) {
        return a.eq(b)
    }

    if (typeof(a) === "object") {
        for(const i in a) {
            if (!equal(a[i], b[i])) {
                return false;
            }
        }
        for(const i in b) {
            if (!equal(a[i], b[i])) {
                return false;
            }
        }
        return true
    }

    return a === b
}

interface IWatchChange {
    watch: Watch,
    old: {
        raw: any,
        display: any
    },
    new: {
        raw: any,
        display: any
    }
}

class Step {
    info: IStep
    script: Script
    response: TransactionResponse | null = null
    logs: LogDescription[] = reactive([])
    changes: IWatchChange[] = reactive([])

    constructor(info: IStep, script: Script) {
        this.info = info
        this.script = script
    }

    static createDeploy(info: IDeployStep, script: Script) {
        return new this(info, script)
    }

    static createAttach(info: IAttachStep, script: Script) {
        return new this(info, script)
    }

    static createCall(info: ICallStep, script: Script) {
        return new this(info, script)
    }

    async run() {
        this.logs.splice(0, this.logs.length)
        const signer = hardhat.getAccount(this.info.user)

        if (this.info.type == "deploy") {
            const deploy_info = this.info as IDeployStep
            // @ts-ignore
            const factory = new test.factories[deploy_info.factory](signer) as ContractFactory
            const contract = await factory.deploy(...call_args(deploy_info.args, factory.interface.fragments.filter(f => f?.type == "constructor")[0]?.inputs))
            await contract.deployed()
            const receipt = await hardhat.provider.getTransactionReceipt(contract.deployTransaction.hash)
            for(const i in receipt.logs) {
                this.logs.push(factory.interface.parseLog(receipt.logs[i]))
            }

            this.script.contracts[deploy_info.name] = markRaw(contract)

            test.addNamedAddress({
                address: contract.address,
                type: "contract",
                name: deploy_info.name,
                object: markRaw(contract)
            })
        }

        if (this.info.type == "call") {
            const call_info = this.info as ICallStep
            const contract = this.script.contracts[call_info.contract]
            const value = BigNumber.from(call_info.value || "0")
            try {
                const tx: TransactionResponse = await contract
                    .connect(hardhat.named_accounts[call_info.user as WalletName])
                    .functions[call_info.method](...call_args(call_info.args, contract.interface.functions[call_info.method].inputs), {
                        value: value,
                        gasLimit: 5000000
                    })
                const response = await tx.wait()

                for(const i in response.logs) {
                    const contract = test.lookupAddress(response.logs[i].address)?.object
                    console.log(response.logs[i].address)
                    if (contract instanceof Contract) {
                        this.logs.push(contract.interface.parseLog(response.logs[i]))
                    } else {
                        this.logs.push({
                            name: "Unknown",
                            topic: response.logs[i].topics[0],
                            signature: "unknown",
                            args: response.logs[i].topics.slice(1),
                            eventFragment: {
                                anonymous: true,
                                format: () => "",
                                type: "topic",
                                name: "Unknown",
                                _isFragment: true,
                                inputs: response.logs[i].topics.slice(1).map((topic, index) => ({
                                    name: "Topic " + index,
                                    type: "topic"
                                } as ParamType))
                            }

                        })
                    }
                }
            } catch (e) {
                console.log("error", (e as CallError).error, e)
            }
        }

        test.save()

        await this.script.runWatches(this)
    }
}

interface IWatch {
    user: string
    contract: string
    method: string
    args: any[]
}

class Watch {
    info: IWatch
    script: Script
    result = reactive({
        raw: "loading..." as any,
        display: "loading..."
    })

    constructor(info: IWatch, script: Script) {
        this.info = info
        this.script = script
    }

    async load(step: Step | null) {
        const contract = this.script.contracts[this.info.contract]
        const old_raw = this.result.raw
        const old_display = this.result.display

        if (!contract) {
            this.result.raw = "No contract"
        }
        else {
            try {
                this.result.raw = await contract
                    .connect(hardhat.named_accounts[this.info.user as WalletName])
                    .functions[this.info.method](...call_args(this.info.args, contract.interface.functions[this.info.method].inputs), {
                        gasLimit: 5000000
                    })
            } catch (e: any) {
                console.log("error", (e as CallError).error, Object.keys(e.error || {}))
                for(let key in e.error || {}) {
                    console.log(key, e[key])
                }
                this.result.raw = "Error"
            }    
        }

        this.result.display = this.result.raw.toString()

        if (step && old_raw != "No contract" && !equal(this.result.raw, old_raw)) {
            step.changes.push({
                watch: this,
                old: {
                    raw: old_raw,
                    display: old_display
                },
                new: {
                    raw: this.result.raw,
                    display: this.result.display
                }
            })
        }
    }
}

type ScriptData = { steps: IStep[], watches: IWatch[]  }

class Script {
    steps: Step[]
    contracts: { [name: string]: ethers.Contract } = reactive({})
    watches: Watch[] = reactive([])

    constructor() {
        this.steps = reactive([])
    }

    async runWatches(step: Step | null) {
        step?.changes.splice(0, step.changes.length) // empty changes
        for(let i in this.watches) {
            await this.watches[i].load(step)
        }
    }

    async run() {
        for(const key in this.contracts) {
            delete this.contracts[key]
        }

        await this.runWatches(null)

        for(let i in this.steps) {
            await this.steps[i].run()
        }
    }

    load(data: ScriptData) {
        this.steps.splice(0, data.steps.length)
        for(let i in data.steps) {
            this.steps.push(new Step(data.steps[i], this))
        }
        this.watches.splice(0, this.watches.length)
        for(let i in data.watches) {
            this.watches.push(new Watch(data.watches[i], this))
        }
    }

    save() {
        return {
            steps: this.steps.map(s => s.info),
            watches: this.watches.map(w =>w.info)
        }
    }

    private async add(step_info: IStep) {
        const step = new Step(step_info, this)
        this.steps.push(step)
        await step.run()
    }

    async addDeploy(step_info: IDeployStep) {
        this.add(step_info)
    }

    async addAttach(step_info: IAttachStep) {
        this.add(step_info)
    }

    async addCall(step_info: ICallStep) {
        this.add(step_info)
    }

    async addWatch(watch_info: IWatch) {
        const watch = new Watch(watch_info, this)
        this.watches.push(watch)
        test.save()
        await watch.load(null)
    }

    async delete(index: number) {
        this.steps.splice(index, 1)

        test.save()
    }

    async deleteWatch(index: number) {
        this.watches.splice(index, 1)

        test.save()
    }
}

type FactoryName = keyof typeof factories

class TestManager {
    script: Script
    fixtureId: string = ""

    factories = {} as { [name: string]: typeof BaseFactory }
    private addresses = {} as { [address: string]: IAddressInfo }
    private names = {} as { [name: string]: IAddressInfo }

    constructor() {
        this.script = new Script()
        for(let key in factories) {
            // Filter out interfaces. Only factories with bytecode, that are deployable.
            if(factories[key as FactoryName].hasOwnProperty("bytecode")) {
                // @ts-ignore
                this.factories[key.substring(0, key.length - 9)] = factories[key as FactoryName]
            }
        }

        this.addNamedAddress({
            type: "zero",
            address: "0x0000000000000000000000000000000000000000",
            name: "Zero",
            object: null
        })
    }

    save() {
        window.localStorage.setItem("test", JSON.stringify(this.script.save()))
    }

    load() {
        const json = window.localStorage.getItem("test")
        if (json) {
            this.script.load(JSON.parse(window.localStorage.getItem("test") || "null"))
        } else {
            this.script.load({
                steps: [],
                watches: []
            })
        }
    }

    // Creates a snapshot as the initial state for the EVM
    async init() {
        this.fixtureId = await hardhat.provider.send("evm_snapshot", [])
        console.log("Fixture created", this.fixtureId)
    }
    
    // Resets the EVM to the initial state and moves the timestamp to now
    async reset() {
        await hardhat.provider.send("evm_revert", [this.fixtureId])
        await hardhat.provider.send("evm_setNextBlockTimestamp", [Date.now() / 1000])
        console.log("Fixture loaded. Time reset.")
    }

    // Runs a script starting from a clean state (currently using the only saved script)
    async activate() {
        await this.load()
        await this.reset()
        await this.script.run()
    }

    addNamedAddress(address: IAddressInfo) {
        this.addresses[address.address.toLowerCase()] = address
        this.names[address.name.toLowerCase()] = address
    }

    lookupName(name: string) {
        return this.names[name.toLowerCase()]
    }

    lookupAddress(name: string) {
        return this.addresses[name.toLowerCase()]
    }
}

let test: TestManager = new TestManager()

export {
    IDeployStep,
    IAttachStep,
    ICallStep,
    TestManager,
    test
}