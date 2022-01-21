import { createApp, reactive, ref, Ref } from "vue"
import { createRouter, createWebHashHistory } from "vue-router"
import BootstrapVue from "bootstrap-vue-3"

import "bootswatch/dist/sandstone/bootstrap.min.css"
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import "./scss/main.scss"
import Web3 from "./classes/Web3"

import Home from "./pages/Home.vue"
import Block from "./pages/Block.vue"
import Address from "./pages/Address.vue"

import { HardhatProvider, hardhat } from "./classes/HardhatProvider"
import { test, TestManager } from "./classes/Test"

declare global {
    interface Window {
        app: any
    }
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties  {
         web3: Web3,
         hardhat: HardhatProvider,
         now: Ref<number>,
         test: TestManager
    }
}

const routes = [
    { path: '/', component: Home },
    { path: '/block/:number', component: Block },
    { path: '/address/:address', component: Address },
]
  
const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

let now: Ref<number> = ref(Date.now())
window.setInterval(
    () => now.value = Date.now(), 
    1000
);

hardhat.accounts.forEach(account => {
    test.addresses[account.address] = {
        address: account.address,
        type: "wallet",
        name: account.name as string,
        object: account
    }
})

test.addresses["0xC014BA5EC014ba5ec014Ba5EC014ba5Ec014bA5E"] = {
    address: "0xC014BA5EC014ba5ec014Ba5EC014ba5Ec014bA5E",
    type: "miner",
    name: "Hardhat Miner",
    object: null
}

import App from "./App.vue"

async function main() {
    let app = createApp(App)

    app.config.globalProperties.hardhat = hardhat
    app.config.globalProperties.now = now
    app.config.globalProperties.test = test
    
    app.use(router)
    app.use(BootstrapVue)
    app.mount("#app")
    
    window.app = app    
}

main()

