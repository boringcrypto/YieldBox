<template>
    <div class="row">
        <div class="mx-auto" style="max-width: 800px">
            <h2>Contracts</h2>
            -<br>
            -<br>
            <h2>Add contract</h2>
            <b-form-select v-model="factory_name">
                <template v-for="(factory, key) in data.factories" :key="key">
                    <b-form-select-option :value="key">
                        {{ key.substring(0, key.length - 9) }}
                    </b-form-select-option>
                </template>
            </b-form-select>
            <b-card v-if="factory && factory.bytecode" class="mt-3">
                <h3>Deploy new {{ factory_name.substring(0, factory_name.length - 9) }}</h3>
                <template v-if="contract_constructor">
                    <div v-for="(input, i) in contract_constructor.inputs" :key="input">
                        {{ input.type }}
                        <contract-input v-model="args[factory_name + '|' + i]" :input="input"></contract-input>
                    </div>
                </template>
                <b-button @click="deploy">Deploy</b-button>
            </b-card>
        </div>
    </div>
    {{ args }}
</template>

<script lang="ts">
import {computed, defineComponent, getCurrentInstance, ref, shallowRef } from "@vue/runtime-core"
import { constants } from "../constants/development"

import Countdown from "../components/Countdown.vue"
import ContractInput from "../components/ContractInput.vue"
import { FunctionFragment } from "ethers/lib/utils"
import { ContractFactory, ethers } from "ethers"
import { WalletName } from "../classes/HardhatProvider"
import { data, TestContract } from "../classes/TestData"
import { YieldBox__factory } from "../../typechain-types"

export default defineComponent({
    name: "Home",
    components: {
        Countdown,
        ContractInput
    },
    watch: {
        'web3.update': function() {
            console.log("Block", this.web3.block)
        }
    },
    methods: {
        deploy: async function() {
            const contract = new TestContract("test", this.factory_name, [], null)
            await contract.create(this.hardhat.alice)
            console.log(contract.contract?.address)
        }
    },   
    setup() {
        const factory_name = ref("")
        const factory = computed(function() {
            return data.factories[factory_name.value as "YieldBox__factory"];
        })
        const factory_interface = computed(function() {
            return factory.value?.createInterface()
        })
        const contract_constructor = computed(function() {
            return factory_interface.value?.fragments.filter(f => f?.type == "constructor")[0]
        })
        const args = ref({})
        return {
            factory_name,
            factory,
            factory_interface,
            contract_constructor,
            args
        }
    }
})
</script>
