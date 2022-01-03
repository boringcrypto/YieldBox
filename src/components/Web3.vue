<template>
    <div>
        <slot name="none" v-if="!info.connected"></slot>
        <slot name="connect" v-else-if="info.connected && !info.address"></slot>
        <slot v-else></slot>
    </div>
</template>

<script lang="ts">
declare global {
    interface Window {
        ethereum: any
        provider?: ethers.providers.Web3Provider
    }
}

import {defineComponent, PropType} from "vue"
import {BigNumber, ethers} from "ethers"
import { ProviderInfo } from "../classes/ProviderInfo"

interface ConnectInfo {
    chainId: string
}

export const EmptyProviderInfo: ProviderInfo = {
    name: "Loading...",
    connected: false,
    chainId: 0,
    address: "",
    block: 0,
    connect: function () {
        if (this.connected) {
            window.ethereum?.enable()
        }
    },
    provider: null,
}

export default defineComponent({
    name: "Web3",
    props: {
        info: {
            type: Object as PropType<ProviderInfo>,
            required: true,
        },
    },
    setup: (props: {info: ProviderInfo}) => {
        if (window.ethereum) {
            let interval: number = 0
            window.provider = new ethers.providers.Web3Provider(window.ethereum)
            if (window.ethereum.isMetaMask) {
                props.info.name = "MetaMask"
            } else {
                props.info.name = "Other"
            }

            function handleConnect(info: ConnectInfo) {
                handleChainChanged(info.chainId)
            }

            function handleAccountsChanged(addresses: string[] | undefined) {
                if (addresses && addresses.length) {
                    props.info.address = addresses[0]
                } else {
                    props.info.address = ""
                }
            }

            function handleChainChanged(chainId: string) {
                props.info.chainId = Number(BigNumber.from(chainId))
                props.info.connected = window.ethereum.isConnected()

                if (interval) {
                    window.clearInterval(interval)
                    interval = 0
                }
                window.provider = new ethers.providers.Web3Provider(window.ethereum)
                window.ethereum.request({method: "eth_accounts"}).then(handleAccountsChanged)
            }
            window.ethereum.autoRefreshOnNetworkChange = false
            window.ethereum.on("accountsChanged", handleAccountsChanged)
            window.ethereum.on("chainChanged", handleChainChanged)
            window.ethereum.on("connect", handleConnect)
            window.ethereum.on("disconnect", (error: string) => {
                props.info.connected = false
                props.info.block = 0
            })
            window.provider?.on("block", (blockNumber: number) => {
                console.log("Block", blockNumber)
                props.info.block = blockNumber
            })

            props.info.connected = window.ethereum.isConnected()
            if (props.info.connected) {
                handleConnect({chainId: window.ethereum.chainId})
            }
        } else {
            props.info.name = "None"
        }
        return {}
    },
})
</script>
