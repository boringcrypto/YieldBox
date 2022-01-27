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
            <tr v-for="(arg, i) in args" :key="inputs[i].name">
                <td>
                    {{ inputs[i].name }}
                </td>
                <td>
                    {{ inputs[i].type }}
                </td>
                <td>
                    <argument :input="inputs[i]" :arg="arg" />
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import Argument from "./Argument.vue"

export default defineComponent({
    name: "ArgumentTable",
    components: {
        Argument
    },
    props: {
        inputs: {required: true},
        args: {required: true},
        noHeader: {type: Boolean, default: false},
    },
    methods: {
    }
})
</script>
