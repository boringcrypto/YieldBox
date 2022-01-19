import { createApp, reactive, ref, Ref } from "vue"
import { createRouter, createWebHashHistory } from "vue-router"
import BootstrapVue from "bootstrap-vue-3"

import "bootswatch/dist/sandstone/bootstrap.min.css"
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import "./scss/main.scss"
import Web3 from "./classes/Web3"

import Home from "./pages/Home.vue"
import Block from "./pages/Block.vue"

import { HardhatProvider, hardhat } from "./classes/HardhatProvider"
import { data, deploy, setup, TestData } from "./classes/Test"

declare global {
    interface Window {
        app: any
    }
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties  {
         web3: Web3,
         hardhat: HardhatProvider,
         now: Date,
         data: TestData
    }
}

const routes = [
    { path: '/', component: Home },
    { path: '/block/:number', component: Block },
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

const web3 = reactive(new Web3())
web3.setup()

deploy(hardhat.alice)

import App from "./App.vue"
let app = createApp(App)

app.config.globalProperties.web3 = web3
app.config.globalProperties.hardhat = hardhat
app.config.globalProperties.now = now
app.config.globalProperties.data = data
app.config.globalProperties.setup = setup

app.use(router)
app.use(BootstrapVue)
app.mount("#app")

window.app = app

