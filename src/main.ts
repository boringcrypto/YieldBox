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

import App from "./App.vue"

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

function setupNow() {
    let now: Ref<number> = ref(Date.now())
    window.setInterval(
        () => now.value = Date.now(), 
        1000
    );
    return now
}

async function main() {
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

    await test.init()
    await test.load()

    let app = createApp(App)

    app.config.globalProperties.hardhat = hardhat
    app.config.globalProperties.now = setupNow()
    app.config.globalProperties.test = test
    
    app.use(createRouter({
        history: createWebHashHistory(),
        routes: [
            { path: '/', component: Home },
            { path: '/block/:number', component: Block },
            { path: '/address/:address', component: Address },
        ]
    }))
    app.use(BootstrapVue)
    app.mount("#app")
    
    window.app = {
        hardhat,
        test
    }    
}

main()

