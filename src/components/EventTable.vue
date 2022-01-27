<template>
    <table class="table">
        <thead v-if="!noHeader">
            <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Value</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(input, i) in inputs" :key="input.name">
                <td>
                    {{ input.name }}
                </td>
                <td>
                    {{ input.type }}
                </td>
                <td>
                    <argument :input="input" :arg="args[i]" />
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import Argument from "./Argument.vue"

export default defineComponent({
    name: "EventTable",
    components: {
        Argument
    },
    props: {
        inputs: {required: true},
        args: {required: true},
        noHeader: {type: Boolean, default: true},
    },
    methods: {
    }
})
</script>
