<template>
    <div>
        <b-form-input type="text"
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
            :placeholder="input.name">
        </b-form-input>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    name: "ContractInput",
    props: ['modelValue', "input"],
    emits: ['update:modelValue']
})
</script>
