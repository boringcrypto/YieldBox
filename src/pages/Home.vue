<template>
    <div class="row">
        <div class="mx-auto" style="max-width: 800px">
            <h2>Script</h2>
            <b-card v-for="step in test.script.steps" :key="step">
                <span v-if="step.type == 'deploy'">
                    {{ step.user }} deploys {{ step.factory }} as {{ step.name }}
                    <span v-if="step.args.length">
                        {{ step.args }}
                    </span>
                </span>
            </b-card>

            <h2>Contracts</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Contract Source</th>
                        <th scope="col">Delete</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="contract in []" :key="contract.params.name">
                        <td>
                            <address-link :address="contract.params.address" /> 
                        </td>
                        <td>
                            {{ contract.params.factory }}
                        </td>
                        <td>
                            <b-icon icon="trash" @click="contract.delete()"></b-icon>
                        </td>
                    </tr>
                </tbody>
            </table>

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

                        User<br>
                        <b-button @click="call" class="mt-3">Call</b-button>
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
import { test, IDeployStep } from "../classes/Test"
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
                args: this.constructor_args
            } as IDeployStep)
        },
        call: async function() {

        }
    },   
    setup() {
        const args = ref({})
        const factory_name = ref("")
        const factory = computed(function() {
            return test.factories[factory_name.value as "YieldBox__factory"];
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

        const method_name = ref("")

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

            method_name
        }
    }
})
</script>
