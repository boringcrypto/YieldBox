<template>
    <div>
        <label class="mt-3">Account</label>
        <b-form-select
            :model-value="modelValue"
            @update:model-value="$emit('update:modelValue', $event)"
        >
            <template v-for="(account, name) in hardhat.named_accounts" :key="account">
                <b-form-select-option :value="name">
                    {{ account.name }}
                </b-form-select-option>
            </template>
        </b-form-select>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    name: "AccountDropdown",
    props: ['modelValue'],
    emits: ['update:modelValue']
})
</script>
