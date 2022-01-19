<template>
    <div class="row">
        <div class="mx-auto" style="max-width: 800px">
            <h2>Contracts</h2>
            <div v-for="contract in data.contracts" :key="contract.params.name">
                {{ contract.params.name }} {{ contract.params.address }} <b-icon icon="trash" @click="contract.delete()"></b-icon>
            </div>

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
                <label>Contract deployment name</label>
                <b-form-input v-model="contract_name"></b-form-input>
                <template v-if="contract_constructor">
                    <div v-for="(input, i) in contract_constructor.inputs" :key="input">
                        <label>{{ input.type }}</label>
                        <contract-input v-model="args[factory_name + '|' + i]" :input="input"></contract-input>
                    </div>
                </template>
                <b-button @click="deploy" class="mt-3">Deploy</b-button>
            </b-card>
        </div>
    </div>
</template>

<script lang="ts">
import {computed, defineComponent, ref } from "@vue/runtime-core"
import ContractInput from "../components/ContractInput.vue"
import { data, setup, TestContract } from "../classes/Test"

export default defineComponent({
    name: "Home",
    components: {
        ContractInput
    },
    methods: {
        delete_contract: function(name: string) {
            delete setup.contracts[name]
        },
        deploy: async function() {
            await new TestContract({
                name: this.contract_name, 
                factoryOrAbi: this.factory_name, 
                args: this.constructor_args,
                address: null
            }).create(this.hardhat.alice)
        }
    },   
    setup() {
        const args = ref({})
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
        const constructor_args = computed(function() {
            return contract_constructor.value?.inputs.map((input, i) => (args.value as any)[factory_name.value + "|" + i])
        })
        return {
            args,
            factory_name,
            factory,
            factory_interface,
            contract_constructor,
            constructor_args,
            contract_name: ref("")
        }
    }
})
</script>
