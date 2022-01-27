<template>
    <div v-if="inputs.length && modelValue">
        <div v-for="(input, i) in inputs" :key="input">
            <label>{{ input.name || input.type }}</label>
            <contract-input v-model="modelValue[i]" :input="input"></contract-input>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import ContractInput from "./ContractInput.vue"

export default defineComponent({
    name: "ArgsEditor",
    props: ["inputs", "modelValue"],
    components: { ContractInput },
    watch: {
        "inputs": function() {
            this.$emit('update:modelValue', this.inputs.map(() => null))
        }
    },
    setup(props, context) {
        if (!props.modelValue) {
            context.emit('update:modelValue', props.inputs.map(() => null))
        }
    }
})
</script>
