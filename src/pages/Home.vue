<template>
    <div class="row mx-3">
        <div class="col-7 mx-auto">
            <h2>Script</h2>
            <b-card v-for="(step, index) in test.script.steps" :key="step" class="mb-2">
                <span v-if="step.info.type == 'deploy'">
                    <div class="float-end"><b-icon style="cursor: pointer" icon="trash" @click="test.script.delete(index)"></b-icon></div>
                    <h5>
                        {{ hardhat.named_accounts[step.info.user].name }} deploys {{ step.info.factory }} as 
                        <span v-if="!test.script.contracts[step.info.name]">{{ step.info.name }}</span>
                        <address-link v-else :address="test.script.contracts[step.info.name]?.address">{{ step.info.name }}</address-link>
                    </h5>

                    <span v-if="step.info.args.length">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(arg, i) in step.info.args" :key="step.info.name + '|' + arg + '|' + i">
                                    <td>
                                        {{ deploy_inputs(step.info.factory)[i].name }}
                                    </td>
                                    <td>
                                        {{ deploy_inputs(step.info.factory)[i].type }}
                                    </td>
                                    <td>
                                        {{ arg }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </span>
                </span>

                <span v-if="step.info.type == 'call'">
                    <div class="float-end"><b-icon style="cursor: pointer" icon="trash" @click="test.script.delete(index)"></b-icon></div>
                    <h5>
                        {{ hardhat.named_accounts[step.info.user].name }} calls {{ step.info.contract }}.{{ step.info.method}}
                        <span v-if="step.info.value"> with {{ step.info.value }} wei</span>
                    </h5>

                    <span v-if="step.info.args.length && test.script.contracts[step.info.contract]">
                        <table class="table table-success">
                            <tbody>
                                <tr v-for="(arg, i) in step.info.args" :key="step.info.name + '|' + arg + '|' + i">
                                    <td>
                                        <span v-if="call_inputs">{{ call_inputs(step.info.contract, step.info.method)[i].name }}</span>
                                    </td>
                                    <td>
                                        <span v-if="call_inputs">{{ call_inputs(step.info.contract, step.info.method)[i].type }}</span>
                                    </td>
                                    <td>
                                        {{ arg }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </span>
                </span>

                <h5 v-if="step.logs.length">Events</h5>
                <div v-for="log in step.logs" :key="log">
                    <strong>{{ log.name }}</strong><br>
                    <table class="table">
                        <tbody>
                            <tr v-for="(input, i) in log.eventFragment.inputs" :key="log + '|' + i">
                                <td>
                                    {{ input.name }}
                                </td>
                                <td>
                                    {{ input.type }}
                                </td>
                                <td>
                                    <argument :input="input" :arg="log.args[i]" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
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
                                <template v-for="name in contract_sends" :key="name">
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
                            <div v-if="method && method.payable">
                                <label>Value</label>
                                <b-form-input type="text" v-model="call_value" />
                            </div>

                            <label class="mt-3">User</label>
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

                    <b-tab title="Watch">
                        <b-form-select v-model="contract_name">
                            <template v-for="(contract, name) in test.script.contracts" :key="name">
                                <b-form-select-option :value="name">
                                    {{ name }}
                                </b-form-select-option>
                            </template>
                        </b-form-select>
                        <div v-if="contract" class="mt-3">
                            <b-form-select v-model="method_name">
                                <template v-for="name in contract_calls" :key="name">
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

                            <label class="mt-3">User</label>
                            <b-form-select v-model="user_name">
                                <template v-for="(account, name) in hardhat.named_accounts" :key="account">
                                    <b-form-select-option :value="name">
                                        {{ account.name }}
                                    </b-form-select-option>
                                </template>
                            </b-form-select>
                            <b-button v-if="method_name" @click="watch" class="mt-3">Watch</b-button>
                        </div>
                    </b-tab>
                </b-tabs>
            </b-card>            
        </div>
        <div class="col-5 mx-auto">
            <h2>Watches</h2>
            <table class="table">
                <tbody>
                    <tr v-for="(watch, index) in test.script.watches" :key="watch">
                        <td>
                            {{ watch.info.contract }}.{{ watch.info.method.substring(0, watch.info.method.indexOf('(')) }}(<span v-for="(arg, i) in watch.info.args"><span v-if="i !== 0">, </span>{{ arg }}</span>)
                            <span v-if="watch.info.user != 'deployer'">
                                (<address-link :address="watch.info.user" />)
                            </span>
                        </td>
                        <td>
                            {{ watch.result.display }}
                        </td>
                        <td>
                            <b-icon style="cursor: pointer" icon="trash" @click="test.script.deleteWatch(index)" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts">
import {computed, defineComponent, ref } from "@vue/runtime-core"
import ContractInput from "../components/ContractInput.vue"
import { test } from "../classes/Test"
import AddressLink from "../components/AddressLink.vue"
import Argument from "../components/Argument.vue"

export default defineComponent({
    name: "Home",
    components: {
        ContractInput,
        AddressLink,
        Argument
    },
    methods: {
        delete_contract: function(name: string) {
        },
        deploy: async function() {
            await test.script.addDeploy({
                type: "deploy",
                user: "deployer",
                name: this.deploy_name,
                factory: this.factory_name,
                args: this.constructor_args || [],
                value: this.deploy_value
            })
        },
        deploy_inputs: function(factory_name: string) {
            return test.factories[factory_name].createInterface().fragments.filter(f => f?.type == "constructor")[0].inputs;
        },
        call_inputs: function(contract_name: string, method_name: string) {
            return test.script.contracts[contract_name]?.interface?.functions[method_name].inputs;
        },
        call: async function() {
            console.log(this.args)
            await test.script.addCall({
                type: "call",
                user: this.user_name,
                contract: this.contract_name,
                method: this.method_name,
                args: this.method_args,
                value: this.method.payable ? this.call_value : ""
            })
        },
        watch: async function() {
            await test.script.addWatch({
                user: this.user_name,
                contract: this.contract_name,
                method: this.method_name,
                args: this.method_args
            })
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
            console.log(test.script.contracts[contract_name.value])
            return test.script.contracts[contract_name.value]
        })
        const contract_functions = computed(function() {
            return contract.value.interface.functions
        })
        const contract_sends = computed(function() {
            return Object.entries(contract_functions.value).filter(f => f[1].stateMutability != 'view' && f[1].stateMutability != 'pure').map(f => f[0])
        })
        const contract_calls = computed(function() {
            return Object.entries(contract_functions.value).filter(f => f[1].stateMutability == 'view' || f[1].stateMutability == 'pure').map(f => f[0])
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
            contract_sends,
            contract_calls,

            method_name,
            method,
            method_args,

            user_name,
            deploy_value: ref("0"),
            call_value: ref("0")
        }
    }
})
</script>
