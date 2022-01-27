<template>
    <div v-if="contract" class="mt-3">
        <b-form-select
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
        >
            <template v-for="name in methods" :key="name">
                <b-form-select-option :value="name">
                    {{ name }}
                </b-form-select-option>
            </template>
        </b-form-select>
    </div>
</template>

<script lang="ts">
import { Contract } from "ethers"
import { computed, defineComponent, PropType } from "vue"

type MethodMutability = "pure" | "view" | "nonpayable" | "payable"

export default defineComponent({
    name: "MethodDropdown",
    props: {
        modelValue: {required: false},
        contract: { type: Contract, required: true },
        types: { type: Array as PropType<MethodMutability[]> }
    },
    emits: ['update:modelValue'],
    setup(props) {
        const methods = computed(function() {
            return Object.entries(props.contract.interface.functions)
                .filter(f => props.types?.indexOf(f[1].stateMutability as MethodMutability) != -1)
                .map(f => f[0])
        })

        return {
            methods
        }
    }
})
</script>
