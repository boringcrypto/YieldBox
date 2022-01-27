<template>
    <div>
        <b-form-select             
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
        >
            <template v-for="(contract, name) in test.script.contracts" :key="name">
                <b-form-select-option :value="name">
                    {{ name }}
                </b-form-select-option>
            </template>
        </b-form-select>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    name: "ContractDropdown",
    props: ['modelValue'],
    emits: ['update:modelValue']
})
</script>
