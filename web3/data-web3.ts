import { reactive } from "vue"
import Web3 from "./classes/Web3"

export default reactive({
    title: "YieldBox",
    name: "YieldBox",
    web3: new Web3(),
})
