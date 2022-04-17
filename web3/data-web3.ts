import { reactive } from "vue"
import Web3 from "../sdk/Web3"
import { Account } from "./classes/Account"

export default reactive({
    title: "YieldBox",
    name: "YieldBox",
    web3: new Web3(),
    account: null as Account | null,
})
