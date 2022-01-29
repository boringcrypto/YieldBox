<template>
    <div class="row mx-3 pb-5">
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

                    <argument-table v-if="step.info.args.length" :inputs="deploy_inputs(step.info.factory)" :args="step.info.args" />
                </span>

                <span v-if="step.info.type == 'call'">
                    <div class="float-end"><b-icon style="cursor: pointer" icon="trash" @click="test.script.delete(index)"></b-icon></div>
                    <h5>
                        {{ hardhat.named_accounts[step.info.user].name }} calls {{ step.info.contract }}.{{ step.info.method}}
                        <span v-if="step.info.value"> with {{ step.info.value }} wei</span>
                    </h5>

                    <span v-if="step.info.args.length && test.script.contracts[step.info.contract]">
                        <argument-table class=" table-success" :inputs="call_inputs(step.info.contract, step.info.method)" :args="step.info.args" no-header />
                    </span>
                </span>

                <h5 v-if="step.logs.length">Events</h5>
                <div v-for="log in step.logs" :key="log">
                    <strong>{{ log.name }}</strong><br>
                    <event-table :inputs="log.eventFragment.inputs" :args="log.args" />
                </div>

                <h5 v-if="step.changes.length">Changes</h5>
                <table v-if="step.changes.length" class="table">
                    <tbody>
                        <tr v-for="change in step.changes" :key="change">
                            <td>
                                {{ change.watch.info.contract }}.{{ change.watch.info.method.substring(0, change.watch.info.method.indexOf('(')) }}(<span v-for="(arg, i) in change.watch.info.args"><span v-if="i !== 0">, </span>{{ arg }}</span>)
                            </td>
                            <td>
                                {{ change.old.display }}
                            </td>
                            <td>
                                {{ change.new.display }}
                            </td>
                        </tr>
                    </tbody>
                </table>
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
                            <args-editor v-if="contract_constructor" v-model="args[factory_name]" :inputs="contract_constructor.inputs" />
                            <b-button @click="deploy" class="mt-3">Deploy</b-button>
                        </div>
                    </b-tab>
                    <b-tab title="Attach">

                    </b-tab>
                    <b-tab title="Call">
                        <contract-dropdown v-model="contract_name" />
                        <div v-if="contract" class="mt-3">
                            <method-dropdown v-model="method_name" :contract="contract" :types="['payable', 'nonpayable']" />
                            <args-editor v-if="method" v-model="args[contract_name + '|' + method_name]" :inputs="method.inputs" />
                            <div v-if="method && method.payable">
                                <label>Value</label>
                                <b-form-input type="text" v-model="call_value" />
                            </div>

                            <account-dropdown v-model="user_name" />
                            <b-button v-if="method_name" @click="call" class="mt-3">Call</b-button>
                        </div>
                    </b-tab>

                    <b-tab title="Watch">
                        <contract-dropdown v-model="contract_name" />
                        <div v-if="contract" class="mt-3">
                            <method-dropdown v-model="method_name" :contract="contract" :types="['pure', 'view']" />
                            <args-editor v-if="method" v-model="args[contract_name + '|' + method_name]" :inputs="method.inputs" />
                            <account-dropdown v-model="user_name" />
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
import ArgumentTable from "../components/ArgumentTable.vue"
import EventTable from "../components/EventTable.vue"
import ContractDropdown from "../components/ContractDropdown.vue"
import AccountDropdown from "../components/AccountDropdown.vue"
import MethodDropdown from "../components/MethodDropdown.vue"
import ArgsEditor from "../components/ArgsEditor.vue"

export default defineComponent({
    name: "Home",
    components: {
        ContractInput,
        AddressLink,
        Argument,
        ArgumentTable,
        EventTable,
        ContractDropdown,
        AccountDropdown,
        MethodDropdown,
        ArgsEditor
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
                args: this.args[this.factory_name],
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
                args: this.args[this.contract_name + "|" + this.method_name],
                value: this.method.payable ? this.call_value : ""
            })
        },
        watch: async function() {
            await test.script.addWatch({
                user: this.user_name,
                contract: this.contract_name,
                method: this.method_name,
                args: this.args[this.contract_name + "|" + this.method_name]
            })
        }
    },   
    setup() {
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

        const contract_name = ref("")
        const contract = computed(function() {
            return test.script.contracts[contract_name.value]
        })

        const method_name = ref("")
        const method = computed(function() {
            return contract.value.interface.functions[method_name.value]
        })

        const user_name = ref("")

        return {
            factory_name,
            factory,
            factory_interface,
            contract_constructor,
            deploy_name: ref(""),

            contract_name,
            contract,

            method_name,
            method,

            user_name,
            deploy_value: ref("0"),
            call_value: ref("0"),

            args: ref({} as { [name: string]: any[] })
        }
    }
})
</script>
