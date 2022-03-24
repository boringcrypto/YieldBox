import { createApp, reactive, ref, Ref } from "vue"
import { createRouter, createWebHashHistory } from "vue-router"
import { BigNumber } from "ethers"
import "bootstrap-icons/font/bootstrap-icons.css"
import BootstrapVue from "bootstrap-vue-3"

import "bootswatch/dist/litera/bootstrap.min.css"
import "bootstrap-vue-3/dist/bootstrap-vue-3.css"

import App from "./App.vue"
import Home from "./pages/Home.vue"
import Block from "./pages/Block.vue"
import Address from "./pages/Address.vue"

import Data from "./data-workbench"
import Decimal from "decimal.js-light"
import { Token } from "../web3/classes/TokenManager"
import { HardhatProvider, hardhat } from "./classes/HardhatProvider"

Decimal.config({ precision: 36 })
Decimal.config({ toExpNeg: -1000 })
Decimal.config({ toExpPos: 1000 })

// this is just for debugging
declare global {
    interface Window {
        data: any
    }
}

declare module "decimal.js-light" {
    interface Decimal {
        toInt: (decimals: number) => BigNumber
    }
}

Decimal.prototype.toInt = function (decimals: number) {
    return BigNumber.from(
        this.times(new Decimal("10").pow(new Decimal(decimals.toString())))
            .todp(0)
            .toString()
    )
}

declare module "ethers" {
    interface BigNumber {
        toDec: (decimals?: number) => Decimal
        toDisplay: (token?: Token) => string
    }
}

BigNumber.prototype.toDec = function (decimals?: number) {
    return new Decimal(this.toString()).dividedBy(new Decimal(10).toPower((decimals || 0).toString()))
}
BigNumber.prototype.toDisplay = function (token?: Token) {
    const decimal = this?.toDec(token?.decimals || 0) || new Decimal(0)
    if (decimal.gt(10000)) {
        return decimal.toFixed(0)
    } else {
        return decimal.toSignificantDigits(4).toString()
    }
}

const BigNumberMax = (...args: BigNumber[]) => args.reduce((m, e) => (e > m ? e : m))
const BigNumberMin = (...args: BigNumber[]) => args.reduce((m, e) => (e < m ? e : m))

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        app: typeof Data
        hardhat: HardhatProvider
        now: Ref<number>
    }
}

function setupNow() {
    let now: Ref<number> = ref(Date.now())
    window.setInterval(() => (now.value = Date.now()), 1000)
    return now
}

async function main() {
    Data.setup()
    hardhat.accounts.forEach((account) => {
        Data.addNamedAddress({
            address: account.address,
            type: "wallet",
            name: account.name,
            object: account,
        })
    })

    const app = createApp(App)
    window.data = Data
    app.config.globalProperties.app = reactive(Data)
    app.config.globalProperties.hardhat = hardhat
    app.config.globalProperties.now = setupNow()
    app.provide("app", app.config.globalProperties.app)
    app.provide("hardhat", app.config.globalProperties.hardhat)
    app.provide("now", app.config.globalProperties.now)

    app.use(
        createRouter({
            history: createWebHashHistory(),
            routes: [
                { path: "/", component: Home },
                { path: "/block/:number", component: Block },
                { path: "/address/:address", component: Address },
            ],
        })
    )
    app.use(BootstrapVue)
    app.mount("#app")
}

main()
