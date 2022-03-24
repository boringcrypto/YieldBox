import { Contract, ContractFactory, Overrides, Signer, utils, BytesLike } from "ethers"
import { Provider, TransactionRequest } from "@ethersproject/providers"
import { FunctionFragment, Result } from "ethers/lib/utils"

export interface IContract extends utils.Interface {
    contractName: "Contract"
    functions: { [name: string]: FunctionFragment }

    encodeFunctionData(functionFragment: string, values: any[]): string

    decodeFunctionResult(functionFragment: string, data: BytesLike): Result

    events: {}
}

export class BaseFactory extends ContractFactory {
    deploy(overrides?: Overrides & { from?: string | Promise<string> }): Promise<Contract> {
        return super.deploy(overrides || {}) as Promise<Contract>
    }
    getDeployTransaction(overrides?: Overrides & { from?: string | Promise<string> }): TransactionRequest {
        return super.getDeployTransaction(overrides || {})
    }
    attach(address: string): Contract {
        return super.attach(address) as Contract
    }
    connect(signer: Signer): BaseFactory {
        return super.connect(signer) as BaseFactory
    }
    static readonly contractName = "Contract"
    public readonly contractName = "Contract"
    static readonly bytecode = ""
    static readonly abi = ""
    static createInterface(): IContract {
        return new utils.Interface(this.abi) as IContract
    }
    static connect(address: string, signerOrProvider: Signer | Provider): Contract {
        return new Contract(address, this.abi, signerOrProvider) as Contract
    }
}
