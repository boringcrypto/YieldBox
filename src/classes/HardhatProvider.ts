import { ethers } from "ethers";
import { markRaw } from "vue";

class NamedWallet extends ethers.Wallet {
    name="" as String
}

export type WalletName = "Alice" | "Bob" | "Carol" | "Dirk" | "Erin" | "Fred"

export default class HardhatProvider {
    provider: ethers.providers.JsonRpcProvider
    alice: NamedWallet
    bob: NamedWallet
    carol: NamedWallet
    dirk: NamedWallet
    erin: NamedWallet
    fred: NamedWallet
    accounts: NamedWallet[]
    named_accounts

    constructor() {
        const mnemonic = "test test test test test test test test test test test junk"
        this.provider = markRaw(new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/"))
        this.alice = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/0").connect(this.provider) as NamedWallet; this.alice.name = "Alice"
        this.bob = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/1").connect(this.provider) as NamedWallet; this.bob.name = "Bob"
        this.carol = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/2").connect(this.provider) as NamedWallet; this.carol.name = "Carol"
        this.dirk = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/3").connect(this.provider) as NamedWallet; this.dirk.name = "Dirk"
        this.erin = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/4").connect(this.provider) as NamedWallet; this.erin.name = "Erin"
        this.fred = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/5").connect(this.provider) as NamedWallet; this.fred.name = "Fred"
        this.accounts = [this.alice, this.bob, this.carol, this.dirk, this.erin, this.fred]
        this.named_accounts = {
            "Alice": this.alice,
            "Bob": this.bob,
            "Carol": this.carol,
            "Dirk": this.dirk,
            "Erin": this.erin,
            "Fred": this.fred
        }
    }
}

