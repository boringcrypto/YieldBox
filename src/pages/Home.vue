<template>
    <div class="row">
        <div class="mx-auto" style="max-width: 800px">
            <h2>Script</h2>
            <b-card v-for="(step, index) in test.script.steps" :key="step">
                <span v-if="step.type == 'deploy'">
                    <div class="float-end"><b-icon style="cursor: pointer" icon="trash" @click="test.script.delete(index)"></b-icon></div>
                    {{ hardhat.named_accounts[step.user].name }} deploys {{ step.factory }} as 
                    <span v-if="!test.script.contracts[step.name]">{{ step.name }}</span>
                    <address-link v-else :address="test.script.contracts[step.name]?.address">{{ step.name }}</address-link>

                    <span v-if="step.args.length">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(arg, i) in step.args" :key="step.name + '|' + arg + '|' + i">
                                    <td>
                                        {{ deploy_inputs(step.factory)[i].name }}
                                    </td>
                                    <td>
                                        {{ deploy_inputs(step.factory)[i].type }}
                                    </td>
                                    <td>
                                        {{ arg }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </span>
                </span>

                <span v-if="step.type == 'call'">
                    <div class="float-end"><b-icon style="cursor: pointer" icon="trash" @click="test.script.delete(index)"></b-icon></div>
                    {{ hardhat.named_accounts[step.user].name }} calls {{ step.contract }}.{{ step.method}}

                    <span v-if="step.args.length && test.script.contracts[step.contract]">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(arg, i) in step.args" :key="step.name + '|' + arg + '|' + i">
                                    <td>
                                        <span v-if="call_inputs">{{ call_inputs(step.contract, step.method)[i].name }}</span>
                                    </td>
                                    <td>
                                        <span v-if="call_inputs">{{ call_inputs(step.contract, step.method)[i].type }}</span>
                                    </td>
                                    <td>
                                        {{ arg }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </span>
                </span>
            </b-card>

            <b-card no-body>
                <b-tabs content-class="mt-3" justified card>
                    <b-tab title="Deploy" active>
                        <b-form-select v-model="factory_name">
                            <template v-for="(factory, key) in test.factories" :key="key">
                                <b-form-select-option :value="key">
                                    {{ key }}
                                </b-form-select-option>
                            </template>
                        </b-form-select>
                        <div v-if="factory && factory.bytecode" class="mt-3">
                            <label>Contract deployment name</label>
                            <b-form-input v-model="deploy_name"></b-form-input>
                            <template v-if="contract_constructor">
                                <div v-for="(input, i) in contract_constructor.inputs" :key="input">
                                    <label>{{ input.name }}</label>
                                    <contract-input v-model="args[factory_name + '|' + i]" :input="input"></contract-input>
                                </div>
                            </template>
                            <b-button @click="deploy" class="mt-3">Deploy</b-button>
                        </div>
                    </b-tab>
                    <b-tab title="Attach">

                    </b-tab>
                    <b-tab title="Call">
                        <b-form-select v-model="contract_name">
                            <template v-for="(contract, name) in test.script.contracts" :key="name">
                                <b-form-select-option :value="name">
                                    {{ name }}
                                </b-form-select-option>
                            </template>
                        </b-form-select>
                        <div v-if="contract" class="mt-3">
                            <b-form-select v-model="method_name">
                                <template v-for="(method, name) in contract_functions" :key="name">
                                    <b-form-select-option :value="name">
                                        {{ name }}
                                    </b-form-select-option>
                                </template>
                            </b-form-select>
                            <div class="mt-3" v-if="method && method.inputs.length">
                                <div v-for="(input, i) in method.inputs" :key="input">
                                    <label>{{ input.name || input.type }}</label>
                                    <contract-input v-model="args[contract_name + '|' + method_name + '|' + i]" :input="input"></contract-input>
                                </div>
                            </div>

                            <label>User</label>
                            <b-form-select v-model="user_name">
                                <template v-for="(account, name) in hardhat.named_accounts" :key="account">
                                    <b-form-select-option :value="name">
                                        {{ account.name }}
                                    </b-form-select-option>
                                </template>
                            </b-form-select>
                            <b-button v-if="method_name" @click="call" class="mt-3">Call</b-button>
                        </div>
                    </b-tab>
                </b-tabs>
            </b-card>            
        </div>
    </div>
</template>

<script lang="ts">
import {computed, defineComponent, ref } from "@vue/runtime-core"
import ContractInput from "../components/ContractInput.vue"
import { test, IDeployStep, ICallStep } from "../classes/Test"
import AddressLink from "../components/AddressLink.vue"

export default defineComponent({
    name: "Home",
    components: {
        ContractInput,
        AddressLink
    },
    methods: {
        delete_contract: function(name: string) {
        },
        deploy: async function() {
            await test.script.add({
                type: "deploy",
                user: "deployer",
                name: this.deploy_name,
                factory: this.factory_name,
                args: this.constructor_args || []
            } as IDeployStep)
        },
        deploy_inputs: function(factory_name: string) {
            return test.factories[factory_name].createInterface().fragments.filter(f => f?.type == "constructor")[0].inputs;
        },
        call_inputs: function(contract_name: string, method_name: string) {
            return test.script.contracts[contract_name]?.interface?.functions[method_name].inputs;
        },
        call: async function() {
            console.log(this.args)
            await test.script.add({
                type: "call",
                user: this.user_name,
                contract: this.contract_name,
                method: this.method_name,
                args: this.method_args
            } as ICallStep)
        }
    },   
    setup() {
        const args = ref({})
        const factory_name = ref("")
        const factory = computed(function() {
            return test.factories[factory_name.value];
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

        const contract_name = ref("")
        const contract = computed(function() {
            return test.script.contracts[contract_name.value]
        })
        const contract_functions = computed(function() {
            return contract.value.interface.functions
        })

        const method_name = ref("")
        const method = computed(function() {
            return contract_functions.value[method_name.value]
        })
        const method_args = computed(function() {
            return method.value?.inputs.map((input, i) => (args.value as any)[contract_name.value + "|" + method_name.value + "|" + i])
        })

        const user_name = ref("")

        return {
            args,
            factory_name,
            factory,
            factory_interface,
            contract_constructor,
            constructor_args,
            deploy_name: ref(""),

            contract_name,
            contract,
            contract_functions,

            method_name,
            method,
            method_args,

            user_name
        }
    }
})
</script>
