<template>
    <b-form-select v-model="function_selected" class="mb-3">
        <b-form-select-option-group label="Views">
            <b-form-select-option v-for="f in functions.filter(f => f.func.stateMutability == 'view')" :value="f.key" :key="f.key">{{ f.key }}</b-form-select-option>                    
        </b-form-select-option-group>
        <b-form-select-option-group label="Calls">
            <b-form-select-option v-for="f in functions.filter(f => f.func.stateMutability != 'view')" :value="f.key" :key="f.key">{{ f.key }}</b-form-select-option>                    
        </b-form-select-option-group>
    </b-form-select>

    <div v-if="yieldbox && yieldbox.interface && func">
        <b-card>
            <div v-for="(input, i) in func.func.inputs" :key="input.name">
                <label>{{ input.baseType }}</label>
                <b-form-input :ref="func.key + '|' + i" :placeholder="input.name"></b-form-input>
            </div>
            <div v-if="func.func.stateMutability == 'payable'">
                <label>ETH value</label>
                <b-form-input :ref="func.key + '|value'"></b-form-input>
            </div>
            <b-button class="mt-3" @click="read(func)">Read</b-button>
        </b-card>
    </div>
</template>

<script lang="ts">
import {computed, defineComponent, ref, shallowRef } from "@vue/runtime-core"
import { constants } from "../constants/development"

import Countdown from "../components/Countdown.vue"
import { YieldBox, YieldBox__factory } from "../../types/ethers-contracts"
import { FunctionFragment } from "ethers/lib/utils"
import { ethers } from "ethers"

export default defineComponent({
    name: "Home",
    components: {
        Countdown
    },
    watch: {
        'web3.address': function() {
            this.newBlock()
        },
        'web3.block': function() {
            this.newBlock()
        }
    },
    methods: {
        newBlock: async function() {
            if (this.web3.provider) {
                this.yieldbox = YieldBox__factory.connect(constants.yieldbox, this.hardhat.provider)
                console.log((await this.hardhat.accounts[1].getBalance()).toString())

                if (!this.function_selected) {
                    this.function_selected = this.functions[0].key
                }
            }
        },
        read: async function(func: {key: String, func: FunctionFragment}) {
            let args = []
            for(let i in func.func.inputs) {
                let input = func.func.inputs[i]
                let val = this.$refs[func.key + '|' + i].value
                if (input.baseType == "address") {
                    args.push(val || ethers.constants.AddressZero)
                } else if (input.baseType.startsWith("uint")) {
                    args.push(val || 0)
                } else {
                    args.push(val)
                }
            }
            let result = await this.yieldbox?.functions[func.key](...args);
            console.log(result);
        }
    },   
    setup() {
        const yieldbox = shallowRef(null as YieldBox | null)
        const function_selected = ref("" as String)
        const functions = computed(function() {
            return yieldbox.value
                ? Object.entries(yieldbox.value.interface.functions).map(f => ({ key: f[0], func: f[1] }))
                : []
        })
        const func = computed(function() {
            return function_selected.value
                ? functions.value.filter(f => f.key == function_selected.value)[0]
                : null
        })
        return {
            yieldbox,
            function_selected,
            functions,
            func
        }
    }
})
</script>
