import { createApp, reactive } from "vue"
import { createRouter, createWebHashHistory } from "vue-router"
import { BigNumber } from "ethers"
import BootstrapVue from "bootstrap-vue-3"

import "bootswatch/dist/litera/bootstrap.min.css"
import "bootstrap-vue-3/dist/bootstrap-vue-3.css"

import App from "./App.vue"
import Home from "./pages/Home.vue"
import Escrow from "./pages/Escrow.vue"
import Lending from "./pages/Lending.vue"
import Salary from "./pages/Salary.vue"
import Swap from "./pages/Swap.vue"
import Tokenizer from "./pages/Tokenizer.vue"
import YieldBoxBalances from "./pages/YieldBoxBalances.vue"

import Data from "./data-web3"
import Decimal from "decimal.js-light"
import { Token } from "./classes/TokenManager"
import { Account } from "./classes/Account"

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
    }
}

async function main() {
    const app = createApp(App)
    Data.web3.onAccountChanged = (address) => {
        Data.account = new Account(address)
    }
    await Data.web3.setup()
    window.data = Data
    app.config.globalProperties.app = reactive(Data)
    app.provide("app", app.config.globalProperties.app)

    app.use(
        createRouter({
            history: createWebHashHistory(),
            routes: [
                { path: "/", component: Home },
                { path: "/escrow", component: Escrow },
                { path: "/salary", component: Salary },
                { path: "/swap", component: Swap },
                { path: "/tokenizer", component: Tokenizer },
                { path: "/lending", component: Lending },
                { path: "/yieldbox/balances/:address", component: YieldBoxBalances },
            ],
        })
    )
    app.use(BootstrapVue)
    app.mount("#app")
}

main()
