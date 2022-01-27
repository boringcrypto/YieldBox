import { BigNumber, ethers } from "ethers";
import { BlockWithTransactions } from "ethers/node_modules/@ethersproject/abstract-provider";
import { computed, markRaw, reactive } from "vue";

class NamedWallet extends ethers.Wallet {
    name="" as string
}

class HardhatProvider {
    provider: ethers.providers.JsonRpcProvider
    deployer: NamedWallet
    alice: NamedWallet
    bob: NamedWallet
    carol: NamedWallet
    dirk: NamedWallet
    erin: NamedWallet
    fred: NamedWallet
    accounts: NamedWallet[]
    named_accounts
    block = reactive({
        number: 0
    })
    blocks: { [number: number]: BlockWithTransactions} = reactive({})
    txs: { [txhash: string]: ethers.providers.TransactionResponse} = reactive({})

    constructor() {
        const mnemonic = "test test test test test test test test test test test junk"
        this.provider = markRaw(new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/"))
        this.deployer = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/0").connect(this.provider) as NamedWallet; this.deployer.name = "Deployer"
        this.alice = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/1").connect(this.provider) as NamedWallet; this.alice.name = "Alice"
        this.bob = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/2").connect(this.provider) as NamedWallet; this.bob.name = "Bob"
        this.carol = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/3").connect(this.provider) as NamedWallet; this.carol.name = "Carol"
        this.dirk = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/4").connect(this.provider) as NamedWallet; this.dirk.name = "Dirk"
        this.erin = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/5").connect(this.provider) as NamedWallet; this.erin.name = "Erin"
        this.fred = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/6").connect(this.provider) as NamedWallet; this.fred.name = "Fred"
        this.accounts = [this.deployer, this.alice, this.bob, this.carol, this.dirk, this.erin, this.fred]
        this.named_accounts = {
            "deployer": this.deployer,
            "alice": this.alice,
            "bob": this.bob,
            "carol": this.carol,
            "dirk": this.dirk,
            "erin": this.erin,
            "fred": this.fred
        }

        this.provider.on("block", async (number: number) => {
            await this.getBlock(number)
            this.block.number = number
        })
    }

    async getBlock(number: string | number) {
        if (typeof(number) == "string") {
            number = parseInt(number)
        }
        let block = this.blocks[number]
        if (!block) {
            block = await this.provider.getBlockWithTransactions(number)
            this.blocks[number] = block
            for(const hash in block.transactions) {
                const tx = block.transactions[hash]
                this.txs[tx.hash] = tx
            }
        }
        return block
    }

    getAccount(name: string) {
        return this.named_accounts[name as "alice"]
    }
}

const hardhat = reactive(new HardhatProvider())

type WalletName = keyof typeof hardhat.named_accounts

interface CallError extends Error {
    error: string
}

export {
    HardhatProvider,
    hardhat,
    WalletName,
    CallError
}