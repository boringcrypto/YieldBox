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
    <span v-if="info.chainId == 0">
        Network not connected
    </span>
    <span v-else-if="!info.address">
        <button @click="info.connect">Connect Metamask</button>
    </span>
    <span v-else>
        <strong>Your wallet address</strong><br>
        {{ info.address }}
    </span>
</template>

<script lang="ts">
import {defineComponent, PropType, shallowRef } from "@vue/runtime-core"
import { ProviderInfo } from "../classes/ProviderInfo"
import { constants } from "../constants/development"

import Countdown from "../components/Countdown.vue"
import { YieldBox, YieldBox__factory } from "../../types/ethers-contracts"
import { FunctionFragment } from "ethers/lib/utils"
import { ethers } from "ethers"

export default defineComponent({
    name: "Home",
    props: {
        info: {
            type: Object as PropType<ProviderInfo>,
            required: true,
        },
        referrer: String
    },
    components: {
        Countdown
    },
    watch: {
        'info.address': function() {
            this.newBlock()
        },
        'info.block': function() {
            this.newBlock()
        }
    },
    computed: {
        functions: function() {
            return this.yieldbox 
                ? Object.entries(this.yieldbox.interface.functions).map(f => ({ key: f[0], func: f[1] }))
                : []
        },
        func: function() {
            return this.function_selected
                ? this.functions.filter(f => f.key == this.function_selected)[0]
                : null
        }
    },
    methods: {
        newBlock: async function() {
            if (window.provider) {
                this.yieldbox = YieldBox__factory.connect(constants.yieldbox, window.provider)
            }
        },
        read: async function(view: [String, FunctionFragment]) {
            let args = []
            for(let i in view[1].inputs) {
                let input = view[1].inputs[i]
                let val = this.$refs[view[0] + '|' + i].value
                if (input.baseType == "address") {
                    args.push(val || ethers.constants.AddressZero)
                } else if (input.baseType.startsWith("uint")) {
                    args.push(val || 0)
                } else {
                    args.push(val)
                }
            }
            let result = await this.yieldbox?.functions[view[0]](...args);
            console.log(result);
        }
    },   
    data() {
        return {
            yieldbox: shallowRef(null as YieldBox | null),
            function_selected: "" as String
        }
    }
})
</script>
