<template>
    <div>
        <div @drop="dropHandler" @dragover="dragOverHandler" @click="onClick">
            <slot></slot>
        </div>
        <input ref="fileInput" type="file" @input="selected" style="display: none" />
    </div>
</template>

<script lang="ts">
import {defineComponent} from "vue"

export default defineComponent({
    name: "DropTarget",
    computed: {
        fileInput() {
            return this.$refs.fileInput as HTMLInputElement
        }
    },
    methods: {
        dropHandler(event: DragEvent) {
            event.preventDefault();

            if (event.dataTransfer?.items) {
                if (event.dataTransfer.items[0].kind === 'file') {
                    var file = event.dataTransfer.items[0].getAsFile();
                    if (file) {
                        this.load(file)
                    }
                }
            } else if (event.dataTransfer) {
                this.load(event.dataTransfer.files[0])
            }
        },
        dragOverHandler(event: DragEvent) {
            event.preventDefault();
        },
        onClick() {
            this.fileInput.click()
        },
        selected() {
            if (this.fileInput.files?.length) {
                this.load(this.fileInput.files[0])
            }
        },
        load(file: Blob) {
            const self = this
            var reader = new FileReader()
            reader.onload = function (event) {
                let src = event.target?.result as string
                self.$emit("fileLoaded", src)
            }
            reader.readAsDataURL(file)
        },
    }
})
</script>
