<template>
    <div class="window" style="position: absolute; top: 50%; left: 50%; margin-right: -50%; transform: translate(-50%, -50%); max-width: 400px;">
        <div class="title-bar">
            <div class="title-bar-text">Loading...</div>
        </div>
        <div class="window-body">
            <img src="../assets/McHammer.gif" />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
    name: "Loading",
})
</script>
